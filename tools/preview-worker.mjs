// Preview-only router: no DB, secret, Turnstile, or production API is accessed.
const headers = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' };
export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path === '/api/bbs' || path === '/api/bbs/config') {
      if (request.method !== 'GET') return new Response(JSON.stringify({ error: '試作版では投稿・削除できません。' }), { status: 405, headers });
      const data = path.endsWith('/config') ? { ready: false, siteKey: null, preview: true } : {
        posts: [{ id: 1, name: '試作版のサンプル', message: 'ここは見た目の確認用です。本番の掲示板の投稿・データにはつながっていません。', created_at: '2026-11-13 00:00:00' }],
        replies: [], nextBefore: null,
      };
      return new Response(JSON.stringify(data), { headers });
    }
    const response = await env.ASSETS.fetch(request);
    const safe = new Response(response.body, response);
    safe.headers.set('x-robots-tag', 'noindex, nofollow');
    return safe;
  },
};
