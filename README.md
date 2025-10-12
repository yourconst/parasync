# parasync

A powerful TypeScript/JavaScript library for advanced asynchronous operations, parallel processing, and intelligent caching.

## Features

- **ControlPromise**: Enhanced Promise with manual control over resolution and rejection
- **Memory Caching**: TTL-based caching with automatic expiration management
- **Parallel Processing**: Concurrency-controlled parallel execution with batching support
- **Aggregate Caching**: Complex caching strategies for batch operations

## Installation

```bash
npm install parasync
```

## API Reference

### ControlPromise

A Promise that you can manually resolve or reject with additional state tracking.

```typescript
import { ControlPromise } from 'parasync';

const promise = new ControlPromise<string>();

// Check state
console.log(promise.pending);   // true
console.log(promise.fulfilled); // false
console.log(promise.rejected);  // false

// Manually resolve
promise.resolve('Hello World');

// Or reject
promise.reject(new Error('Something went wrong'));
```

### Memory Cache

TTL-based in-memory caching with automatic cleanup.

```typescript
import parasync from 'parasync';

// Create cache with 5 second TTL
const cache = new parasync.MemCache<string, User>(5000);

// With loader function
const userCache = new parasync.MemCache<string, User>(5000, async (id: string) => {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
});

// Get cached or load new value
const user = await userCache.get('user-123');

// Manual cache management
cache.clear();
cache.delete('key');
cache.deleteExpired();
```

### Parallel Processing

Execute operations with controlled concurrency.

```typescript
import parasync from 'parasync';

// Process items with concurrency limit
const results = await parasync.handleParallel(3, items, async (item) => {
  return await processItem(item);
});

// Process without return values
await parasync.handleParallelVoid(5, items, async (item) => {
  await saveItem(item);
});

// Run callbacks in parallel
const results = await parasync.runParallel(2, [
  () => fetch('/api/data1'),
  () => fetch('/api/data2'),
  () => fetch('/api/data3')
]);
```

### Batch Processing

Process items in batches with parallel execution.

```typescript
import parasync from 'parasync';

// Process items in batches of 10 with concurrency of 3
const results = await parasync.batchParallel(3, 10, items, async (batch) => {
  return await processBatch(batch);
});

// Process batches without return values
await parasync.batchParallelVoid(2, 5, items, async (batch) => {
  await saveBatch(batch);
});
```

### Aggregate Cache

Advanced caching for complex batch operations.

```typescript
import parasync from 'parasync';

const cache = new parasync.MemAggregateCache(
  60000, // 1 minute TTL
  (user: User) => user.id, // Key extractor
  async (ids: string[]) => { // Batch loader
    const response = await fetch('/api/users/batch', {
      method: 'POST',
      body: JSON.stringify({ ids })
    });
    return response.json();
  }
);

// Get single item
const user = await cache.get('user-123');

// Get multiple items (batched automatically)
const users = await cache.getMany(['user-1', 'user-2', 'user-3']);

// Get by complex key
const users = await cache.getManyByComplexKey('admin-users', async () => {
  const response = await fetch('/api/users/admin');
  const data = await response.json();
  return data.map((user: User) => user.id);
});
```

## Use Cases

### API Rate Limiting
```typescript
import parasync from 'parasync';

// Process API calls with rate limiting
await parasync.handleParallel(5, apiEndpoints, async (endpoint) => {
  return await fetch(endpoint);
});
```

### Database Batch Operations
```typescript
import parasync from 'parasync';

// Batch database inserts
await parasync.batchParallel(3, 100, records, async (batch) => {
  return await db.insertMany(batch);
});
```

### Caching with Fallback
```typescript
import parasync from 'parasync';

const cache = new parasync.MemCache(300000, async (key: string) => {
  // Fallback to database if not in cache
  return await db.findByKey(key);
});

const data = await cache.get('some-key');
```

## Performance Benefits

- **Memory Efficient**: Automatic cleanup of expired entries
- **Concurrency Control**: Prevent overwhelming external services
- **Batch Optimization**: Reduce network round-trips
- **Smart Caching**: Avoid redundant operations

## TypeScript Support

Full TypeScript support with comprehensive type definitions:

```typescript
import parasync from 'parasync';

// Strongly typed cache
const cache = new parasync.MemCache<string, User>(5000);

// Typed parallel processing
const users: User[] = await parasync.handleParallel(3, userIds, async (id: string) => {
  return await fetchUser(id);
});
```

## Import Options

### Default Import (Recommended)
```typescript
import parasync from 'parasync';

const promise = new parasync.ControlPromise();
const cache = new parasync.MemCache(5000);
const results = await parasync.handleParallel(3, items, handler);
```

### Named Imports
```typescript
import { 
  ControlPromise, 
  MemCache, 
  handleParallel,
  MemCacheKey,
  ComplexManyCacheKey 
} from 'parasync';

const promise = new ControlPromise();
const cache = new MemCache<MemCacheKey, User>(5000);
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
