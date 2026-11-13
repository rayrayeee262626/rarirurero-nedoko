import { readdir, readFile } from 'node:fs/promises';

function scalar(value) {
  value = value.trim();
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null') return null;
  if (value.startsWith('"') && value.endsWith('"')) return JSON.parse(value);
  if (value.startsWith("'") && value.endsWith("'")) return value.slice(1, -1).replace(/''/g, "'");
  return value;
}
export function parseMarkdown(source) {
  const match = source.match(/^\uFEFF?---\s*\r?\n([\s\S]*?)\r?\n---\s*\r?\n?/);
  const meta = {};
  if (match) {
    let key, multiline = false;
    for (const line of match[1].split(/\r?\n/)) {
      const field = line.match(/^([\w-]+):\s*(.*)$/);
      if (field) {
        key = field[1];
        multiline = /^[>|][-+]?\s*$/.test(field[2]);
        meta[key] = multiline ? '' : scalar(field[2]);
      } else if (multiline && key && /^\s+/.test(line)) meta[key] += line.trim() + '\n';
    }
  }
  return { ...meta, body: (match ? source.slice(match[0].length) : source) || meta.body || '' };
}
export async function readCollection(root, folder) {
  const directory = new URL(`content/${folder}/`, root);
  let names;
  try { names = await readdir(directory); } catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  return Promise.all(names.filter(name => name.endsWith('.md')).sort().map(async name => ({
    ...parseMarkdown(await readFile(new URL(name, directory), 'utf8')), id: name.slice(0, -3), _file: name,
  })));
}
export function compileCatalog(projects, writings) {
  const visible = items => items.filter(item => item.visible === true);
  const normalize = (item, note = false) => {
    if (typeof item.title !== 'string' || !item.title.trim()) throw new Error(`Missing title: ${item.id}`);
    let url = '';
    if (item.url) {
      const parsed = new URL(item.url);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error(`Unsupported URL: ${item.id}`);
      if (note && (parsed.protocol !== 'https:' || !['note.com', 'www.note.com'].includes(parsed.hostname))) throw new Error(`Writing must link to note: ${item.id}`);
      url = parsed.href;
    }
    if ((note || ['published', 'completed'].includes(item.status)) && !url) throw new Error(`Public item needs URL: ${item.id}`);
    if (!note && !['published', 'completed', 'developing', 'paused'].includes(item.status)) throw new Error(`Invalid project status: ${item.id}`);
    return { id: item.id, title: item.title, description: String(item.description || ''), url, ...(note ? {} : { status: item.status }) };
  };
  const all = visible(projects).map(item => normalize(item));
  return {
    works: all.filter(item => ['published', 'completed'].includes(item.status)),
    projects: all.filter(item => ['developing', 'paused'].includes(item.status)),
    writings: visible(writings).map(item => normalize(item, true)),
  };
}
export function compileArchive(posts) {
  return posts.filter(post => post.published === true).map(post => ({
    _file: post._file, title: String(post.title || '無題'), category: String(post.category || ''),
    date: String(post.date || post._file.match(/^(\d{4}-\d{2}-\d{2})-/)?.[1] || ''), body: post.body,
  }));
}
