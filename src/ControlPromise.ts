type Resolver<T> = (result: T | PromiseLike<T>) => void;
type Rejector = (err?: unknown) => void;

export class ControlPromise<T = void> extends Promise<T> {
  private _resolve!: Resolver<T>;
  private _reject!: Rejector;

  private _resolved = false;
  private _rejected = false;

  constructor(executor?: (resolve: Resolver<T>, reject: Rejector) => void) {
    let _resolve: Resolver<T>;
    let _reject: Rejector;

    super((resolve, reject) => {
      _resolve = resolve;
      _reject = reject;
    });

    this._resolve = _resolve!;
    this._reject = _reject!;

    executor?.(this.resolve, this.reject);
  }

  get fulfilled(): boolean {
    return this._resolved;
  }

  get rejected(): boolean {
    return this._rejected;
  }

  get pending(): boolean {
    return !this._resolved && !this._rejected;
  }

  readonly resolve: Resolver<T> = result => {
    if (!this.pending) {
      return;
    }

    this._resolved = true;

    this._resolve(result);
  };

  readonly reject: Rejector = err => {
    if (!this.pending) {
      return;
    }

    this._rejected = true;

    this._reject(err);
  };
}
