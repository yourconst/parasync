import { expect } from 'chai';
import { MemCache, sleep } from '../src';

describe('MemCache', () => {
  describe('constructor', () => {
    it('should create cache with TTL', () => {
      const cache = new MemCache<string, string>(1000);
      expect(cache).to.be.instanceOf(MemCache);
    });

    it('should create cache with TTL and loader', () => {
      const loader = (key: string) => Promise.resolve(`loaded-${key}`);
      const cache = new MemCache<string, string>(1000, loader);
      expect(cache).to.be.instanceOf(MemCache);
    });
  });

  describe('get method', () => {
    it('should return cached value if valid', async () => {
      const cache = new MemCache<string, string>(1000);
      const loader = (key: string) => Promise.resolve(`loaded-${key}`);

      const result1 = await cache.get('test', loader);
      const result2 = await cache.get('test', loader);

      expect(result1).to.equal('loaded-test');
      expect(result2).to.equal('loaded-test');
    });

    it('should use default loader if provided', async () => {
      const defaultLoader = (key: string) => Promise.resolve(`default-${key}`);
      const cache = new MemCache<string, string>(1000, defaultLoader);

      const result = await cache.get('test');
      expect(result).to.equal('default-test');
    });

    it('should reload value if expired', async () => {
      const cache = new MemCache<string, string>(10); // Very short TTL
      let callCount = 0;
      const loader = (key: string) => {
        callCount++;
        return Promise.resolve(`loaded-${key}-${callCount}`);
      };

      const result1 = await cache.get('test', loader);
      expect(result1).to.equal('loaded-test-1');
      expect(callCount).to.equal(1);

      // Wait for expiration
      await sleep(20);

      const result2 = await cache.get('test', loader);
      expect(result2).to.equal('loaded-test-2');
      expect(callCount).to.equal(2);
    });

    it('should handle loader errors', async () => {
      const cache = new MemCache<string, string>(1000);
      const error = new Error('Loader error');
      const loader = () => Promise.reject(error);

      try {
        await cache.get('test', loader);
        expect.fail('Should have thrown error');
      } catch (err) {
        expect(err).to.equal(error);
      }
    });
  });

  describe('clear method', () => {
    it('should clear all cached values', async () => {
      const cache = new MemCache<string, string>(1000);
      const loader = (key: string) => Promise.resolve(`loaded-${key}`);

      await cache.get('test1', loader);
      await cache.get('test2', loader);

      cache.clear();

      // Should reload values after clear
      let callCount = 0;
      const newLoader = (key: string) => {
        callCount++;
        return Promise.resolve(`reloaded-${key}`);
      };

      const result = await cache.get('test1', newLoader);
      expect(result).to.equal('reloaded-test1');
      expect(callCount).to.equal(1);
    });
  });

  describe('delete method', () => {
    it('should delete specific key', async () => {
      const cache = new MemCache<string, string>(1000);
      const loader = (key: string) => Promise.resolve(`loaded-${key}`);

      await cache.get('test1', loader);
      await cache.get('test2', loader);

      const deleted = cache.delete('test1');
      expect(deleted).to.be.true;

      // Should reload deleted key
      let callCount = 0;
      const newLoader = (key: string) => {
        callCount++;
        return Promise.resolve(`reloaded-${key}`);
      };

      const result = await cache.get('test1', newLoader);
      expect(result).to.equal('reloaded-test1');
      expect(callCount).to.equal(1);
    });

    it('should return false for non-existent key', () => {
      const cache = new MemCache<string, string>(1000);
      const deleted = cache.delete('non-existent');
      expect(deleted).to.be.false;
    });
  });

  describe('deleteExpired method', () => {
    it('should delete expired entries', async () => {
      const cache = new MemCache<string, string>(10); // Very short TTL
      const loader = (key: string) => Promise.resolve(`loaded-${key}`);

      await cache.get('test1', loader);
      await cache.get('test2', loader);

      // Wait for expiration
      await sleep(20);

      cache.deleteExpired();

      // Should reload values after deletion
      let callCount = 0;
      const newLoader = (key: string) => {
        callCount++;
        return Promise.resolve(`reloaded-${key}`);
      };

      const result = await cache.get('test1', newLoader);
      expect(result).to.equal('reloaded-test1');
      expect(callCount).to.equal(1);
    });

    it('should not delete valid entries', async () => {
      const cache = new MemCache<string, string>(1000);
      const loader = (key: string) => Promise.resolve(`loaded-${key}`);

      await cache.get('test1', loader);
      await cache.get('test2', loader);

      cache.deleteExpired();

      // Should not reload valid entries
      let callCount = 0;
      const newLoader = (key: string) => {
        callCount++;
        return Promise.resolve(`reloaded-${key}`);
      };

      const result = await cache.get('test1', newLoader);
      expect(result).to.equal('loaded-test1');
      expect(callCount).to.equal(0);
    });
  });

  describe('deleteExpiredIfNeed method', () => {
    it('should delete expired entries when needed', async () => {
      const cache = new MemCache<string, string>(10); // Very short TTL
      const loader = (key: string) => Promise.resolve(`loaded-${key}`);

      await cache.get('test1', loader);

      // Wait for expiration
      await sleep(20);

      // Should trigger cleanup on next get
      let callCount = 0;
      const newLoader = (key: string) => {
        callCount++;
        return Promise.resolve(`reloaded-${key}`);
      };

      const result = await cache.get('test1', newLoader);
      expect(result).to.equal('reloaded-test1');
      expect(callCount).to.equal(1);
    });

    it('should not delete valid entries', async () => {
      const cache = new MemCache<string, string>(1000);
      const loader = (key: string) => Promise.resolve(`loaded-${key}`);

      await cache.get('test1', loader);

      cache.deleteExpiredIfNeed();

      // Should not reload valid entries
      let callCount = 0;
      const newLoader = (key: string) => {
        callCount++;
        return Promise.resolve(`reloaded-${key}`);
      };

      const result = await cache.get('test1', newLoader);
      expect(result).to.equal('loaded-test1');
      expect(callCount).to.equal(0);
    });
  });

  describe('concurrent access', () => {
    it('should handle concurrent gets for same key', async () => {
      const cache = new MemCache<string, string>(1000);
      let callCount = 0;
      const loader = (key: string): Promise<string> => {
        callCount++;
        return new Promise(resolve => {
          setTimeout(() => resolve(`loaded-${key}`), 10);
        });
      };

      const promises = [
        cache.get('test', loader),
        cache.get('test', loader),
        cache.get('test', loader),
      ];

      const results = await Promise.all(promises);

      expect(results).to.deep.equal(['loaded-test', 'loaded-test', 'loaded-test']);
      expect(callCount).to.equal(1); // Should only call loader once
    });

    it('should handle concurrent gets for different keys', async () => {
      const cache = new MemCache<string, string>(1000);
      const loader = (key: string) => Promise.resolve(`loaded-${key}`);

      const promises = [
        cache.get('test1', loader),
        cache.get('test2', loader),
        cache.get('test3', loader),
      ];

      const results = await Promise.all(promises);

      expect(results).to.deep.equal(['loaded-test1', 'loaded-test2', 'loaded-test3']);
    });
  });

  describe('different key types', () => {
    it('should work with number keys', async () => {
      const cache = new MemCache<number, string>(1000);
      const loader = (key: number) => Promise.resolve(`loaded-${key}`);

      const result = await cache.get(42, loader);
      expect(result).to.equal('loaded-42');
    });

    it('should work with bigint keys', async () => {
      const cache = new MemCache<bigint, string>(1000);
      const loader = (key: bigint) => Promise.resolve(`loaded-${key}`);

      const result = await cache.get(42n, loader);
      expect(result).to.equal('loaded-42');
    });
  });
});
