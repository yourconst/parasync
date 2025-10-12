export async function runParallel<R>(
  concurrency: number,
  callbacks: Iterable<() => Promise<R>>
): Promise<R[]> {
  const result: Promise<R>[] = [];
  const queue = new Set<Promise<R>>();

  for (const callback of callbacks) {
    const promise = callback().then(result => {
      queue.delete(promise);
      return result;
    });

    queue.add(promise);
    result.push(promise);

    if (queue.size >= concurrency) {
      await Promise.race(queue);
    }
  }

  return Promise.all(result);
}

export async function runParallelVoid(
  concurrency: number,
  callbacks: Iterable<() => Promise<unknown>>
): Promise<void> {
  const queue = new Set<Promise<unknown>>();

  for (const callback of callbacks) {
    const promise = callback().then(() => queue.delete(promise));

    queue.add(promise);

    if (queue.size >= concurrency) {
      await Promise.race(queue);
    }
  }

  await Promise.all(queue);
}
