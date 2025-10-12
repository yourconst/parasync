import { expect } from 'chai';
import { batchGenerator } from '../../src/generators';

describe('batchGenerator', () => {
  it('should yield batches of given size', () => {
    const items = [1, 2, 3, 4, 5, 6, 7];
    const batches = Array.from(batchGenerator(3, items));
    expect(batches).to.deep.equal([[1, 2, 3], [4, 5, 6], [7]]);
  });

  it('should yield single batch if items less than batch size', () => {
    const items = [1, 2];
    const batches = Array.from(batchGenerator(5, items));
    expect(batches).to.deep.equal([[1, 2]]);
  });

  it('should yield empty array for empty input', () => {
    const items: number[] = [];
    const batches = Array.from(batchGenerator(3, items));
    expect(batches).to.deep.equal([]);
  });

  it('should handle exact multiple of batch size', () => {
    const items = [1, 2, 3, 4, 5, 6];
    const batches = Array.from(batchGenerator(2, items));
    expect(batches).to.deep.equal([
      [1, 2],
      [3, 4],
      [5, 6],
    ]);
  });

  it('should work with generic iterables (Set)', () => {
    const items = new Set([1, 2, 3, 4]);
    const batches = Array.from(batchGenerator(3, items));
    expect(batches).to.deep.equal([[1, 2, 3], [4]]);
  });

  it('should not mutate original items', () => {
    const items = [1, 2, 3, 4];
    Array.from(batchGenerator(3, items));
    expect(items).to.deep.equal([1, 2, 3, 4]);
  });

  it('should handle batch size of 1', () => {
    const items = [1, 2, 3];
    const batches = Array.from(batchGenerator(1, items));
    expect(batches).to.deep.equal([[1], [2], [3]]);
  });
});
