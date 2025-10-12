export type MemCacheKey = number | string | bigint;

class MemCacheEntry<V> {
  public readonly expiresAt: number;

  constructor(
    ttl: number,
    public readonly value: Promise<V>
  ) {
    this.expiresAt = Date.now() + ttl;
  }

  public isValid(): boolean {
    return this.expiresAt > Date.now();
  }
}

type Loader<K extends MemCacheKey, V> = (key: K) => Promise<V>;

export class MemCache<K extends MemCacheKey, V> {
  private readonly kv = new Map<K, MemCacheEntry<V>>();
  private expiredDeleteAt = Date.now();

  constructor(
    private readonly ttl: number,
    private readonly load?: Loader<K, V>
  ) {}

  public clear(): void {
    this.kv.clear();
  }

  public delete(key: K): boolean {
    return this.kv.delete(key);
  }

  public deleteExpired(): void {
    for (const [key, stored] of this.kv.entries()) {
      if (!stored.isValid()) {
        this.kv.delete(key);
      }
    }
  }

  public deleteExpiredIfNeed(): void {
    if (this.expiredDeleteAt > Date.now()) {
      return;
    }

    this.deleteExpired();

    this.expiredDeleteAt = Date.now() + this.ttl;
  }

  public get(key: K, loader: Loader<K, V> = this.load): Promise<V> {
    this.deleteExpiredIfNeed();

    if (!loader) {
      throw new Error('Loader is required but not provided');
    }

    let stored = this.kv.get(key);

    if (!stored?.isValid()) {
      stored = new MemCacheEntry(this.ttl, loader(key));
      this.kv.set(key, stored);
    }

    return stored.value;
  }
}
