import { readFile, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('docs/source-zip/sha256.json', root), 'utf8'));
const files = await readdir(new URL('site/', root));
assert.equal(files.length, 13);
for (const file of files) {
  assert.ok(file in manifest, `Unexpected site file: ${file}`);
  if (file.endsWith('.js')) {
    const result = spawnSync(process.execPath, ['--check', new URL(`site/${file}`, root).pathname], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  }
}
const build = spawnSync(process.execPath, ['tools/build.mjs'], { cwd: root, encoding: 'utf8' });
assert.equal(build.status, 0, build.stderr);
const output = (await readdir(new URL('dist/', root))).sort();
assert.deepEqual(output, [...files].sort(), 'Output must contain only site files');
for (const file of files) {
  assert.deepEqual(await readFile(new URL(`dist/${file}`, root)), await readFile(new URL(`site/${file}`, root)));
}
console.log('Syntax and isolated build checks passed. No network or deployment.');
