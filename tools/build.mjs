import { mkdir, readdir, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export const publicFiles = [
  '_worker.js', 'index.html', 'about.html', 'works.html', 'writings.html',
  'notes.html', 'projects.html', 'article.html', 'bbs.html',
  'app.js', 'content.js', 'bbs.js', 'styles.css',
];
const root = new URL('../', import.meta.url);
const dist = new URL('dist/', root);
await mkdir(dist, { recursive: true });
// Refuse unexpected output rather than silently deleting files or publishing them.
const unexpected = (await readdir(dist)).filter(name => !publicFiles.includes(name));
if (unexpected.length) throw new Error('dist contains unexpected files; use a fresh output directory.');
for (const name of publicFiles) {
  await copyFile(new URL(`site/${name}`, root), new URL(name, dist));
}
console.log(`Prepared ${publicFiles.length} files in ${fileURLToPath(dist)}. No deployment performed.`);
