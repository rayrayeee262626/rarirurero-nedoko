import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import worker from '../tools/preview-worker.mjs';
import { publicFiles, generatedFiles } from '../tools/site-files.mjs';

const env = { get DB() { throw new Error('Preview must never access a database'); } };
test('preview serves sample posts and disables every mutation without accessing DB', async () => {
  for (const path of ['/api/bbs', '/api/bbs/config']) {
    for (const method of ['POST', 'DELETE', 'PUT', 'PATCH']) {
      const result = await worker.fetch(new Request('https://preview.test' + path, { method }), env);
      assert.equal(result.status, 405);
    }
  }
  const config = await worker.fetch(new Request('https://preview.test/api/bbs/config'), env);
  assert.deepEqual(await config.json(), { ready: false, siteKey: null, preview: true });
  const data = await worker.fetch(new Request('https://preview.test/api/bbs'), env);
  assert.equal((await data.json()).posts[0].name, '試作版のサンプル');
});
test('preview build excludes counter, third-party scripts and original worker', async () => {
  const root = new URL('../preview-dist/', import.meta.url);
  const files = await readdir(root);
  assert.equal(files.length, publicFiles.length + generatedFiles.length + 1);
  for (const file of files.filter(f => f.endsWith('.html'))) {
    const text = await readFile(new URL(file, root), 'utf8');
    assert.ok(text.includes('preview-banner'));
    assert.doesNotMatch(text, /<script[^>]+src=["']https?:/i);
    assert.doesNotMatch(text, /counter1\.fc2\.com/);
    assert.ok(text.includes('noindex,nofollow'));
  }
  const preview = await readFile(new URL('_worker.js', root), 'utf8');
  const styles = await readFile(new URL('styles.css', root), 'utf8');
  assert.ok(styles.trimStart().startsWith(':root{'), 'Removing a font URL with semicolons must preserve the theme variables');
  assert.doesNotMatch(styles, /fonts\.googleapis\.com/);
  assert.deepEqual(await readFile(new URL('mascot.webp', root)), await readFile(new URL('../site/mascot.webp', import.meta.url)), 'Mascot must be copied as binary without text conversion');
  assert.doesNotMatch(preview, /env\.DB|TURNSTILE_SECRET|BBS_ADMIN_KEY|fetch\(['"]https:/);
  const source = await readFile(new URL('../site/_worker.js', import.meta.url), 'utf8');
  assert.ok(source.includes('env.DB'));
});
test('preview static responses discourage indexing', async () => {
  const result = await worker.fetch(new Request('https://preview.test/'), { ASSETS: { fetch: () => new Response('fixture') } });
  assert.equal(result.headers.get('x-robots-tag'), 'noindex, nofollow');
});
