import { expect } from 'chai';
import { MemAggregateCache, sleep } from '../dist';

interface TestValue {
  id: number;
  name: string;
}

describe('MemAggregateCache', () => {
  let cache: MemAggregateCache<number, string, TestValue>;
  let loadCallCount: number;
  let loadKeys: number[][];

  beforeEach(() => {
    loadCallCount = 0;
    loadKeys = [];

    cache = new MemAggregateCache<number, string, TestValue>(
      1000, // TTL
      value => value.id, // getKey function
      keys => {
        loadCallCount++;
        loadKeys.push([...keys]);
        return Promise.resolve(keys.map(id => ({ id, name: `item-${id}` })));
      }
    );
  });

  describe('constructor', () => {
    it('should create cache with TTL and functions', () => {
      expect(cache).to.be.instanceOf(MemAggregateCache);
      expect(cache.kv).to.be.instanceOf(Object);
      expect(cache.cmkks).to.be.instanceOf(Object);
    });
  });

  describe('get method', () => {
    it('should get single value', async () => {
      const result = await cache.get(1);

      expect(result).to.deep.equal({ id: 1, name: 'item-1' });
      expect(loadCallCount).to.equal(1);
      expect(loadKeys).to.deep.equal([[1]]);
    });

    it('should use cached value on second call', async () => {
      await cache.get(1);
      const result = await cache.get(1);

      expect(result).to.deep.equal({ id: 1, name: 'item-1' });
      expect(loadCallCount).to.equal(1); // Should not call loader again
    });

    it('should handle loader errors', async () => {
      const errorCache = new MemAggregateCache<number, string, TestValue>(
        1000,
        value => value.id,
        () => Promise.reject(new Error('Load error'))
      );

      try {
        await errorCache.get(1);
        expect.fail('Should have thrown error');
      } catch (err) {
        expect(err.message).to.equal('Load error');
      }
    });
  });

  describe('getMany method', () => {
    it('should load multiple values at once', async () => {
      const results = await cache.getMany([1, 2, 3]);

      expect(results).to.deep.equal([
        { id: 1, name: 'item-1' },
        { id: 2, name: 'item-2' },
        { id: 3, name: 'item-3' },
      ]);
      expect(loadCallCount).to.equal(1);
      expect(loadKeys).to.deep.equal([[1, 2, 3]]);
    });

    it('should use cached values when available', async () => {
      // First load some values
      await cache.get(1);
      await cache.get(2);

      // Reset counters
      loadCallCount = 0;
      loadKeys = [];

      // Load mixed cached and new values
      const results = await cache.getMany([1, 2, 3, 4]);

      expect(results).to.deep.equal([
        { id: 1, name: 'item-1' },
        { id: 2, name: 'item-2' },
        { id: 3, name: 'item-3' },
        { id: 4, name: 'item-4' },
      ]);
      expect(loadCallCount).to.equal(1);
      expect(loadKeys).to.deep.equal([[3, 4]]); // Only new keys
    });

    it('should handle duplicate keys in request', async () => {
      const results = await cache.getMany([1, 2, 1, 3, 2]);

      expect(results).to.deep.equal([
        { id: 1, name: 'item-1' },
        { id: 2, name: 'item-2' },
        { id: 1, name: 'item-1' },
        { id: 3, name: 'item-3' },
        { id: 2, name: 'item-2' },
      ]);
      expect(loadCallCount).to.equal(1);
      expect(loadKeys).to.deep.equal([[1, 2, 3]]);
    });

    it('should handle empty array', async () => {
      const results = await cache.getMany([]);

      expect(results).to.deep.equal([]);
      expect(loadCallCount).to.equal(0);
    });

    it('should handle loader errors in getMany', async () => {
      const errorCache = new MemAggregateCache<number, string, TestValue>(
        1000,
        value => value.id,
        () => Promise.reject(new Error('Load error'))
      );

      try {
        await errorCache.getMany([1, 2]);
        expect.fail('Should have thrown error');
      } catch (err) {
        expect(err.message).to.equal('Load error');
      }
    });

    it('should handle wrong loaded key error', async () => {
      const wrongKeyCache = new MemAggregateCache<number, string, TestValue>(
        1000,
        value => value.id,
        _keys => Promise.resolve([{ id: 999, name: 'wrong' }]) // Wrong key
      );

      try {
        await wrongKeyCache.getMany([1, 2]);
        expect.fail('Should have thrown error');
      } catch (err) {
        expect(err.message).to.equal('Wrong loaded key "999"');
      }
    });
  });

  describe('getManyByComplexKey method', () => {
    it('should get values by complex key', async () => {
      const complexLoader = () => Promise.resolve([1, 2, 3]);

      const results = await cache.getManyByComplexKey('complex-1', complexLoader);

      expect(results).to.deep.equal([
        { id: 1, name: 'item-1' },
        { id: 2, name: 'item-2' },
        { id: 3, name: 'item-3' },
      ]);
      expect(loadCallCount).to.equal(1);
      expect(loadKeys).to.deep.equal([[1, 2, 3]]);
    });

    it('should cache complex key results', async () => {
      const complexLoader = () => Promise.resolve([1, 2, 3]);

      // First call
      await cache.getManyByComplexKey('complex-1', complexLoader);

      // Reset counters
      loadCallCount = 0;
      loadKeys = [];

      // Second call should use cache
      const results = await cache.getManyByComplexKey('complex-1', complexLoader);

      expect(results).to.deep.equal([
        { id: 1, name: 'item-1' },
        { id: 2, name: 'item-2' },
        { id: 3, name: 'item-3' },
      ]);
      expect(loadCallCount).to.equal(0); // Should not call loader
    });

    it('should handle complex loader errors', async () => {
      const errorLoader = () => Promise.reject(new Error('Complex load error'));

      try {
        await cache.getManyByComplexKey('complex-1', errorLoader);
        expect.fail('Should have thrown error');
      } catch (err) {
        expect(err.message).to.equal('Complex load error');
      }
    });
  });

  describe('clear method', () => {
    it('should clear all caches', async () => {
      // Load some data
      await cache.get(1);
      await cache.getMany([2, 3]);
      await cache.getManyByComplexKey('complex-1', () => Promise.resolve([4, 5]));

      cache.clear();

      // Reset counters
      loadCallCount = 0;
      loadKeys = [];

      // Should reload everything
      const result = await cache.get(1);
      expect(result).to.deep.equal({ id: 1, name: 'item-1' });
      expect(loadCallCount).to.equal(1);
    });
  });

  describe('deleteExpired method', () => {
    it('should delete expired entries from both caches', async () => {
      const shortCache = new MemAggregateCache<number, string, TestValue>(
        10, // Very short TTL
        value => value.id,
        keys => Promise.resolve(keys.map(id => ({ id, name: `item-${id}` })))
      );

      await shortCache.get(1);
      await shortCache.getManyByComplexKey('complex-1', () => Promise.resolve([2, 3]));

      // Wait for expiration
      await sleep(20);

      shortCache.deleteExpired();

      // Should reload values
      const newCache = new MemAggregateCache<number, string, TestValue>(
        1000,
        value => value.id,
        keys => {
          return Promise.resolve(keys.map(id => ({ id, name: `reloaded-${id}` })));
        }
      );

      const result = await newCache.get(1);
      expect(result).to.deep.equal({ id: 1, name: 'reloaded-1' });
    });
  });

  describe('deleteExpiredIfNeed method', () => {
    it('should delete expired entries when needed', async () => {
      const shortCache = new MemAggregateCache<number, string, TestValue>(
        10, // Very short TTL
        value => value.id,
        keys => Promise.resolve(keys.map(id => ({ id, name: `item-${id}` })))
      );

      await shortCache.get(1);

      // Wait for expiration
      await sleep(20);

      // Should trigger cleanup on next operation
      const newCache = new MemAggregateCache<number, string, TestValue>(
        1000,
        value => value.id,
        keys => {
          return Promise.resolve(keys.map(id => ({ id, name: `reloaded-${id}` })));
        }
      );

      const result = await newCache.get(1);
      expect(result).to.deep.equal({ id: 1, name: 'reloaded-1' });
    });
  });

  describe('concurrent access', () => {
    it('should handle concurrent getMany calls', async () => {
      const promises = [cache.getMany([1, 2]), cache.getMany([2, 3]), cache.getMany([3, 4])];

      const results = await Promise.all(promises);

      expect(results[0]).to.deep.equal([
        { id: 1, name: 'item-1' },
        { id: 2, name: 'item-2' },
      ]);
      expect(results[1]).to.deep.equal([
        { id: 2, name: 'item-2' },
        { id: 3, name: 'item-3' },
      ]);
      expect(results[2]).to.deep.equal([
        { id: 3, name: 'item-3' },
        { id: 4, name: 'item-4' },
      ]);

      // Should have batched the loads efficiently
      expect(loadCallCount).to.be.at.most(3);
    });

    it('should handle concurrent getManyByComplexKey calls', async () => {
      const promises = [
        cache.getManyByComplexKey('complex-1', () => Promise.resolve([1, 2])),
        cache.getManyByComplexKey('complex-2', () => Promise.resolve([3, 4])),
        cache.getManyByComplexKey('complex-1', () => Promise.resolve([1, 2])), // Same key
      ];

      const results = await Promise.all(promises);

      expect(results[0]).to.deep.equal([
        { id: 1, name: 'item-1' },
        { id: 2, name: 'item-2' },
      ]);
      expect(results[1]).to.deep.equal([
        { id: 3, name: 'item-3' },
        { id: 4, name: 'item-4' },
      ]);
      expect(results[2]).to.deep.equal([
        { id: 1, name: 'item-1' },
        { id: 2, name: 'item-2' },
      ]);
    });
  });
});
