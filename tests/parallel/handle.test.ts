import { expect } from 'chai';
import { handleParallel, handleParallelVoid } from '../../dist';

describe('parallel/handle', () => {
  describe('handleParallel', () => {
    it('should handle items in parallel with concurrency limit', async () => {
      const results: number[] = [];
      const items = [1, 2, 3, 4, 5];
      const handler = (item: number) =>
        new Promise<number>(resolve => {
          setTimeout(() => {
            results.push(item);
            resolve(item * 2);
          }, 50);
        });

      const startTime = Date.now();
      const result = await handleParallel(2, items, handler);
      const endTime = Date.now();

      expect(result).to.deep.equal([2, 4, 6, 8, 10]);
      expect(results).to.have.length(5);
      expect(endTime - startTime).to.be.lessThan(300); // Should be faster than sequential
    });

    it('should handle empty items array', async () => {
      const result = await handleParallel(2, [], (item: number) => Promise.resolve(item));
      expect(result).to.deep.equal([]);
    });

    it('should handle single item', async () => {
      const result = await handleParallel(1, [42], (item: number) => Promise.resolve(item * 2));
      expect(result).to.deep.equal([84]);
    });

    it('should respect concurrency limit', async () => {
      let runningCount = 0;
      let maxConcurrency = 0;

      const items = Array.from({ length: 10 }, (_, i) => i);
      const handler = (item: number) =>
        new Promise<number>(resolve => {
          runningCount++;
          maxConcurrency = Math.max(maxConcurrency, runningCount);

          setTimeout(() => {
            runningCount--;
            resolve(item);
          }, 10);
        });

      await handleParallel(3, items, handler);

      expect(maxConcurrency).to.be.at.most(3);
    });

    it('should handle handler errors', async () => {
      const error = new Error('Handler error');
      const items = [1, 2, 3];
      const handler = (item: number) => {
        if (item === 2) {
          return Promise.reject(error);
        }
        return Promise.resolve(item);
      };

      try {
        await handleParallel(2, items, handler);
        expect.fail('Should have thrown error');
      } catch (err) {
        expect(err).to.equal(error);
      }
    });

    it('should handle mixed sync and async handlers', async () => {
      const items = [1, 2, 3, 4];
      const handler = (item: number): Promise<number> => {
        if (item % 2 === 0) {
          return Promise.resolve(item * 2); // Wrap sync in Promise
        }
        return new Promise<number>(resolve => setTimeout(() => resolve(item * 2), 10));
      };

      const result = await handleParallel(2, items, handler);
      expect(result).to.deep.equal([2, 4, 6, 8]);
    });

    it('should work with different item types', async () => {
      const items = ['a', 'b', 'c'];
      const handler = (item: string) => Promise.resolve(item.toUpperCase());

      const result = await handleParallel(2, items, handler);
      expect(result).to.deep.equal(['A', 'B', 'C']);
    });

    it('should work with objects as items', async () => {
      const items = [
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
      ];
      const handler = (item: { id: number; name: string }) =>
        Promise.resolve({ ...item, processed: true });

      const result = await handleParallel(2, items, handler);
      expect(result).to.deep.equal([
        { id: 1, name: 'a', processed: true },
        { id: 2, name: 'b', processed: true },
      ]);
    });

    it('should handle iterables (not just arrays)', async () => {
      const items = new Set([1, 2, 3, 4]);
      const handler = (item: number) => Promise.resolve(item * 2);

      const result = await handleParallel(2, items, handler);
      expect(result).to.have.length(4);
      expect(result).to.include.members([2, 4, 6, 8]);
    });
  });

  describe('handleParallelVoid', () => {
    it('should handle items in parallel with concurrency limit', async () => {
      const results: number[] = [];
      const items = [1, 2, 3, 4, 5];
      const handler = (item: number) =>
        new Promise<void>(resolve => {
          setTimeout(() => {
            results.push(item);
            resolve();
          }, 50);
        });

      const startTime = Date.now();
      await handleParallelVoid(2, items, handler);
      const endTime = Date.now();

      expect(results).to.have.length(5);
      expect(endTime - startTime).to.be.lessThan(300); // Should be faster than sequential
    });

    it('should handle empty items array', async () => {
      await handleParallelVoid(2, [], (_item: number) => Promise.resolve());
      // Should not throw
    });

    it('should handle single item', async () => {
      let executed = false;
      const handler = (_item: number) =>
        new Promise<void>(resolve => {
          executed = true;
          resolve();
        });

      await handleParallelVoid(1, [42], handler);
      void expect(executed).to.be.true;
    });

    it('should respect concurrency limit', async () => {
      let runningCount = 0;
      let maxConcurrency = 0;

      const items = Array.from({ length: 10 }, (_, i) => i);
      const handler = (_item: number) =>
        new Promise<void>(resolve => {
          runningCount++;
          maxConcurrency = Math.max(maxConcurrency, runningCount);

          setTimeout(() => {
            runningCount--;
            resolve();
          }, 10);
        });

      await handleParallelVoid(3, items, handler);

      expect(maxConcurrency).to.be.at.most(3);
    });

    it('should handle handler errors', async () => {
      const error = new Error('Handler error');
      const items = [1, 2, 3];
      const handler = (item: number) => {
        if (item === 2) {
          return Promise.reject(error);
        }
        return Promise.resolve();
      };

      try {
        await handleParallelVoid(2, items, handler);
        expect.fail('Should have thrown error');
      } catch (err) {
        expect(err).to.equal(error);
      }
    });

    it('should handle mixed sync and async handlers', async () => {
      const results: number[] = [];
      const items = [1, 2, 3, 4];
      const handler = (item: number): Promise<void> => {
        if (item % 2 === 0) {
          results.push(item); // Sync
          return Promise.resolve();
        }
        return new Promise<void>(resolve =>
          setTimeout(() => {
            results.push(item);
            resolve();
          }, 10)
        );
      };

      await handleParallelVoid(2, items, handler);
      expect(results).to.have.length(4);
    });

    it('should handle handlers that return values (ignored)', async () => {
      const results: number[] = [];
      const items = [1, 2, 3];
      const handler = (item: number) =>
        new Promise<number>(resolve => {
          setTimeout(() => {
            results.push(item);
            resolve(item * 2);
          }, 10);
        });

      await handleParallelVoid(2, items, handler);
      expect(results).to.have.length(3);
    });
  });

  describe('edge cases', () => {
    it('should handle concurrency of 0', async () => {
      const items = [1, 2, 3];
      const handler = (item: number) => Promise.resolve(item * 2);

      const result = await handleParallel(0, items, handler);
      expect(result).to.deep.equal([2, 4, 6]);
    });

    it('should handle concurrency greater than items count', async () => {
      const items = [1, 2];
      const handler = (item: number) => Promise.resolve(item * 2);

      const result = await handleParallel(10, items, handler);
      expect(result).to.deep.equal([2, 4]);
    });

    it('should handle very large concurrency', async () => {
      const items = Array.from({ length: 100 }, (_, i) => i);
      const handler = (item: number) => Promise.resolve(item);

      const result = await handleParallel(1000, items, handler);
      expect(result).to.have.length(100);
    });

    it('should handle handlers that throw synchronously', async () => {
      const error = new Error('Sync error');
      const items = [1, 2, 3];
      const handler = (item: number) => {
        if (item === 2) {
          throw error;
        }
        return Promise.resolve(item);
      };

      try {
        await handleParallel(2, items, handler);
        expect.fail('Should have thrown error');
      } catch (err) {
        expect(err).to.equal(error);
      }
    });

    it('should handle handlers that return rejected promises', async () => {
      const error = new Error('Promise error');
      const items = [1, 2, 3];
      const handler = (item: number) => {
        if (item === 2) {
          return Promise.reject(error);
        }
        return Promise.resolve(item);
      };

      try {
        await handleParallel(2, items, handler);
        expect.fail('Should have thrown error');
      } catch (err) {
        expect(err).to.equal(error);
      }
    });

    it('should handle undefined handler', async () => {
      const items = [1, 2, 3];

      try {
        await handleParallel(2, items, undefined as unknown as (item: number) => Promise<number>);
        expect.fail('Should have thrown error');
      } catch (err) {
        expect(err).to.be.instanceOf(Error);
        expect(err.message).to.equal('Handler is required');
      }
    });
  });

  describe('performance characteristics', () => {
    it('should be faster than sequential execution', async () => {
      const delay = 50;
      const items = [1, 2, 3, 4];
      const handler = (item: number) =>
        new Promise<number>(resolve => setTimeout(() => resolve(item), delay));

      const startTime = Date.now();
      await handleParallel(2, items, handler);
      const endTime = Date.now();

      // Should be roughly 2 * delay (2 batches of 2) instead of 4 * delay
      expect(endTime - startTime).to.be.lessThan(delay * 3);
    });

    it('should handle many items efficiently', async () => {
      const items = Array.from({ length: 1000 }, (_, i) => i);
      const handler = (item: number) => Promise.resolve(item);

      const startTime = Date.now();
      const result = await handleParallel(10, items, handler);
      const endTime = Date.now();

      expect(result).to.have.length(1000);
      expect(endTime - startTime).to.be.lessThan(1000); // Should be fast
    });
  });
});
