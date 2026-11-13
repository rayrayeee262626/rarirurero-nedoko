"""Optional: Python + Playwright + Chromium; all page traffic is intercepted offline."""
import json
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
POST = '---\ntitle: Offline fixture\ncategory: blog\npublished: true\n---\n# Fixture\n<script>alert(1)</script>\n[Link](https://example.test/)\n'
threads = []
external = []
posts = []

def route_request(route):
    request = route.request
    url = urlparse(request.url)
    if url.hostname == 'api.github.com':
        folder = url.path.rsplit('/', 1)[-1]
        data = [{'name': 'fixture.md', 'type': 'file', 'download_url': 'https://fixtures.test/fixture.md'}] if folder == 'posts' else []
        return route.fulfill(json=data)
    if url.hostname == 'fixtures.test':
        return route.fulfill(body=POST, content_type='text/plain')
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
    page.goto('https://local.test/writings')
    expect(page.get_by_text('Offline fixture', exact=True)).to_be_visible()
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
    browser.close()
