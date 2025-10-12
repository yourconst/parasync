export function* batchGenerator<A>(batchSize: number, items: Iterable<A>) {
  let batch: A[] = [];

  for (const item of items) {
    batch.push(item);
    if (batch.length === batchSize) {
      yield batch;
      batch = [];
    }
  }

  if (batch.length > 0) {
    yield batch;
  }
}
