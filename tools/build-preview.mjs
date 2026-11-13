import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { publicFiles } from './build.mjs';

const root = new URL('../', import.meta.url);
const output = new URL('preview-dist/', root);
await mkdir(output, { recursive: true });
const allowed = [...publicFiles, '_headers'];
if ((await readdir(output)).some(name => !allowed.includes(name))) throw new Error('Unexpected preview output; use a fresh directory.');
for (const name of publicFiles) {
  let text = await readFile(new URL(`dist/${name}`, root), 'utf8');
  if (name === '_worker.js') text = await readFile(new URL('tools/preview-worker.mjs', root), 'utf8');
  if (name.endsWith('.html')) {
    text = text.replace(/<script\b[^>]*\bsrc=["']https?:\/\/[^"']+["'][^>]*>[\s\S]*?<\/script>/gi, '');
    text = text.replace(/<div class="retro-counter">[\s\S]*?<div class="tagline">/, '<p class="mini">試作版ではアクセス数を加算しません。</p><div class="tagline">');
    text = text.replace('<head>', '<head><meta name="robots" content="noindex,nofollow">');
    text = text.replace('<body>', '<body><aside class="preview-banner">試作版です。掲示板はサンプル表示・投稿停止中です。 <a href="https://rarirurero-nedoko.pages.dev/">公開中のサイトへ →</a></aside>');
  }
  if (name === 'styles.css') {
    text = text.replace(/@import\s+url\([^)]*\)\s*;/g, '');
    text += '\n.preview-banner{padding:10px 20px;background:#fff1cc;border-bottom:1px solid #dfc88f;text-align:center;font-size:13px}.preview-banner a{text-decoration:underline;color:#315d45}\n';
  }
  if (name === 'bbs.js') text = text.replace('現在、掲示板の初期設定中です。投稿はまだできません。', '試作版では投稿を停止しています。本番の投稿には影響しません。');
  await writeFile(new URL(name, output), text);
}
await writeFile(new URL('_headers', output), `/*
  X-Robots-Tag: noindex, nofollow
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://api.github.com https://raw.githubusercontent.com; img-src 'self' data:; frame-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'
`);
console.log('Prepared isolated preview: no production BBS, counter, X scripts, or external fonts.');
