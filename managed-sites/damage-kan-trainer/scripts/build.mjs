import {cp, mkdir} from 'node:fs/promises';
import {build} from 'esbuild';

await mkdir('dist', {recursive: true});
for (const file of ['index.html', 'style.css', 'THIRD_PARTY_NOTICES.txt']) {
  await cp(`src/${file}`, `dist/${file}`);
}
await build({
  entryPoints: ['src/main.js'],
  outfile: 'dist/game.js',
  bundle: true,
  minify: true,
  target: ['es2020'],
  legalComments: 'eof',
});
