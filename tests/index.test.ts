import { expect } from 'chai';
import parasync from '../src/index';

describe('parasync library', () => {
  it('should export ControlPromise', () => {
    expect(parasync.ControlPromise).to.be.a('function');
  });

  it('should export MemCache', () => {
    expect(parasync.MemCache).to.be.a('function');
  });

  it('should export MemAggregateCache', () => {
    expect(parasync.MemAggregateCache).to.be.a('function');
  });

  it('should export parallel functions', () => {
    expect(parasync.runParallel).to.be.a('function');
    expect(parasync.runParallelVoid).to.be.a('function');
    expect(parasync.handleParallel).to.be.a('function');
    expect(parasync.handleParallelVoid).to.be.a('function');
    expect(parasync.batchParallel).to.be.a('function');
    expect(parasync.batchParallelVoid).to.be.a('function');
  });

  it('should have all expected exports', () => {
    const expectedExports = [
      'ControlPromise',
      'MemCache',
      'MemAggregateCache',
      'runParallel',
      'runParallelVoid',
      'handleParallel',
      'handleParallelVoid',
      'batchParallel',
      'batchParallelVoid',
    ];

    expectedExports.forEach(exportName => {
      expect(parasync).to.have.property(exportName);
    });
  });
});
