import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient, FynkError } from '../src/index.js';
import type { Adapter, FynkRequestConfig, FynkResponse } from '../src/index.js';

function createAdapter(send: Adapter['send']): Adapter {
  const call = async <T>(method: FynkRequestConfig['method'], url: string, opts?: Partial<FynkRequestConfig>) => {
    const response = await send<T>({ method, url, ...(opts || {}) });
    return response.data;
  };

  return {
    send,
    get: (url, opts) => call('GET', url, opts),
    post: (url, opts) => call('POST', url, opts),
    put: (url, opts) => call('PUT', url, opts),
    patch: (url, opts) => call('PATCH', url, opts),
    delete: (url, opts) => call('DELETE', url, opts)
  };
}

test('createClient deduplicates concurrent GET requests', async () => {
  let count = 0;
  const client = createClient({
    adapter: createAdapter(async (config) => {
      count += 1;
      await new Promise(resolve => setTimeout(resolve, 10));
      return {
        status: 200,
        ok: true,
        statusText: 'OK',
        headers: {},
        data: { count },
        config
      } satisfies FynkResponse<{ count: number }>;
    })
  });

  const results = await Promise.all([
    client.get<{ count: number }>('/users/1'),
    client.get<{ count: number }>('/users/1'),
    client.get<{ count: number }>('/users/1')
  ]);

  assert.equal(count, 1);
  assert.deepEqual(results, [{ count: 1 }, { count: 1 }, { count: 1 }]);
});

test('createClient keeps distinct params in GET dedupe keys', async () => {
  let count = 0;
  const client = createClient({
    adapter: createAdapter(async (config) => {
      count += 1;
      await new Promise(resolve => setTimeout(resolve, 10));
      return {
        status: 200,
        ok: true,
        statusText: 'OK',
        headers: {},
        data: { params: config.params },
        config
      };
    })
  });

  const results = await Promise.all([
    client.get('/users', { params: { page: 1 } }),
    client.get('/users', { params: { page: 2 } })
  ]);

  assert.equal(count, 2);
  assert.deepEqual(results, [
    { params: { page: 1 } },
    { params: { page: 2 } }
  ]);
});

test('createClient can disable GET deduplication', async () => {
  let count = 0;
  const client = createClient({
    adapter: createAdapter(async (config) => {
      count += 1;
      const current = count;
      await new Promise(resolve => setTimeout(resolve, 10));
      return {
        status: 200,
        ok: true,
        statusText: 'OK',
        headers: {},
        data: { count: current },
        config
      };
    })
  });

  const results = await Promise.all([
    client.get('/users/1', { dedupe: false }),
    client.get('/users/1', { dedupe: false })
  ]);

  assert.equal(count, 2);
  assert.deepEqual(results, [{ count: 1 }, { count: 2 }]);
});

test('createClient retries retryable request failures', async () => {
  let count = 0;
  const client = createClient({
    adapter: createAdapter(async (config) => {
      count += 1;
      if (count < 3) {
        throw new FynkError('Request failed with status 503', {
          config,
          response: {
            status: 503,
            ok: false,
            statusText: 'Service Unavailable',
            headers: {},
            data: { error: 'try again' },
            config
          }
        });
      }
      return {
        status: 200,
        ok: true,
        statusText: 'OK',
        headers: {},
        data: { ok: true },
        config
      };
    })
  });

  const result = await client.get('/flaky', { retry: { attempts: 2, delay: 0 } });

  assert.equal(count, 3);
  assert.deepEqual(result, { ok: true });
});

test('createClient invalidates scheduler cache entries', async () => {
  let count = 0;
  const client = createClient({
    adapter: createAdapter(async (config) => {
      count += 1;
      return {
        status: 200,
        ok: true,
        statusText: 'OK',
        headers: {},
        data: { count },
        config
      };
    })
  });

  assert.deepEqual(await client.get('/users/1'), { count: 1 });
  assert.deepEqual(await client.get('/users/1'), { count: 1 });
  client.invalidate(key => key.includes('/users/1'));
  assert.deepEqual(await client.get('/users/1'), { count: 2 });
});

test('draft rollback restores optimistic cache changes', () => {
  const client = createClient({
    adapter: createAdapter(async (config) => ({
      status: 200,
      ok: true,
      statusText: 'OK',
      headers: {},
      data: null,
      config
    }))
  });

  const User = client.defineModel<{ id: number; name: string }>({
    key: 'user',
    id: user => user.id
  });

  client.normalize(User, { id: 1, name: 'Ada' });
  client.draft.patch(User, 1, { name: 'Grace' });
  assert.deepEqual(client.cache.get(User, 1), { id: 1, name: 'Grace' });

  client.draft.rollback();
  assert.deepEqual(client.cache.get(User, 1), { id: 1, name: 'Ada' });
});

test('draft commit keeps optimistic cache changes', () => {
  const client = createClient({
    adapter: createAdapter(async (config) => ({
      status: 200,
      ok: true,
      statusText: 'OK',
      headers: {},
      data: null,
      config
    }))
  });

  const User = client.defineModel<{ id: number; name: string }>({
    key: 'user',
    id: user => user.id
  });

  client.normalize(User, { id: 1, name: 'Ada' });
  client.draft.patch(User, 1, { name: 'Grace' });
  client.draft.commit();
  client.draft.rollback();

  assert.deepEqual(client.cache.get(User, 1), { id: 1, name: 'Grace' });
});

test('normalized cache stores and resolves related entities', () => {
  const client = createClient({
    adapter: createAdapter(async (config) => ({
      status: 200,
      ok: true,
      statusText: 'OK',
      headers: {},
      data: null,
      config
    }))
  });

  const User = client.defineModel<{ id: number; name: string }>({
    key: 'user',
    id: user => user.id
  });
  const Post = client.defineModel<{ id: number; title: string; author: number | { id: number; name: string } }>({
    key: 'post',
    id: post => post.id,
    relations: { author: 'user' }
  });

  client.normalize(Post, { id: 10, title: 'Hello', author: { id: 1, name: 'Ada' } });

  assert.deepEqual(client.cache.get(Post, 10), { id: 10, title: 'Hello', author: 1 });
  assert.deepEqual(client.cache.get(User, 1), { id: 1, name: 'Ada' });
  assert.deepEqual(client.resolve(Post, 10), { id: 10, title: 'Hello', author: { id: 1, name: 'Ada' } });
});

test('client persists, hydrates, and inspects normalized cache', async () => {
  const storage = new Map<string, string>();
  const storageAdapter = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => { storage.set(key, value); }
  };
  const adapter = createAdapter(async (config) => ({
    status: 200,
    ok: true,
    statusText: 'OK',
    headers: {},
    data: null,
    config
  }));
  const first = createClient({ adapter });
  const User = first.defineModel<{ id: number; name: string }>({
    key: 'user',
    id: user => user.id
  });

  first.normalize(User, { id: 1, name: 'Ada' });
  await first.persist(storageAdapter);

  const second = createClient({ adapter });
  const SecondUser = second.defineModel<{ id: number; name: string }>({
    key: 'user',
    id: user => user.id
  });
  await second.hydrate(storageAdapter);

  assert.deepEqual(second.cache.get(SecondUser, 1), { id: 1, name: 'Ada' });
  assert.equal(second.inspect().normalized.tables.user.size, 1);
});

test('client wraps invalid persisted cache snapshots in FynkError', async () => {
  const client = createClient({
    adapter: createAdapter(async (config) => ({
      status: 200,
      ok: true,
      statusText: 'OK',
      headers: {},
      data: null,
      config
    }))
  });

  await assert.rejects(
    () => client.hydrate({
      getItem: () => '{not-json',
      setItem: () => {}
    }),
    (error) => {
      assert.ok(error instanceof FynkError);
      assert.equal(error.message, 'Failed to hydrate cache snapshot');
      return true;
    }
  );
});

test('createClient does not retry non-retryable statuses by default', async () => {
  let count = 0;
  const client = createClient({
    adapter: createAdapter(async (config) => {
      count += 1;
      throw new FynkError('Request failed with status 404', {
        config,
        response: {
          status: 404,
          ok: false,
          statusText: 'Not Found',
          headers: {},
          data: { error: 'missing' },
          config
        }
      });
    })
  });

  await assert.rejects(() => client.get('/missing', { retry: { attempts: 3, delay: 0 } }));
  assert.equal(count, 1);
});
