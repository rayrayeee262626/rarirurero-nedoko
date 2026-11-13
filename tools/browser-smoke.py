"""Optional: Python + Playwright + Chromium; all page traffic is intercepted offline."""
import json
import sys
import re
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
POST = '---\ntitle: Offline fixture\ncategory: blog\npublished: true\n---\n# Fixture\n<script>alert(1)</script>\n[Link](https://example.test/)\n'
fixtures = {
    'fixture.md': POST,
    'hidden-project.md': '---\ntitle: ぷりぽんっ -Print PON!-\nvisible: false\nstatus: published\n---\n',
    '2026-11-12-older.md': '---\ntitle: Older article\ncategory: medical\npublished: true\n---\nOlder body',
    '2026-11-13-newer.md': '---\ntitle: Newest article\ncategory: blog\npublished: true\n---\nNewest body',
    '2026-11-14-draft.md': '---\ntitle: Hidden draft\ncategory: blog\npublished: false\n---\nHidden body',
}
scenario = 'normal'
preview_source = False
threads = []
external = []
posts = []

def route_request(route):
    request = route.request
    url = urlparse(request.url)
    if url.hostname == 'api.github.com':
        folder = url.path.rsplit('/', 1)[-1]
        if scenario == 'error':
            return route.fulfill(status=503, json={'message': 'offline error fixture'})
        if preview_source:
            data = [{'name': f.name, 'type': 'file', 'download_url': 'https://fixtures.test/' + f.name} for f in (ROOT / 'content/posts').glob('*.md') if re.search(r'^published: true$', f.read_text(), re.M)] if folder == 'posts' else []
        else:
            data = [{'name': name, 'type': 'file', 'download_url': 'https://fixtures.test/' + name} for name in fixtures if name != 'hidden-project.md'] if folder == 'posts' and scenario != 'empty' else []
        if folder == 'projects' and scenario == 'hidden':
            data = [{'name': 'hidden-project.md', 'type': 'file', 'download_url': 'https://fixtures.test/hidden-project.md'}]
        return route.fulfill(json=data)
    if url.hostname == 'fixtures.test':
        name = url.path.rsplit('/', 1)[-1]
        body = (ROOT / 'content/posts' / name).read_text() if preview_source else fixtures[name]
        return route.fulfill(body=body, content_type='text/plain')
    if url.hostname == 'challenges.cloudflare.com':
        return route.fulfill(content_type='application/javascript', body="window.turnstile={render:(el,o)=>{o.callback('offline-token');return 1},reset:()=>{}};")
    if url.hostname != 'local.test':
        external.append(url.hostname)
        return route.abort()
    if url.path == '/api/bbs/config':
        return route.fulfill(json={'ready': True, 'siteKey': 'offline-public-key'})
    if url.path == '/api/bbs':
        if request.method == 'POST':
            body = request.post_data_json
            assert body['token'] == 'offline-token'
            posts.append(body)
            threads.append({'id': 1, 'name': body['name'], 'message': body['message'], 'created_at': '2026-11-13 00:00:00'})
            return route.fulfill(status=201, json={'ok': True, 'id': 1})
        assert request.method == 'GET', 'Only mocked GET/POST allowed'
        return route.fulfill(json={'posts': threads, 'replies': [], 'nextBefore': None})
    name = url.path.strip('/') or 'index.html'
    if '.' not in name:
        name += '.html'
    file = (ROOT / 'dist' / name).resolve()
    assert file.is_relative_to((ROOT / 'dist').resolve())
    if not file.is_file():
        return route.fulfill(status=404, body='missing')
    mime = {'.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css'}[file.suffix]
    route.fulfill(body=file.read_bytes(), content_type=mime)

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    context = browser.new_context(service_workers='block')
    context.route('**/*', route_request)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    for path in ['/', '/works', '/projects', '/notes', '/about']:
        page.goto('https://local.test' + path)
        expect(page.locator('h1')).to_be_visible()
        expect(page.locator('nav a')).to_have_count(7)
    page.goto('https://local.test/')
    expect(page.locator('#cms-recent .item-card')).to_have_count(3)
    expect(page.locator('#cms-recent .item-card').first).to_contain_text('Newest article')
    expect(page.locator('#cms-recent')).not_to_contain_text('Hidden draft')
    expect(page.locator('#cms-featured .item-card')).to_have_count(2)
    assert page.locator('#cms-recent').evaluate('(el) => el.getBoundingClientRect().top') < page.locator('.feed').evaluate('(el) => el.getBoundingClientRect().top')
    expect(page.locator('nav a[aria-current="page"]')).to_have_text('ホーム')
    scenario = 'hidden'
    page.reload()
    expect(page.locator('#cms-featured .item-card')).to_have_count(1)
    expect(page.locator('#cms-featured')).not_to_contain_text('ぷりぽんっ')
    scenario = 'empty'
    page.reload()
    expect(page.locator('#cms-recent')).to_contain_text('記事は準備中')
    scenario = 'error'
    page.reload()
    expect(page.locator('#cms-recent')).to_contain_text('読み込めませんでした')
    expect(page.locator('#cms-featured')).to_contain_text('読み込めませんでした')
    scenario = 'normal'
    page.goto('https://local.test/writings')
    expect(page.get_by_text('Offline fixture', exact=True)).to_be_visible()
    expect(page.locator('nav a[aria-current="page"]')).to_have_text('ブログ・エッセイ')
    page.goto('https://local.test/article.html?file=2026-11-14-draft.md')
    expect(page.locator('#article-title')).to_have_text('この記事は公開されていません')
    page.goto('https://local.test/article.html?file=2026-11-12-older.md')
    expect(page.locator('#article-back')).to_have_attribute('href', 'notes.html')
    page.goto('https://local.test/article.html?file=fixture.md')
    expect(page.locator('#article-title')).to_have_text('Offline fixture')
    expect(page.locator('#article-body script')).to_have_count(0)
    expect(page.locator('#article-body a')).to_have_attribute('href', 'https://example.test/')
    page.set_viewport_size({'width': 390, 'height': 844})
    page.goto('https://local.test/bbs')
    page.locator('#bbs-name').fill('Offline fixture')
    page.locator('#bbs-message').fill('<script>offline</script>')
    page.locator('#bbs-submit').click()
    expect(page.locator('.bbs-posttext')).to_have_text('<script>offline</script>')
    expect(page.locator('.bbs-posttext script')).to_have_count(0)
    assert len(posts) == 1
    page.locator('.nav-toggle').click()
    expect(page.locator('.nav-toggle')).to_have_attribute('aria-expanded', 'true')
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    assert not errors, errors
    print('Offline Chromium smoke passed: 8 pages, blog rendering, mocked BBS posting, mobile navigation. All external traffic intercepted.')
    print('Blocked third-party hosts:', ', '.join(sorted(set(external))))
    if '--screenshots' in sys.argv:
        output = Path(sys.argv[sys.argv.index('--screenshots') + 1])
        output.mkdir(parents=True, exist_ok=True)
        preview_source = True
        for label, width in [('desktop', 1280), ('mobile', 390)]:
            page.set_viewport_size({'width': width, 'height': 900})
            page.goto('https://local.test/')
            expect(page.locator('#cms-recent .item-card')).to_have_count(1)
            expect(page.locator('#cms-featured .item-card')).to_have_count(2)
            page.screenshot(path=str(output / ('home-' + label + '.png')), full_page=True)
        print('Screenshots saved using existing public article; external embeds blocked.')
    browser.close()
