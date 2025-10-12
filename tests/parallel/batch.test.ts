import { expect } from 'chai';
import { batchParallel, batchParallelVoid } from '../../dist';

describe('parallel/batch', () => {
  describe('batchParallel', () => {
    it('should process items in batches with concurrency limit', async () => {
      const results: number[] = [];
      const items = [1, 2, 3, 4, 5, 6, 7, 8];
      const batcher = (batch: number[]) =>
        new Promise<number[]>(resolve => {
          setTimeout(() => {
            results.push(...batch);
            resolve(batch.map(x => x * 2));
          }, 50);
        });

      const startTime = Date.now();
      const result = await batchParallel(2, 3, items, batcher);
      const endTime = Date.now();

      expect(result).to.deep.equal([2, 4, 6, 8, 10, 12, 14, 16]);
      expect(results).to.have.length(8);
      expect(endTime - startTime).to.be.lessThan(200); // Should be faster than sequential
    });

    it('should handle empty items array', async () => {
      const result = await batchParallel(2, 3, [], (batch: number[]) => Promise.resolve(batch));
      expect(result).to.deep.equal([]);
    });

    it('should handle single item', async () => {
      const result = await batchParallel(1, 1, [42], (batch: number[]) =>
        Promise.resolve(batch.map(x => x * 2))
      );
      expect(result).to.deep.equal([84]);
    });

    it('should handle items that do not fill complete batches', async () => {
      const items = [1, 2, 3, 4, 5]; // 5 items with batch size 3
      const result = await batchParallel(2, 3, items, (batch: number[]) =>
        Promise.resolve(batch.map(x => x * 2))
      );

      expect(result).to.deep.equal([2, 4, 6, 8, 10]);
    });

    it('should respect concurrency limit', async () => {
      let runningBatches = 0;
      let maxConcurrency = 0;

      const items = Array.from({ length: 20 }, (_, i) => i);
      const batcher = (batch: number[]) =>
        new Promise<number[]>(resolve => {
          runningBatches++;
          maxConcurrency = Math.max(maxConcurrency, runningBatches);

          setTimeout(() => {
            runningBatches--;
            resolve(batch);
          }, 10);
        });

      await batchParallel(3, 5, items, batcher);

      expect(maxConcurrency).to.be.at.most(3);
    });

    it('should handle batcher errors', async () => {
      const error = new Error('Batcher error');
      const items = [1, 2, 3, 4];
      const batcher = (batch: number[]) => {
        if (batch.includes(2)) {
          return Promise.reject(error);
        }
        return Promise.resolve(batch);
      };

      try {
        await batchParallel(2, 2, items, batcher);
        expect.fail('Should have thrown error');
      } catch (err) {
        expect(err).to.equal(error);
      }
    });

    it('should handle mixed sync and async batchers', async () => {
      const items = [1, 2, 3, 4];
      const batcher = (batch: number[]): Promise<number[]> => {
        if (batch.length === 1) {
          return Promise.resolve(batch.map(x => x * 2)); // Wrap sync in Promise
        }
        return new Promise<number[]>(resolve =>
          setTimeout(() => resolve(batch.map(x => x * 2)), 10)
        );
      };

      const result = await batchParallel(2, 2, items, batcher);
      expect(result).to.deep.equal([2, 4, 6, 8]);
    });

    it('should work with different item types', async () => {
      const items = ['a', 'b', 'c', 'd'];
      const batcher = (batch: string[]) => Promise.resolve(batch.map(s => s.toUpperCase()));

      const result = await batchParallel(2, 2, items, batcher);
      expect(result).to.deep.equal(['A', 'B', 'C', 'D']);
    });

    it('should work with objects as items', async () => {
      const items = [
        { id: 1, name: 'a' },
        { id: 2, name: 'b' },
        { id: 3, name: 'c' },
        { id: 4, name: 'd' },
      ];
      const batcher = (batch: { id: number; name: string }[]) =>
        Promise.resolve(batch.map(item => ({ ...item, processed: true })));

      const result = await batchParallel(2, 2, items, batcher);
      expect(result).to.deep.equal([
        { id: 1, name: 'a', processed: true },
        { id: 2, name: 'b', processed: true },
        { id: 3, name: 'c', processed: true },
        { id: 4, name: 'd', processed: true },
      ]);
    });

    it('should handle iterables (not just arrays)', async () => {
      const items = new Set([1, 2, 3, 4, 5, 6]);
      const batcher = (batch: number[]) => Promise.resolve(batch.map(x => x * 2));

      const result = await batchParallel(2, 3, items, batcher);
      expect(result).to.have.length(6);
      expect(result).to.include.members([2, 4, 6, 8, 10, 12]);
    });

    it('should handle undefined batcher', async () => {
      const items = [1, 2, 3];

      try {
        await batchParallel(
          2,
          2,
          items,
          undefined as unknown as (items: number[]) => Promise<number[]>
        );
        expect.fail('Should have thrown error');
      } catch (err) {
        expect(err).to.be.instanceOf(Error);
        expect(err.message).to.equal('Handler is required');
      }
    });
  });

  describe('batchParallelVoid', () => {
    it('should process items in batches with concurrency limit', async () => {
      const results: number[] = [];
      const items = [1, 2, 3, 4, 5, 6, 7, 8];
      const batcher = (batch: number[]) =>
        new Promise<void>(resolve => {
          setTimeout(() => {
            results.push(...batch);
            resolve();
          }, 50);
        });

      const startTime = Date.now();
      await batchParallelVoid(2, 3, items, batcher);
      const endTime = Date.now();

      expect(results).to.have.length(8);
      expect(endTime - startTime).to.be.lessThan(200); // Should be faster than sequential
    });

    it('should handle empty items array', async () => {
      await batchParallelVoid(2, 3, [], (_batch: number[]) => Promise.resolve());
      // Should not throw
    });

    it('should handle single item', async () => {
      let executed = false;
      const batcher = (_batch: number[]) =>
        new Promise<void>(resolve => {
          executed = true;
          resolve();
        });

      await batchParallelVoid(1, 1, [42], batcher);
      void expect(executed).to.be.true;
    });

    it('should handle items that do not fill complete batches', async () => {
      const results: number[] = [];
      const items = [1, 2, 3, 4, 5]; // 5 items with batch size 3
      const batcher = (batch: number[]) =>
        new Promise<void>(resolve => {
          results.push(...batch);
          resolve();
        });

      await batchParallelVoid(2, 3, items, batcher);
      expect(results).to.have.length(5);
    });

    it('should respect concurrency limit', async () => {
      let runningBatches = 0;
      let maxConcurrency = 0;

      const items = Array.from({ length: 20 }, (_, i) => i);
      const batcher = (_batch: number[]) =>
        new Promise<void>(resolve => {
          runningBatches++;
          maxConcurrency = Math.max(maxConcurrency, runningBatches);

          setTimeout(() => {
            runningBatches--;
            resolve();
          }, 10);
        });

      await batchParallelVoid(3, 5, items, batcher);

      expect(maxConcurrency).to.be.at.most(3);
    });

    it('should handle batcher errors', async () => {
      const error = new Error('Batcher error');
      const items = [1, 2, 3, 4];
      const batcher = (batch: number[]) => {
        if (batch.includes(2)) {
          return Promise.reject(error);
        }
        return Promise.resolve();
      };

      try {
        await batchParallelVoid(2, 2, items, batcher);
        expect.fail('Should have thrown error');
      } catch (err) {
        expect(err).to.equal(error);
      }
    });

    it('should handle mixed sync and async batchers', async () => {
      const results: number[] = [];
      const items = [1, 2, 3, 4];
      const batcher = (batch: number[]) => {
        if (batch.length === 1) {
          results.push(...batch); // Sync
          return;
        }
        return new Promise<void>(resolve =>
          setTimeout(() => {
            results.push(...batch);
            resolve();
          }, 10)
        );
      };

      await batchParallelVoid(2, 2, items, batcher);
      expect(results).to.have.length(4);
    });

    it('should handle batchers that return values (ignored)', async () => {
      const results: number[] = [];
      const items = [1, 2, 3, 4];
      const batcher = (batch: number[]) =>
        new Promise<number[]>(resolve => {
          setTimeout(() => {
            results.push(...batch);
            resolve(batch.map(x => x * 2));
          }, 10);
        });

      await batchParallelVoid(2, 2, items, batcher);
      expect(results).to.have.length(4);
    });
  });

  describe('edge cases', () => {
    it('should handle concurrency of 0', async () => {
      const items = [1, 2, 3, 4];
      const batcher = (batch: number[]) => Promise.resolve(batch);

      const result = await batchParallel(0, 2, items, batcher);
      expect(result).to.deep.equal([1, 2, 3, 4]);
    });

    it('should handle batch size of 0', async () => {
      const items = [1, 2, 3];

      try {
        await batchParallel(2, 0, items, (batch: number[]) => Promise.resolve(batch));
        expect.fail('Should have thrown error');
      } catch (err) {
        expect(err).to.be.instanceOf(Error);
      }
    });

    it('should handle batch size greater than items count', async () => {
      const items = [1, 2];
      const batcher = (batch: number[]) => Promise.resolve(batch);

      const result = await batchParallel(2, 10, items, batcher);
      expect(result).to.deep.equal([1, 2]);
    });

    it('should handle concurrency greater than batch count', async () => {
      const items = [1, 2, 3, 4];
      const batcher = (batch: number[]) => Promise.resolve(batch);

      const result = await batchParallel(10, 2, items, batcher);
      expect(result).to.deep.equal([1, 2, 3, 4]);
    });

    it('should handle very large batch size', async () => {
      const items = Array.from({ length: 100 }, (_, i) => i);
      const batcher = (batch: number[]) => Promise.resolve(batch);

      const result = await batchParallel(2, 1000, items, batcher);
      expect(result).to.have.length(100);
    });

    it('should handle batchers that throw synchronously', async () => {
      const error = new Error('Sync error');
      const items = [1, 2, 3, 4];
      const batcher = (batch: number[]) => {
        if (batch.includes(2)) {
          throw error;
        }
        return Promise.resolve(batch);
      };

      try {
        await batchParallel(2, 2, items, batcher);
        expect.fail('Should have thrown error');
      } catch (err) {
        expect(err).to.equal(error);
      }
    });

    it('should handle batchers that return rejected promises', async () => {
      const error = new Error('Promise error');
      const items = [1, 2, 3, 4];
      const batcher = (batch: number[]) => {
        if (batch.includes(2)) {
          return Promise.reject(error);
        }
        return Promise.resolve(batch);
      };

      try {
        await batchParallel(2, 2, items, batcher);
        expect.fail('Should have thrown error');
      } catch (err) {
        expect(err).to.equal(error);
      }
    });
  });

  describe('performance characteristics', () => {
    it('should be faster than sequential execution', async () => {
      const delay = 50;
      const items = Array.from({ length: 8 }, (_, i) => i);
      const batcher = (batch: number[]) =>
        new Promise<number[]>(resolve => setTimeout(() => resolve(batch), delay));

      const startTime = Date.now();
      await batchParallel(2, 4, items, batcher);
      const endTime = Date.now();

      // Should be roughly 2 * delay (2 batches of 4) instead of 2 * delay
      expect(endTime - startTime).to.be.lessThan(delay * 3);
    });

    it('should handle many items efficiently', async () => {
      const items = Array.from({ length: 1000 }, (_, i) => i);
      const batcher = (batch: number[]) => Promise.resolve(batch);

      const startTime = Date.now();
      const result = await batchParallel(10, 50, items, batcher);
      const endTime = Date.now();

      expect(result).to.have.length(1000);
      expect(endTime - startTime).to.be.lessThan(1000); // Should be fast
    });
  });
});
