# Fynk API

## Client

```ts
import { createClient, fetchAdapter } from 'fynk';
import type { FynkClient, FynkRequestConfig, FynkResponse } from 'fynk';

const client = createClient({
  adapter: fetchAdapter('https://api.example.com')
});
```

Public client types use the Fynk name: `FynkClient`, `FynkRequestConfig`, and `FynkResponse`.

## Request Options

```ts
await client.get('/users', {
  params: { page: 1, tag: ['admin', 'active'] },
  timeout: 5000,
  signal: abortController.signal,
  retry: { attempts: 2, delay: 100 },
  dedupe: true,
  dedupeKey: 'users:list',
  throwHttpErrors: true,
  validateStatus: status => status >= 200 && status < 300,
});
```

- `params`: serializes query parameters. Arrays are appended as repeated keys.
- `timeout`: aborts requests that exceed the configured milliseconds.
- `signal`: forwards caller cancellation.
- `retry`: retries retryable methods/statuses. Defaults to no retry.
- `dedupe`: collapses identical in-flight requests. GET defaults to enabled.
- `dedupeKey`: overrides the scheduler key used for dedupe/cache.
- `throwHttpErrors`: throws `FynkError` for invalid HTTP status codes by default.

## Errors

```ts
import { FynkError, isFynkError } from 'fynk';

try {
  await client.get('/missing');
} catch (error) {
  if (isFynkError(error)) {
    console.log(error.status, error.data, error.config);
  }
}
```

## Models and Normalized Cache

```ts
type User = { id: number; name: string };
type Post = { id: number; title: string; author: number | User };

const UserModel = client.defineModel<User>({
  key: 'user',
  id: user => user.id,
});

const PostModel = client.defineModel<Post>({
  key: 'post',
  id: post => post.id,
  relations: { author: 'user' },
});

client.normalize(PostModel, {
  id: 1,
  title: 'Hello',
  author: { id: 10, name: 'Ada' },
});

client.cache.get(PostModel, 1);
client.resolve(PostModel, 1);
```

## Cache Control

```ts
client.invalidate(['user', 1]);
client.invalidate(key => key.includes('/users'));
client.clearCache();
console.log(client.inspect());
```

## Persistence

```ts
await client.persist(localStorage);
await client.hydrate(localStorage);
```

Any storage object with `getItem` and `setItem` works, including async storage adapters.

## SSE

```ts
import { createEventSync } from 'fynk';

const events = createEventSync('/events');
const off = events.on('user:updated', user => {
  client.normalize(UserModel, user);
});

off();
events.close();
```
