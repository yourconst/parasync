import { expect } from 'chai';
import { sleep } from '../dist';

describe('sleep', () => {
  it('should resolve after approximately given milliseconds', async () => {
    const delay = 50;
    const start = Date.now();
    await sleep(delay);
    const elapsed = Date.now() - start;
    expect(elapsed).to.be.gte(delay - 1);
    expect(elapsed).to.be.lt(delay + 150);
  });

  it('should work with Promise.all for parallel waits', async () => {
    const start = Date.now();
    await Promise.all([sleep(10), sleep(30), sleep(5)]);
    const elapsed = Date.now() - start;
    expect(elapsed).to.be.gte(30 - 5);
    expect(elapsed).to.be.lt(200);
  });

  it('should resolve on next tick for zero delay', async () => {
    const start = Date.now();
    await sleep(0);
    const elapsed = Date.now() - start;
    expect(elapsed).to.be.gte(0);
    expect(elapsed).to.be.lt(50);
  });
});
