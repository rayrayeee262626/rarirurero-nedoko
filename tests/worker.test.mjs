import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../site/_worker.js';

const request = (path, init) => new Request(`https://local.test${path}`, init);
const run = (path, init, env = {}) => worker.fetch(request(path, init), env, {});

test('static requests are passed through to ASSETS', async () => {
  const result = await run('/notes', undefined, { ASSETS: { fetch: req => new Response(new URL(req.url).pathname) } });
  assert.equal(await result.text(), '/notes');
});
test('config fails closed without all required bindings', async () => {
  const r = await run('/api/bbs/config');
  assert.deepEqual(await r.json(), { ready: false, siteKey: null });
  assert.equal(r.headers.get('cache-control'), 'no-store');
});
test('config never exposes secret or admin key', async () => {
  const r = await run('/api/bbs/config', undefined, {
    DB: {}, TURNSTILE_SITE_KEY: 'test-public', TURNSTILE_SECRET: 'test-secret', BBS_ADMIN_KEY: 'test-admin',
  });
  assert.deepEqual(await r.json(), { ready: true, siteKey: 'test-public' });
});
test('missing DB returns maintenance response', async () => {
  assert.equal((await run('/api/bbs')).status, 503);
});
test('invalid cursor is rejected before touching DB', async () => {
  for (const cursor of ['-1', 'abc', '1.5']) {
    assert.equal((await run(`/api/bbs?before=${cursor}`, undefined, { DB: {} })).status, 400);
  }
});
test('GET exposes public fields and paginates without writes', async () => {
  const calls = [];
  const roots = Array.from({ length: 21 }, (_, i) => ({ id: 50 - i, name: 'fixture', message: 'fixture', created_at: '2026-11-13 00:00:00' }));
  const DB = { prepare(sql) {
    assert.match(sql, /^SELECT /);
    assert.doesNotMatch(sql, /ip_hash/);
    calls.push(sql);
    return { bind(...ids) { assert.equal(ids.length, 20); return this; }, async all() { return { results: sql.includes('parent_id IN') ? [] : roots }; } };
  } };
  const r = await run('/api/bbs', undefined, { DB });
  const body = await r.json();
  assert.equal(body.posts.length, 20);
  assert.equal(body.nextBefore, 31);
  assert.equal(calls.length, 2);
});
test('foreign origin cannot POST or DELETE', async () => {
  for (const method of ['POST', 'DELETE']) {
    const r = await run('/api/bbs', { method, headers: { origin: 'https://elsewhere.test' } }, { DB: {} });
    assert.equal(r.status, 403);
  }
});
test('POST rejects missing Turnstile token without external request', async () => {
  const r = await run('/api/bbs', { method: 'POST', body: JSON.stringify({ message: 'fixture' }) }, {
    DB: {}, TURNSTILE_SITE_KEY: 'test-public', TURNSTILE_SECRET: 'test-secret',
  });
  assert.equal(r.status, 403);
});
test('DELETE rejects missing admin key configuration', async () => {
  const r = await run('/api/bbs', { method: 'DELETE' }, { DB: {} });
  assert.equal(r.status, 503);
});
