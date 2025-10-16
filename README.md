# parasync

A powerful TypeScript/JavaScript library for advanced asynchronous operations, parallel processing, and intelligent caching.

## Features

- **ControlPromise**: Enhanced Promise with manual control over resolution and rejection
- **Memory Caching**: TTL-based caching with automatic expiration management
- **Parallel Processing**: Concurrency-controlled parallel execution with batching support
- **Aggregate Caching**: Complex caching strategies for batch operations
- **Utilities**: Handy helpers like `sleep` and iterable `batchGenerator`

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

// Fully compatible with Promise
await promise; // string
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

### Sleep

Simple Promise-based delay helper.

```typescript
import parasync, { sleep } from 'parasync';

// Await a delay
await sleep(50);

// Or via default namespace
await parasync.sleep(100);

// Parallel waits resolve by the longest delay
await Promise.all([sleep(10), sleep(30), sleep(5)]);
```

### Generators

Utilities for working with iterables.

#### batchGenerator

Split any iterable into consecutive batches of a fixed size.

```typescript
// Import from the generators subpath
import { batchGenerator } from 'parasync/generators';

const items = [1, 2, 3, 4, 5, 6, 7];

for (const batch of batchGenerator(3, items)) {
  // batch -> [1,2,3], then [4,5,6], then [7]
  await processBatch(batch);
}

// Collect all batches at once
const batches = Array.from(batchGenerator(2, new Set(items)));
// [[1,2], [3,4], [5,6], [7]] depending on Set iteration order
```

### Aggregate Cache

Advanced caching for complex batch operations with multiple loading strategies.

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
const users = await cache.mget(['user-1', 'user-2', 'user-3']);

// Get by complex key (returns keys, then loads values)
const users = await cache.mgetByKeyKeys('admin-users', async () => {
  const response = await fetch('/api/users/admin');
  const data = await response.json();
  return data.map((user: User) => user.id);
});

// Get by complex key with values loader (more efficient - loads values directly)
const users = await cache.mgetByKeyValues('admin-users', async () => {
  const response = await fetch('/api/users/admin');
  return response.json(); // Returns full user objects directly
});
```

#### Key Differences Between Methods

- **`mgetByKeyKeys`**: Loads keys first, then fetches values using the main batch loader
- **`mgetByKeyValues`**: Loads values directly, bypassing the main batch loader for better performance
- **`mgetByKeyValues`** is more efficient when you already have the full objects and don't need to make additional API calls

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

### Complex Data Loading with Values Cache
```typescript
import parasync from 'parasync';

const userCache = new parasync.MemAggregateCache(
  300000, // 5 minutes TTL
  (user: User) => user.id,
  async (ids: string[]) => {
    // Batch load users by IDs
    return await db.findUsersByIds(ids);
  }
);

// Load admin users directly (more efficient than mgetByKeyKeys)
const adminUsers = await userCache.mgetByKeyValues('admin-users', async () => {
  return await db.findUsersByRole('admin');
});

// Individual users are now cached and can be accessed directly
const user = await userCache.get('user-123');
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
