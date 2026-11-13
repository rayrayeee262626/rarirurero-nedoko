# らりるれろの寝床

Cloudflare Pages Advanced Mode（静的サイト + `_worker.js`）、D1、Turnstile、Pages CMSによる個人サイト。

## 構成

- `site/`: ZIPから移したサイト本体。今回、実行コードは変更していない。
- `.pages.yml` / `content/`: 既存のCMS設定・記事。場所・内容は維持。
- `database/schema.sql`: ZIPのD1初期定義。既存本番DBには実行しない。
- `docs/integration-plan.md`: 差分、段階的な統合計画と未確認事項。
- `docs/content-and-backups.md`: 公開下書きの注意とソース・DBのバックアップ手順。
- `docs/bbs-backup-status.md`: 掲示板の救済用コピーと、D1完全バックアップに残る作業。
- `docs/source-zip/`: ZIP付属説明書とSHA-256。説明書は当時の記録であり、本番操作の指示ではない。
- `tools/` / `tests/`: デプロイを行わないビルドとローカル検証。

## ビルドと検証

Node.js 22以上。npmパッケージのインストールは不要。

```sh
npm run check
npm test
npm run build
```

`dist/` に公開用13ファイルだけをコピーする。SQL、記事、CMS設定、資料、秘密ファイルは含めない。予期しないファイルが既にdistにあればエラーで停止し、自動削除しない。

ブラウザ確認はPython、Playwright、Chromiumがある環境で `python tools/browser-smoke.py`。スクリプトは `/usr/bin/chromium` を使用する。全ページ通信を横取りし、GitHub・BBS・Turnstileをモック、FC2・X等を遮断する。本番投稿やカウント増加を伴わない。

## 既存機能

- ブログはブラウザから公開GitHubの `main/content/posts` を読む。CMS更新にサイト再デプロイは不要。下書きもGitHub上では公開される。
- 作品一覧はGitHubの追加データと `content.js` の初期データをマージする。
- BBSは `/api/bbs`、設定は `/api/bbs/config`。`DB` D1 bindingを使用。
- Cloudflare側に `TURNSTILE_SITE_KEY`、secretの `TURNSTILE_SECRET` と `BBS_ADMIN_KEY` が必要。値をGitへ入れない。
- FC2カウンター・X埋め込み・外部noteリンクを維持。

現時点でデプロイ用CIや本番用Wrangler設定は追加していない。`main`へのマージ、Cloudflare設定変更、デプロイ、D1変更は別途の作業。GitHubからの配信方式は既存Cloudflareプロジェクトの設定確認後に決める。
