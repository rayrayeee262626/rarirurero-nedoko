import { mkdir, readdir, copyFile, writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { publicFiles, generatedFiles } from './site-files.mjs';
import { readCollection, compileCatalog, compileArchive } from './content-source.mjs';
import { enrichPage, sitemap, robots } from './seo.mjs';
const root = new URL('../', import.meta.url);
const dist = new URL('dist/', root);
await mkdir(dist, { recursive: true });
// Refuse unexpected output rather than silently deleting files or publishing them.
const unexpected = (await readdir(dist)).filter(name => ![...publicFiles, ...generatedFiles].includes(name));
if (unexpected.length) throw new Error('dist contains unexpected files; use a fresh output directory.');
const [projects, writings, posts] = await Promise.all(['projects', 'writings', 'posts'].map(folder => readCollection(root, folder)));
const catalog = compileCatalog(projects, writings);
for (const name of publicFiles) {
  if (name.endsWith('.html')) await writeFile(new URL(name, dist), enrichPage(name, await readFile(new URL(`site/${name}`, root), 'utf8'), catalog));
  else await copyFile(new URL(`site/${name}`, root), new URL(name, dist));
}
await writeFile(new URL('catalog.json', dist), JSON.stringify(catalog, null, 2) + '\n');
await writeFile(new URL('legacy-posts.json', dist), JSON.stringify(compileArchive(posts), null, 2) + '\n');
await writeFile(new URL('robots.txt', dist), robots);
await writeFile(new URL('sitemap.xml', dist), sitemap());
console.log(`Prepared ${publicFiles.length + generatedFiles.length} public files in ${fileURLToPath(dist)}. No deployment performed.`);
