import test from 'node:test';
import assert from 'node:assert/strict';
import { FynkError, fetchAdapter } from '../src/index.js';
import type { FetchLike } from '../src/index.js';

test('fetchAdapter serializes params and JSON bodies', async () => {
  let seenUrl = '';
  let seenInit: RequestInit | undefined;

  const fetchLike: FetchLike = async (url, init) => {
    seenUrl = url;
    seenInit = init;
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  };

  const client = fetchAdapter('https://api.example.test', fetchLike);
  const data = await client.post<{ ok: boolean }>('/users', {
    params: { page: 1, tag: ['a', 'b'], empty: undefined },
    body: { name: 'Ada' }
  });

  assert.deepEqual(data, { ok: true });
  assert.equal(seenUrl, 'https://api.example.test/users?page=1&tag=a&tag=b');
  assert.equal((seenInit?.headers as Record<string, string>)['Content-Type'], 'application/json');
  assert.equal(seenInit?.body, JSON.stringify({ name: 'Ada' }));
});

test('fetchAdapter returns undefined for empty responses', async () => {
  const client = fetchAdapter('', async () => new Response(null, { status: 204 }));

  const data = await client.delete('/users/1');

  assert.equal(data, undefined);
});

test('fetchAdapter throws FynkError for invalid HTTP statuses by default', async () => {
  const client = fetchAdapter('', async () => new Response(JSON.stringify({ message: 'Nope' }), {
    status: 404,
    statusText: 'Not Found',
    headers: { 'content-type': 'application/json' }
  }));

  await assert.rejects(
    () => client.get('/missing'),
    (error) => {
      assert.ok(error instanceof FynkError);
      assert.equal(error.status, 404);
      assert.deepEqual(error.data, { message: 'Nope' });
      return true;
    }
  );
});

test('fetchAdapter can opt out of HTTP status throwing', async () => {
  const client = fetchAdapter('', async () => new Response('missing', {
    status: 404,
    headers: { 'content-type': 'text/plain' }
  }));

  const data = await client.get('/missing', { throwHttpErrors: false });

  assert.equal(data, 'missing');
});

test('fetchAdapter aborts timed out requests', async () => {
  const client = fetchAdapter('', async (_url, init) => new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true });
  }));

  await assert.rejects(
    () => client.get('/slow', { timeout: 5 }),
    (error) => {
      assert.ok(error instanceof FynkError);
      assert.equal(error.message, 'Request failed before receiving a response');
      return true;
    }
  );
});
