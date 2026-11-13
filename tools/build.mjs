import { mkdir, readdir, copyFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { publicFiles, generatedFiles } from './site-files.mjs';
import { readCollection, compileCatalog, compileArchive } from './content-source.mjs';
const root = new URL('../', import.meta.url);
const dist = new URL('dist/', root);
await mkdir(dist, { recursive: true });
// Refuse unexpected output rather than silently deleting files or publishing them.
const unexpected = (await readdir(dist)).filter(name => ![...publicFiles, ...generatedFiles].includes(name));
if (unexpected.length) throw new Error('dist contains unexpected files; use a fresh output directory.');
for (const name of publicFiles) {
  await copyFile(new URL(`site/${name}`, root), new URL(name, dist));
}
const [projects, writings, posts] = await Promise.all(['projects', 'writings', 'posts'].map(folder => readCollection(root, folder)));
await writeFile(new URL('catalog.json', dist), JSON.stringify(compileCatalog(projects, writings), null, 2) + '\n');
await writeFile(new URL('legacy-posts.json', dist), JSON.stringify(compileArchive(posts), null, 2) + '\n');
console.log(`Prepared ${publicFiles.length + generatedFiles.length} public files in ${fileURLToPath(dist)}. No deployment performed.`);
