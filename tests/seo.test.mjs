import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { enrichPage, sitemap, robots, ORIGIN, SITEMAP_PATHS } from '../tools/seo.mjs';

test('search engines receive visible work names, navigation and canonical URLs without JavaScript', async () => {
  const source = await readFile(new URL('../site/works.html', import.meta.url), 'utf8');
  const title = '作品</script><script>alert(1)</script>';
  const catalog = { works: [{title, url:'https://example.com/', description:'作品の説明'}], projects:[], writings:[] };
  const html = enrichPage('works.html', source, catalog, 2026);
  assert.ok(html.includes('data-prerendered="true"'));
  assert.ok(html.includes('作品&lt;/script&gt;'));
  assert.ok(html.includes(`rel="canonical" href="${ORIGIN}/works"`));
  assert.ok(html.includes('https://note.com/rcp262626'));
  const structured = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1];
  assert.equal(JSON.parse(structured)['@graph'][1].itemListElement[0].item.name, title);
  assert.ok(!structured.includes('</script>'));
  assert.ok(!html.includes('name="robots" content="noindex'));
});

test('sitemap lists actual primary pages and robots advertises it', () => {
  assert.deepEqual([...sitemap().matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]), SITEMAP_PATHS.map(path=>ORIGIN+path));
  assert.ok(robots.includes(`Sitemap: ${ORIGIN}/sitemap.xml`));
  assert.ok(!sitemap().includes('lastmod'));
});

test('legacy query-based article URLs are not collapsed into one canonical page', async () => {
  const source = await readFile(new URL('../site/article.html', import.meta.url), 'utf8');
  const html = enrichPage('article.html', source, {works:[], projects:[], writings:[]}, 2026);
  assert.ok(!html.includes('rel="canonical"'));
  assert.ok(html.includes('legacy.js'));
});
