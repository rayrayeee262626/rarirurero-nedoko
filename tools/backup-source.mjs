import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
function git(args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || 'git command failed');
  return result.stdout.trim();
}
if (git(['status', '--porcelain'])) throw new Error('Commit or preserve local changes first; a bundle contains committed history only.');
const dir = new URL('backups/', root);
await mkdir(dir, { recursive: true });
const name = `source-${new Date().toISOString().replace(/[:.]/g, '-')}.bundle`;
const file = new URL(name, dir);
git(['bundle', 'create', fileURLToPath(file), '--all']);
git(['bundle', 'verify', fileURLToPath(file)]);
const digest = createHash('sha256').update(await readFile(file)).digest('hex');
await writeFile(new URL(`${name}.sha256`, dir), `${digest}  ${name}\n`);
console.log(`Verified source history backup: ${fileURLToPath(file)}`);
console.log('Copy the bundle and checksum to independent protected storage. This does not back up D1, Cloudflare settings, or FC2.');
