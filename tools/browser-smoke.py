"""Offline checks for the four-section site and retained article URLs."""
import argparse
import json
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect

parser = argparse.ArgumentParser()
parser.add_argument('--preview', action='store_true')
parser.add_argument('--screenshots', type=Path)
args = parser.parse_args()
ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / ('preview-dist' if args.preview else 'dist')
catalog = json.loads((OUTPUT / 'catalog.json').read_text())
archive = json.loads((OUTPUT / 'legacy-posts.json').read_text())
scenario = 'normal'
posts = []
threads = []
external = []

def route_request(route):
    request = route.request
    url = urlparse(request.url)
    if url.hostname == 'api.github.com' or url.hostname == 'raw.githubusercontent.com':
        raise AssertionError('Site must read its local catalog/archive, not live GitHub blog data')
    if url.hostname == 'challenges.cloudflare.com' and not args.preview:
        return route.fulfill(content_type='application/javascript', body="window.turnstile={render:(el,o)=>{o.callback('offline-token');return 1},reset:()=>{}};")
    if url.hostname != 'local.test':
        external.append(url.hostname)
        return route.abort()
    if url.path == '/catalog.json':
        if scenario == 'error':
            return route.fulfill(status=503, json={'error': 'offline fixture'})
        return route.fulfill(json={key: [] for key in catalog} if scenario == 'empty' else catalog)
    if url.path == '/legacy-posts.json':
        return route.fulfill(json=archive)
    if url.path == '/api/bbs/config':
        return route.fulfill(json={'ready': not args.preview, 'siteKey': None if args.preview else 'offline-key'})
    if url.path == '/api/bbs':
        if args.preview:
            assert request.method == 'GET'
            return route.fulfill(json={'posts': [{'id': 1, 'name': '試作版のサンプル', 'message': 'サンプル表示', 'created_at': '2026-11-13 00:00:00'}], 'replies': [], 'nextBefore': None})
        if request.method == 'POST':
            body = request.post_data_json
            assert body['token'] == 'offline-token'
            posts.append(body)
            threads.append({'id': 1, 'name': body['name'], 'message': body['message'], 'created_at': '2026-11-13 00:00:00'})
            return route.fulfill(status=201, json={'ok': True, 'id': 1})
        assert request.method == 'GET'
        return route.fulfill(json={'posts': threads, 'replies': [], 'nextBefore': None})
    name = url.path.strip('/') or 'index.html'
    if '.' not in name:
        name += '.html'
    file = (OUTPUT / name).resolve()
    assert file.is_relative_to(OUTPUT.resolve())
    if not file.is_file():
        return route.fulfill(status=404, body='missing')
    mime = {'.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp'}[file.suffix]
    return route.fulfill(body=file.read_bytes(), content_type=mime)

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    context = browser.new_context(service_workers='block')
    context.route('**/*', route_request)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    expected_sections = ['作ったもの', '書いたもの', '現在進行中', '掲示板（BBS）']
    for width in [1280, 740, 390, 320]:
        page.set_viewport_size({'width': width, 'height': 900})
        page.goto('https://local.test/')
        expect(page.locator('nav a')).to_have_count(6)
        expect(page.locator('#contents .tile h3')).to_have_text(expected_sections)
        expect(page.locator('#cms-featured .item-card')).to_have_count(len(catalog['works'][:2]))
        expect(page.locator('#cms-recent')).to_have_count(0)
        expect(page.locator('nav a', has_text='書いたもの')).to_have_attribute('href', 'https://note.com/rcp262626')
        expect(page.locator('#contents a.tile').nth(1)).to_have_attribute('href', 'https://note.com/rcp262626')
        expect(page.locator('.hero-mascot')).to_be_visible()
        assert page.locator('.hero-mascot').evaluate('(image)=>image.complete && image.naturalWidth>0')
        assert page.locator('nav a[href="notes.html"]').count() == 0
        assert page.locator('a[href*="article.html"]').count() == 0
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        if args.screenshots and width in [1280, 390]:
            args.screenshots.mkdir(parents=True, exist_ok=True)
            page.screenshot(path=str(args.screenshots / f'home-{width}.png'), full_page=True)
    for path, heading, kind in [('/works', '作ったもの', 'works'), ('/writings', '書いたもの', 'writings'), ('/projects', '現在進行中', 'projects')]:
        page.goto('https://local.test' + path)
        expect(page.locator('h1')).to_have_text(heading)
        expect(page.locator('.item-card')).to_have_count(len(catalog[kind]))
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        if kind == 'writings':
            assert page.locator('a[href*="article.html"]').count() == 0
            assert page.locator('a.item-card').evaluate_all('(nodes)=>nodes.every(n=>new URL(n.href).hostname==="note.com")')
    scenario = 'empty'
    page.reload()
    expect(page.locator('#cms-projects')).to_contain_text('準備中')
    scenario = 'error'
    page.reload()
    expect(page.locator('#cms-projects')).to_contain_text('読み込めませんでした')
    scenario = 'normal'
    page.goto('https://local.test/notes')
    expect(page.locator('h1')).to_have_text('サイトの入口を整理しました')
    expect(page.locator('#legacy-list a')).to_have_count(len(archive))
    assert archive, 'Expected existing article archive'
    first = archive[0]
    page.goto('https://local.test/article.html?file=' + first['_file'])
    expect(page.locator('#article-title')).to_have_text(first['title'])
    expect(page.locator('#article-body p')).not_to_have_count(0)
    expect(page.locator('#article-body script')).to_have_count(0)
    page.goto('https://local.test/article.html?file=missing.md')
    expect(page.locator('#article-title')).to_have_text('記事が見つかりません')
    page.goto('https://local.test/bbs')
    if args.preview:
        expect(page.locator('#bbs-submit')).to_be_disabled()
        expect(page.locator('.bbs-postname')).to_have_text('試作版のサンプル')
        expect(page.locator('#bbs-form-status')).to_contain_text('試作版では投稿を停止')
        assert not external, external
    else:
        page.locator('#bbs-name').fill('Offline fixture')
        page.locator('#bbs-message').fill('<script>offline</script>')
        page.locator('#bbs-submit').click()
        expect(page.locator('.bbs-posttext')).to_have_text('<script>offline</script>')
        expect(page.locator('.bbs-posttext script')).to_have_count(0)
        assert len(posts) == 1
    page.locator('.nav-toggle').click()
    expect(page.locator('.nav-toggle')).to_have_attribute('aria-expanded', 'true')
    assert not errors, errors
    print('Four-section browser checks passed: 4 widths, note-only links, project lists, legacy URLs, empty/error states and isolated BBS.')
    browser.close()
