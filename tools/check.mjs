import { readFile, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { publicFiles, generatedFiles } from './site-files.mjs';

const root = new URL('../', import.meta.url);
const files = await readdir(new URL('site/', root));
assert.deepEqual([...files].sort(), [...publicFiles].sort());
for (const file of files) {
  if (file.endsWith('.js')) {
    const result = spawnSync(process.execPath, ['--check', new URL(`site/${file}`, root).pathname], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  }
}
const build = spawnSync(process.execPath, ['tools/build.mjs'], { cwd: root, encoding: 'utf8' });
assert.equal(build.status, 0, build.stderr);
const output = (await readdir(new URL('dist/', root))).sort();
assert.deepEqual(output, [...publicFiles, ...generatedFiles].sort(), 'Output must contain only approved public output');
for (const file of files) {
  assert.deepEqual(await readFile(new URL(`dist/${file}`, root)), await readFile(new URL(`site/${file}`, root)));
}
console.log('Syntax and isolated build checks passed. No network or deployment.');
