export async function handleParallel<A, R>(
  concurrency: number,
  items: Iterable<A>,
  handler?: (item: A) => Promise<R>
): Promise<R[]> {
  if (!handler) {
    throw new Error('Handler is required');
  }

  const result: Promise<R>[] = [];
  const queue = new Set<Promise<R>>();

  for (const item of items) {
    const promise = handler(item).then(result => {
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

export async function handleParallelVoid<A>(
  concurrency: number,
  items: Iterable<A>,
  handler?: (item: A) => Promise<unknown>
): Promise<void> {
  if (!handler) {
    throw new Error('Handler is required');
  }

  const queue = new Set<Promise<unknown>>();

  for (const item of items) {
    const promise = handler(item).then(() => queue.delete(promise));

    queue.add(promise);

    if (queue.size >= concurrency) {
      await Promise.race(queue);
    }
  }

  await Promise.all(queue);
}
