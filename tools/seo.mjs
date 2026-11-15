import { card, escapeHTML, headerMarkup, footerMarkup } from '../site/site-view.js';

export const ORIGIN = 'https://rarirurero-nedoko.pages.dev';
export const SITE_NAME = 'らりるれろの寝床';
export const SITEMAP_PATHS = ['/', '/works', '/projects', '/bbs', '/about'];
export const pageInfo = {
  'index.html': { path: '/', title: `${SITE_NAME} | ゲーム・Webサービスとnote`, description: 'らりるれろの個人サイト。ぷりぽんっ・牌尽などのゲームやWebサービス、noteの文章、制作中のプロジェクトと掲示板への入口をまとめています。' },
  'works.html': { path: '/works', title: `作ったもの | ${SITE_NAME}`, description: 'らりるれろが制作したゲーム・Webサービスの紹介と公開先へのリンク。' },
  'projects.html': { path: '/projects', title: `現在進行中のゲーム・プロジェクト | ${SITE_NAME}`, description: 'らりるれろが開発中のゲームやWebサービス、制作中・休止中のプロジェクトを紹介しています。' },
  'bbs.html': { path: '/bbs', title: `掲示板（BBS） | ${SITE_NAME}`, description: 'らりるれろの寝床の掲示板。作品の感想や雑談、キリ番報告など、匿名で投稿・返信できます。' },
  'about.html': { path: '/about', title: `このサイト・運営者について | ${SITE_NAME}`, description: 'らりるれろの寝床と運営者の紹介。ゲーム・Webサービス制作やnoteでの文章、Xへのリンクをまとめています。' },
  'writings.html': { path: '/writings', title: `note記事の紹介 | ${SITE_NAME}`, description: 'らりるれろがnoteに書いた記事・連載・エッセイの紹介とリンク。記事本文はnoteで公開しています。' },
};

function fillList(html, id, items, kind, heading) {
  const pattern = new RegExp(`<div class="items[^"\\n]*" id="${id}"[^>]*>[\\s\\S]*?</div>`);
  return html.replace(pattern, match => {
    const opening = match.slice(0, match.indexOf('>') + 1).replace('>', ' data-prerendered="true">');
    return opening + (items.map(item => card(item, kind, heading)).join('') || '<p class="mini">ただいま準備中です。</p>') + '</div>';
  });
}

export function enrichPage(name, source, catalog, year = new Date().getUTCFullYear()) {
  let html = source.replace('<div id="site-header"></div>', `<div id="site-header">${headerMarkup('/' + (name === 'index.html' ? '' : name))}</div>`)
    .replace('<div id="site-footer"></div>', `<div id="site-footer">${footerMarkup(year)}</div>`);
  html = fillList(html, 'cms-featured', catalog.works.slice(0, 2), 'works', 'h3');
  html = fillList(html, 'cms-works', catalog.works, 'works', 'h2');
  html = fillList(html, 'cms-projects', catalog.projects, 'projects', 'h2');
  html = fillList(html, 'cms-writings', catalog.writings, 'writings', 'h2');
  // Query-based legacy articles deliberately keep their own old URL semantics.
  const info = pageInfo[name];
  const icon = '<link rel="icon" type="image/png" sizes="96x96" href="/favicon.png">';
  if (!info) return html.replace('</head>', icon + '</head>');
  const titles = catalog.works.map(item => item.title);
  const title = name === 'works.html' && titles.length ? `${titles.slice(0, 2).join('・')} | 作ったもの | ${SITE_NAME}` : info.title;
  const description = name === 'index.html' ? `${SITE_NAME}。${titles.length ? titles.slice(0, 2).join('・') + 'などのゲームやWebサービスを紹介。' : ''}noteの文章、制作中のプロジェクト、掲示板への入口をまとめた個人サイトです。`
    : name === 'works.html' && titles.length ? `${titles.join('、')}。${info.description}` : info.description;
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHTML(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${escapeHTML(description)}">`);
  const url = ORIGIN + info.path;
  const metadata = `${icon}<link rel="canonical" href="${url}">`
    + `<meta property="og:type" content="website"><meta property="og:site_name" content="${SITE_NAME}"><meta property="og:locale" content="ja_JP">`
    + `<meta property="og:title" content="${escapeHTML(title)}"><meta property="og:description" content="${escapeHTML(description)}"><meta property="og:url" content="${url}">`
    + `<meta property="og:image" content="${ORIGIN}/mascot.webp"><meta property="og:image:alt" content="白衣を着た緑色のキャラクター"><meta property="og:image:width" content="1254"><meta property="og:image:height" content="1254">`
    + `<meta name="twitter:card" content="summary"><meta name="twitter:title" content="${escapeHTML(title)}"><meta name="twitter:description" content="${escapeHTML(description)}"><meta name="twitter:image" content="${ORIGIN}/mascot.webp">`;
  const graph = [{ '@type': 'WebSite', '@id': ORIGIN + '/#website', url: ORIGIN + '/', name: SITE_NAME, inLanguage: 'ja' }];
  if (name === 'works.html') graph.push({ '@type': 'ItemList', name: '作ったもの', itemListElement: catalog.works.map((item, index) => ({
    '@type': 'ListItem', position: index + 1, item: { '@type': 'CreativeWork', name: item.title, url: item.url, description: item.description },
  })) });
  const structured = name === 'index.html' || name === 'works.html' ? '<script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c') + '</script>' : '';
  return html.replace('</head>', metadata + structured + '</head>');
}

export function sitemap() {
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + SITEMAP_PATHS.map(path => `  <url><loc>${ORIGIN}${path}</loc></url>`).join('\n') + '\n</urlset>\n';
}
export const robots = `User-agent: *\nAllow: /\n\nSitemap: ${ORIGIN}/sitemap.xml\n`;
