import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient, FynkError } from '../src/index.js';
import type { Adapter, HelioRequestConfig, HelioResponse } from '../src/index.js';

function createAdapter(send: Adapter['send']): Adapter {
  const call = async <T>(method: HelioRequestConfig['method'], url: string, opts?: Partial<HelioRequestConfig>) => {
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
      } satisfies HelioResponse<{ count: number }>;
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
