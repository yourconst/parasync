import { handleParallel, handleParallelVoid } from './handle';

export async function batchParallel<A, R>(
  concurrency: number,
  batchSize: number,
  items: Iterable<A>,
  handler?: (item: A[]) => Promise<R[]>
): Promise<R[]> {
  const batches: A[][] = [];
  let batch: A[] = [];

  for (const item of items) {
    batch.push(item);

    if (batch.length < batchSize) {
      continue;
    }

    batches.push(batch);
    batch = [];
  }

  if (batch.length) {
    batches.push(batch);
  }

  const result = await handleParallel(concurrency, batches, handler);

  return result.flat();
}

export async function batchParallelVoid<A>(
  concurrency: number,
  batchSize: number,
  items: Iterable<A>,
  handler?: (item: A[]) => Promise<unknown>
): Promise<void> {
  const batches: A[][] = [];
  let batch: A[] = [];

  for (const item of items) {
    batch.push(item);

    if (batch.length < batchSize) {
      continue;
    }

    batches.push(batch);
    batch = [];
  }

  if (batch.length) {
    batches.push(batch);
  }

  await handleParallelVoid(concurrency, batches, handler);
}
