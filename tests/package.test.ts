import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

test('ESM package entry exports core APIs', async () => {
  const mod = await import('../dist/index.js');

  assert.equal(typeof mod.createClient, 'function');
  assert.equal(typeof mod.fetchAdapter, 'function');
  assert.equal(typeof mod.FynkError, 'function');
  assert.equal(typeof mod.isFynkError, 'function');
});

test('CJS package entry exports core APIs', () => {
  const mod = require('../dist-cjs/index.js');

  assert.equal(typeof mod.createClient, 'function');
  assert.equal(typeof mod.fetchAdapter, 'function');
  assert.equal(typeof mod.FynkError, 'function');
  assert.equal(typeof mod.isFynkError, 'function');
});

test('React and Vue entries export query hooks', async () => {
  const react = await import('../dist/react/index.js');
  const vue = require('../dist-cjs/vue/index.js');

  assert.equal(typeof react.useQuery, 'function');
  assert.equal(typeof react.useMutation, 'function');
  assert.equal(typeof react.useInfiniteQuery, 'function');
  assert.equal(typeof vue.useQuery, 'function');
  assert.equal(typeof vue.useMutation, 'function');
  assert.equal(typeof vue.useInfiniteQuery, 'function');
});
