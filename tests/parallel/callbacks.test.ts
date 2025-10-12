import { expect } from 'chai';
import { runParallel, runParallelVoid } from '../../src';

describe('parallel/callbacks', () => {
  describe('runParallel', () => {
    it('should run callbacks in parallel with concurrency limit', async () => {
      const results: number[] = [];
      const callbacks = [
        () =>
          new Promise<number>(resolve =>
            setTimeout(() => {
              results.push(1);
              resolve(1);
            }, 100)
          ),
        () =>
          new Promise<number>(resolve =>
            setTimeout(() => {
              results.push(2);
              resolve(2);
            }, 50)
          ),
        () =>
          new Promise<number>(resolve =>
            setTimeout(() => {
              results.push(3);
              resolve(3);
            }, 30)
          ),
        () =>
          new Promise<number>(resolve =>
            setTimeout(() => {
              results.push(4);
              resolve(4);
            }, 20)
          ),
      ];

      const startTime = Date.now();
      const result = await runParallel(2, callbacks);
      const endTime = Date.now();

      expect(result).to.deep.equal([1, 2, 3, 4]);
      expect(results).to.have.length(4);
      expect(endTime - startTime).to.be.lessThan(200); // Should be faster than sequential
    });

    it('should handle empty callbacks array', async () => {
      const result = await runParallel(2, []);
      expect(result).to.deep.equal([]);
    });

    it('should handle single callback', async () => {
      const callback = () => Promise.resolve(42);
      const result = await runParallel(1, [callback]);
      expect(result).to.deep.equal([42]);
    });

    it('should respect concurrency limit', async () => {
      let runningCount = 0;
      let maxConcurrency = 0;

      const callbacks = Array.from(
        { length: 10 },
        (_, i) => () =>
          new Promise<number>(resolve => {
            runningCount++;
            maxConcurrency = Math.max(maxConcurrency, runningCount);

            setTimeout(() => {
              runningCount--;
              resolve(i);
            }, 10);
          })
      );

      await runParallel(3, callbacks);

      expect(maxConcurrency).to.be.at.most(3);
    });

    it('should handle callback errors', async () => {
      const error = new Error('Callback error');
      const callbacks = [
        () => Promise.resolve(1),
        () => Promise.reject(error),
        () => Promise.resolve(3),
      ];

      try {
        await runParallel(2, callbacks);
        expect.fail('Should have thrown error');
      } catch (err) {
        expect(err).to.equal(error);
      }
    });

    it('should handle mixed sync and async callbacks', async () => {
      const callbacks = [
        () => Promise.resolve(1),
        () => Promise.resolve(2), // Wrap sync in Promise
        () => new Promise<number>(resolve => setTimeout(() => resolve(3), 10)),
        () => Promise.resolve(4), // Wrap sync in Promise
      ];

      const result = await runParallel(2, callbacks);
      expect(result).to.deep.equal([1, 2, 3, 4]);
    });

    it('should work with different return types', async () => {
      const callbacks: (() => Promise<unknown>)[] = [
        () => Promise.resolve('string'),
        () => Promise.resolve(42),
        () => Promise.resolve({ value: 'object' }),
        () => Promise.resolve(true),
      ];

      const result = await runParallel(2, callbacks);
      expect(result).to.deep.equal(['string', 42, { value: 'object' }, true]);
    });
  });

  describe('runParallelVoid', () => {
    it('should run callbacks in parallel with concurrency limit', async () => {
      const results: number[] = [];
      const callbacks = [
        () =>
          new Promise<void>(resolve =>
            setTimeout(() => {
              results.push(1);
              resolve();
            }, 100)
          ),
        () =>
          new Promise<void>(resolve =>
            setTimeout(() => {
              results.push(2);
              resolve();
            }, 50)
          ),
        () =>
          new Promise<void>(resolve =>
            setTimeout(() => {
              results.push(3);
              resolve();
            }, 30)
          ),
        () =>
          new Promise<void>(resolve =>
            setTimeout(() => {
              results.push(4);
              resolve();
            }, 20)
          ),
      ];

      const startTime = Date.now();
      await runParallelVoid(2, callbacks);
      const endTime = Date.now();

      expect(results).to.have.length(4);
      expect(endTime - startTime).to.be.lessThan(200); // Should be faster than sequential
    });

    it('should handle empty callbacks array', async () => {
      await runParallelVoid(2, []);
      // Should not throw
    });

    it('should handle single callback', async () => {
      let executed = false;
      const callback = () =>
        new Promise<void>(resolve => {
          executed = true;
          resolve();
        });

      await runParallelVoid(1, [callback]);
      void expect(executed).to.be.true;
    });

    it('should respect concurrency limit', async () => {
      let runningCount = 0;
      let maxConcurrency = 0;

      const callbacks = Array.from(
        { length: 10 },
        () => () =>
          new Promise<void>(resolve => {
            runningCount++;
            maxConcurrency = Math.max(maxConcurrency, runningCount);

            setTimeout(() => {
              runningCount--;
              resolve();
            }, 10);
          })
      );

      await runParallelVoid(3, callbacks);

      expect(maxConcurrency).to.be.at.most(3);
    });

    it('should handle callback errors', async () => {
      const error = new Error('Callback error');
      const callbacks = [
        () => Promise.resolve(),
        () => Promise.reject(error),
        () => Promise.resolve(),
      ];

      try {
        await runParallelVoid(2, callbacks);
        expect.fail('Should have thrown error');
      } catch (err) {
        expect(err).to.equal(error);
      }
    });

    it('should handle mixed sync and async callbacks', async () => {
      const results: number[] = [];
      const callbacks = [
        () =>
          Promise.resolve().then(() => {
            results.push(1);
          }),
        () =>
          new Promise<void>(resolve =>
            setTimeout(() => {
              results.push(2);
              resolve();
            }, 10)
          ),
        () =>
          Promise.resolve().then(() => {
            results.push(3);
          }),
        () =>
          new Promise<void>(resolve =>
            setTimeout(() => {
              results.push(4);
              resolve();
            }, 5)
          ),
      ];

      await runParallelVoid(2, callbacks);
      expect(results).to.have.length(4);
    });

    it('should handle callbacks that return values (ignored)', async () => {
      const results: number[] = [];
      const callbacks = [
        () =>
          new Promise<number>(resolve =>
            setTimeout(() => {
              results.push(1);
              resolve(1);
            }, 10)
          ),
        () =>
          new Promise<string>(resolve =>
            setTimeout(() => {
              results.push(2);
              resolve('test');
            }, 5)
          ),
        () =>
          new Promise<boolean>(resolve =>
            setTimeout(() => {
              results.push(3);
              resolve(true);
            }, 15)
          ),
      ];

      await runParallelVoid(2, callbacks);
      expect(results).to.have.length(3);
    });
  });

  describe('edge cases', () => {
    it('should handle concurrency of 0', async () => {
      const callbacks = [() => Promise.resolve(1), () => Promise.resolve(2)];

      const result = await runParallel(0, callbacks);
      expect(result).to.deep.equal([1, 2]);
    });

    it('should handle concurrency greater than callbacks count', async () => {
      const callbacks = [() => Promise.resolve(1), () => Promise.resolve(2)];

      const result = await runParallel(10, callbacks);
      expect(result).to.deep.equal([1, 2]);
    });

    it('should handle very large concurrency', async () => {
      const callbacks = Array.from({ length: 100 }, (_, i) => () => Promise.resolve(i));

      const result = await runParallel(1000, callbacks);
      expect(result).to.have.length(100);
      expect(result[0]).to.equal(0);
      expect(result[99]).to.equal(99);
    });

    it('should handle callbacks that throw synchronously', async () => {
      const error = new Error('Sync error');
      const callbacks = [
        () => Promise.resolve(1),
        () => {
          throw error;
        },
        () => Promise.resolve(3),
      ];

      try {
        await runParallel(2, callbacks);
        expect.fail('Should have thrown error');
      } catch (err) {
        expect(err).to.equal(error);
      }
    });

    it('should handle callbacks that return rejected promises', async () => {
      const error = new Error('Promise error');
      const callbacks = [
        () => Promise.resolve(1),
        () => Promise.reject(error),
        () => Promise.resolve(3),
      ];

      try {
        await runParallel(2, callbacks);
        expect.fail('Should have thrown error');
      } catch (err) {
        expect(err).to.equal(error);
      }
    });
  });

  describe('performance characteristics', () => {
    it('should be faster than sequential execution', async () => {
      const delay = 50;
      const callbacks = Array.from(
        { length: 4 },
        () => () => new Promise<number>(resolve => setTimeout(() => resolve(1), delay))
      );

      const startTime = Date.now();
      await runParallel(2, callbacks);
      const endTime = Date.now();

      // Should be roughly 2 * delay (2 batches of 2) instead of 4 * delay
      expect(endTime - startTime).to.be.lessThan(delay * 3);
    });

    it('should handle many callbacks efficiently', async () => {
      const callbacks = Array.from({ length: 1000 }, (_, i) => () => Promise.resolve(i));

      const startTime = Date.now();
      const result = await runParallel(10, callbacks);
      const endTime = Date.now();

      expect(result).to.have.length(1000);
      expect(endTime - startTime).to.be.lessThan(1000); // Should be fast
    });
  });
});
