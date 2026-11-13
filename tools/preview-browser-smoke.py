"""Offline visual test of preview-dist. Only fake BBS and public local article fixtures."""
from pathlib import Path
import re
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
public_posts = {f.name: f.read_text() for f in (ROOT / 'content/posts').glob('*.md') if re.search(r'^published: true$', f.read_text(), re.M)}
external = []

def route_request(route):
    url = urlparse(route.request.url)
    if url.hostname == 'api.github.com':
        folder = url.path.rsplit('/', 1)[-1]
        return route.fulfill(json=[{'name': name, 'type': 'file', 'download_url': 'https://fixtures.test/' + name} for name in public_posts] if folder == 'posts' else [])
    if url.hostname == 'fixtures.test':
        return route.fulfill(body=public_posts[url.path.strip('/')], content_type='text/plain')
    if url.hostname != 'preview.test':
        external.append(url.hostname)
        return route.abort()
    if url.path == '/api/bbs/config':
        return route.fulfill(json={'ready': False, 'siteKey': None, 'preview': True})
    if url.path == '/api/bbs':
        assert route.request.method == 'GET'
        return route.fulfill(json={'posts': [{'id': 1, 'name': '試作版のサンプル', 'message': 'サンプル表示', 'created_at': '2026-11-13 00:00:00'}], 'replies': [], 'nextBefore': None})
    name = url.path.strip('/') or 'index.html'
    if '.' not in name:
        name += '.html'
    file = (ROOT / 'preview-dist' / name).resolve()
    assert file.is_relative_to((ROOT / 'preview-dist').resolve())
    mime = {'.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css'}[file.suffix]
    return route.fulfill(body=file.read_bytes(), content_type=mime)

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    context = browser.new_context(service_workers='block')
    context.route('**/*', route_request)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    for width in [1280, 390]:
        page.set_viewport_size({'width': width, 'height': 900})
        page.goto('https://preview.test/')
        expect(page.locator('.preview-banner')).to_be_visible()
        expect(page.locator('#cms-recent .item-card')).to_have_count(len(public_posts))
        expect(page.locator('#cms-featured .item-card')).to_have_count(2)
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    page.goto('https://preview.test/bbs')
    expect(page.locator('#bbs-submit')).to_be_disabled()
    expect(page.locator('.bbs-postname')).to_have_text('試作版のサンプル')
    expect(page.locator('#bbs-form-status')).to_contain_text('試作版では投稿を停止')
    assert not external, external
    assert not errors, errors
    print('Preview browser passed: desktop/mobile home, sample BBS, disabled submission, zero third-party requests.')
    browser.close()
