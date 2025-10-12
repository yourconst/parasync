import { expect } from 'chai';
import { ControlPromise } from '../dist';

describe('ControlPromise', () => {
  describe('constructor', () => {
    it('should create a pending promise by default', () => {
      const promise = new ControlPromise();
      expect(promise.pending).to.be.true;
      expect(promise.fulfilled).to.be.false;
      expect(promise.rejected).to.be.false;
    });

    it('should execute executor function if provided', done => {
      let executed = false;
      const promise = new ControlPromise<string>(resolve => {
        executed = true;
        resolve('test');
      });

      promise.then(() => {
        expect(executed).to.be.true;
        done();
      });
    });
  });

  describe('state properties', () => {
    it('should have correct initial state', () => {
      const promise = new ControlPromise();
      expect(promise.pending).to.be.true;
      expect(promise.fulfilled).to.be.false;
      expect(promise.rejected).to.be.false;
    });

    it('should update state when resolved', async () => {
      const promise = new ControlPromise<string>();
      promise.resolve('test');

      expect(promise.fulfilled).to.be.true;
      expect(promise.pending).to.be.false;
      expect(promise.rejected).to.be.false;

      const result = await promise;
      expect(result).to.equal('test');
    });

    it('should update state when rejected', async () => {
      const promise = new ControlPromise();
      const error = new Error('test error');
      promise.reject(error);

      expect(promise.rejected).to.be.true;
      expect(promise.pending).to.be.false;
      expect(promise.fulfilled).to.be.false;

      try {
        await promise;
        expect.fail('Promise should have been rejected');
      } catch (err) {
        expect(err).to.equal(error);
      }
    });
  });

  describe('resolve method', () => {
    it('should resolve with a value', async () => {
      const promise = new ControlPromise<string>();
      promise.resolve('test value');

      const result = await promise;
      expect(result).to.equal('test value');
    });

    it('should resolve with a promise', async () => {
      const promise = new ControlPromise<number>();
      const innerPromise = Promise.resolve(42);
      promise.resolve(innerPromise);

      const result = await promise;
      expect(result).to.equal(42);
    });

    it('should not resolve if already resolved', async () => {
      const promise = new ControlPromise<string>();
      promise.resolve('first');
      promise.resolve('second');

      const result = await promise;
      expect(result).to.equal('first');
    });

    it('should not resolve if already rejected', async () => {
      const promise = new ControlPromise<string>();
      promise.reject(new Error('rejected'));
      promise.resolve('should not resolve');

      try {
        await promise;
        expect.fail('Promise should have been rejected');
      } catch (err) {
        expect(err.message).to.equal('rejected');
      }
    });
  });

  describe('reject method', () => {
    it('should reject with an error', async () => {
      const promise = new ControlPromise();
      const error = new Error('test error');
      promise.reject(error);

      try {
        await promise;
        expect.fail('Promise should have been rejected');
      } catch (err) {
        expect(err).to.equal(error);
      }
    });

    it('should reject with undefined if no error provided', async () => {
      const promise = new ControlPromise();
      promise.reject();

      try {
        await promise;
        expect.fail('Promise should have been rejected');
      } catch (err) {
        expect(err).to.be.undefined;
      }
    });

    it('should not reject if already resolved', async () => {
      const promise = new ControlPromise<string>();
      promise.resolve('resolved');
      promise.reject(new Error('should not reject'));

      const result = await promise;
      expect(result).to.equal('resolved');
    });

    it('should not reject if already rejected', async () => {
      const promise = new ControlPromise();
      const firstError = new Error('first error');
      const secondError = new Error('second error');

      promise.reject(firstError);
      promise.reject(secondError);

      try {
        await promise;
        expect.fail('Promise should have been rejected');
      } catch (err) {
        expect(err).to.equal(firstError);
      }
    });
  });

  describe('promise behavior', () => {
    it('should work with then/catch', async () => {
      const promise = new ControlPromise<number>();

      const thenResult = promise.then(value => value * 2);
      promise.resolve(21);

      const result = await thenResult;
      expect(result).to.equal(42);
    });

    it('should work with catch for errors', async () => {
      const promise = new ControlPromise();
      const error = new Error('test error');

      const catchResult = promise.catch(err => err.message);
      promise.reject(error);

      const result = await catchResult;
      expect(result).to.equal('test error');
    });

    it('should work with finally', async () => {
      const promise = new ControlPromise<string>();
      let finallyCalled = false;

      const finallyResult = promise.finally(() => {
        finallyCalled = true;
      });

      promise.resolve('test');
      await finallyResult;

      expect(finallyCalled).to.be.true;
    });

    it('should work with async/await', async () => {
      const promise = new ControlPromise<number>();

      setTimeout(() => promise.resolve(100), 10);

      const result = await promise;
      expect(result).to.equal(100);
    });
  });

  describe('edge cases', () => {
    it('should handle multiple then handlers', async () => {
      const promise = new ControlPromise<number>();
      const results: number[] = [];

      promise.then(value => results.push(value));
      promise.then(value => results.push(value * 2));

      promise.resolve(5);
      await promise;

      expect(results).to.deep.equal([5, 10]);
    });

    it('should handle chained promises', async () => {
      const promise = new ControlPromise<string>();

      const chained = promise.then(value => value.toUpperCase()).then(value => value + '!');

      promise.resolve('hello');

      const result = await chained;
      expect(result).to.equal('HELLO!');
    });
  });
});
