import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { compileCatalog, compileArchive, parseMarkdown, readCollection } from '../tools/content-source.mjs';

const root = new URL('../', import.meta.url);
test('renaming or hiding a project is controlled by its file, without resurrected defaults', () => {
  const visible = { id: 'stable-id', title: 'Renamed project', status: 'developing', visible: true, description: 'fixture' };
  const catalog = compileCatalog([visible, { ...visible, id: 'hidden', visible: false }], []);
  assert.equal(catalog.projects.length, 1);
  assert.equal(catalog.projects[0].id, 'stable-id');
  assert.equal(catalog.projects[0].title, 'Renamed project');
  assert.equal(compileCatalog([{ ...visible, visible: false }], []).projects.length, 0);
});
test('published works have links and writings are exclusively note links', () => {
  assert.throws(() => compileCatalog([{ id: 'work', title: 'fixture', status: 'published', visible: true }], []));
  for (const url of ['javascript:alert(1)', 'https://example.test/', 'http://note.com/fixture']) {
    assert.throws(() => compileCatalog([], [{ id: 'note', title: 'fixture', visible: true, url }]));
  }
  const note = compileCatalog([], [{ id: 'note', title: 'fixture', visible: true, url: 'https://note.com/fixture' }]);
  assert.equal(note.writings[0].url, 'https://note.com/fixture');
});
test('existing project and note destinations are preserved in static catalog', async () => {
  const [projects, writings] = await Promise.all(['projects', 'writings'].map(name => readCollection(root, name)));
  const catalog = compileCatalog(projects, writings);
  const visibleProjects = projects.filter(item => item.visible === true);
  assert.equal(catalog.works.length + catalog.projects.length, visibleProjects.length);
  for (const item of visibleProjects) {
    const built = [...catalog.works, ...catalog.projects].find(record => record.id === item.id);
    assert.equal(built.url, item.url ? new URL(item.url).href : '');
  }
  assert.deepEqual(catalog.writings.map(item => item.url), writings.filter(item => item.visible === true).map(item => new URL(item.url).href));
});
test('archive preserves published body and old filename while excluding unpublished data', async () => {
  const posts = await readCollection(root, 'posts');
  const archived = compileArchive([...posts, { _file: 'draft.md', published: false, body: 'PRIVATE FIXTURE' }]);
  assert.ok(archived.some(post => post._file === '2026-11-12-.md'));
  assert.ok(!JSON.stringify(archived).includes('PRIVATE FIXTURE'));
  const original = parseMarkdown(await readFile(new URL('content/posts/2026-11-12-.md', root), 'utf8'));
  assert.equal(archived.find(post => post._file === '2026-11-12-.md').body, original.body);
});
