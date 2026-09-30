const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const workerPath = path.join(__dirname, '../public/sw.js');
const setup = () => {
  const handlers = {};
  const calls = { added: [], deleted: [], fetches: [], skipped: false, claimed: false };
  const fallback = new Response('Offline', { headers: { 'Content-Type': 'text/html' } });
  const cache = { addAll: async (urls) => { calls.added = urls; }, match: async () => fallback };
  const context = {
    URL, Response,
    self: {
      location: { origin: 'https://example.test' },
      addEventListener: (name, handler) => { handlers[name] = handler; },
      skipWaiting: async () => { calls.skipped = true; },
      clients: { claim: async () => { calls.claimed = true; } },
    },
    caches: {
      open: async () => cache,
      keys: async () => ['asset-manager-v1', 'asset-manager-offline-v2', 'unrelated-cache'],
      delete: async (name) => { calls.deleted.push(name); },
    },
    fetch: async (request) => {
      calls.fetches.push(request);
      if (calls.offline) throw new Error('Offline');
      return new Response('Fresh');
    },
  };
  vm.runInNewContext(fs.readFileSync(workerPath, 'utf8'), context);
  return { handlers, calls, fallback };
};

test('worker is public and precaches only valid static resources', async () => {
  const { handlers, calls } = setup();
  let install;
  handlers.install({ waitUntil: (promise) => { install = promise; } });
  await install;
  assert.deepEqual(Array.from(calls.added), ['/offline.html', '/manifest.webmanifest', '/favicon.ico']);
  assert.equal(calls.skipped, true);
  assert.ok(fs.existsSync(path.join(__dirname, '../public/offline.html')));
  assert.ok(fs.existsSync(path.join(__dirname, '../app/manifest.ts')));
  assert.ok(fs.existsSync(path.join(__dirname, '../app/favicon.ico')));
});

test('activation deletes only this app old caches and waits for client claiming', async () => {
  const { handlers, calls } = setup();
  let activation;
  handlers.activate({ waitUntil: (promise) => { activation = promise; } });
  await activation;
  assert.deepEqual(calls.deleted, ['asset-manager-v1']);
  assert.equal(calls.claimed, true);
});

test('offline navigation uses the explicit offline page, not cached financial HTML', async () => {
  const { handlers, calls, fallback } = setup();
  const request = { method: 'GET', mode: 'navigate', url: 'https://example.test/' };
  let response;
  handlers.fetch({ request, respondWith: (promise) => { response = promise; } });
  assert.equal(await (await response).text(), 'Fresh');
  calls.offline = true;
  handlers.fetch({ request, respondWith: (promise) => { response = promise; } });
  assert.equal(await response, fallback);
});

test('worker does not intercept mutations, financial GETs, RSC payloads or foreign resources', () => {
  const { handlers, calls } = setup();
  for (const request of [
    { method: 'POST', mode: 'cors', url: 'https://example.test/' },
    { method: 'GET', mode: 'cors', url: 'https://example.test/api/balances' },
    { method: 'GET', mode: 'cors', url: 'https://example.test/?_rsc=abc' },
    { method: 'GET', mode: 'cors', url: 'https://other.test/favicon.ico' },
  ]) {
    handlers.fetch({ request, respondWith: () => assert.fail('Sensitive request intercepted') });
  }
  assert.equal(calls.fetches.length, 0);
});
