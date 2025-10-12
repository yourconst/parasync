import { ControlPromise } from './ControlPromise';
import { MemCacheKey, MemCache } from './MemCache';

export type ComplexManyCacheKey = string;

export class MemAggregateCache<K extends MemCacheKey, CMK extends ComplexManyCacheKey, V> {
  public readonly kv: MemCache<K, V> = new MemCache(this.ttl, key =>
    this.load([key]).then(([value]) => value)
  );
  public readonly cmkks: MemCache<CMK, K[]> = new MemCache(this.ttl);

  constructor(
    private readonly ttl: number,
    private readonly getKey: (value: V) => K,
    private readonly load: (keys: K[]) => Promise<V[]>
  ) {}

  public clear() {
    this.kv.clear();
    this.cmkks.clear();
  }

  public deleteExpired(): void {
    this.kv.deleteExpired();
    this.cmkks.deleteExpired();
  }

  public deleteExpiredIfNeed(): void {
    this.kv.deleteExpiredIfNeed();
    this.cmkks.deleteExpiredIfNeed();
  }

  public get(key: K): Promise<V> {
    return this.kv.get(key);
  }

  public async getMany(keys: K[]): Promise<V[]> {
    keys = [...keys];

    // NOTE: must be local stored for protect expired clean up possibility
    const map = new Map<K, Promise<V> | ControlPromise<V>>();

    const keysToLoad: K[] = [];

    for (const key of keys) {
      const storedValue = this.kv.get(key, () => {
        keysToLoad.push(key);
        return new ControlPromise();
      });

      map.set(key, storedValue);
    }

    if (keysToLoad.length) {
      try {
        const loadedValues = await this.load([...keysToLoad]);

        for (const value of loadedValues) {
          const key = this.getKey(value);

          const storedValue = map.get(key) as ControlPromise<V>;

          if (!storedValue) {
            throw new Error(`Wrong loaded key "${key}"`);
          }

          storedValue.resolve(value);
        }
      } catch (error) {
        for (const key of keysToLoad) {
          (map.get(key) as ControlPromise<V>).reject(error);
        }

        throw error;
      }
    }

    return Promise.all(keys.map(key => map.get(key)!));
  }

  public async getManyByComplexKey(complexKey: CMK, loader: () => Promise<K[]>): Promise<V[]> {
    const keys = await this.cmkks.get(complexKey, () => loader());

    return this.getMany(keys);
  }
}
