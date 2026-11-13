# らりるれろの寝床

Cloudflare Pagesで配信する個人サイト。ソース・紹介文・リンク情報をこのGitHubリポジトリで管理する。

## 4つのメインコンテンツ

- **作ったもの**: 公開済みのゲーム・Webサービスとリンク。
- **書いたもの**: https://note.com/rcp262626 へ直接リンク。本文はnoteで管理する。従来の紹介ページは旧URLの互換用に残す。
- **現在進行中**: 制作中・休止中のゲームやプロジェクト。
- **掲示板（BBS）**: 既存のD1・Turnstileによる投稿・返信。

ホーム・運営者紹介、FC2カウンター、X・noteリンクも維持する。

## 編集する場所

| 対象 | ファイル | 編集方法 |
|---|---|---|
| 作品・制作中 | `content/projects/*.md` | title/status/visible/url/descriptionを編集。publishedは作品一覧、developing/pausedは現在進行中へ表示 |
| note記事の紹介 | `content/writings/*.md` | title/url/description/visibleを編集。本文はnote側 |
| サイト表示 | `site/` | HTML/CSS/JavaScript |
| 旧記事 | `content/posts/*.md` | 保存用。データを削除しない |
| CMS | `.pages.yml` | 作品・制作中とnote紹介の編集欄。ブログ投稿欄は廃止 |

同じファイルを編集すればタイトルを変えても重複しない。非表示は `visible: false`。新しい項目はファイルを追加し、公開できる内容だけを `visible: true` にする。公開GitHubにある情報は、非表示でも秘密にはならない。

ビルドで `catalog.json` を生成する。ブラウザは公開GitHub APIやCMSの下書きを直接読まない。CMSからの紹介文変更にも、試作確認と再ビルド・配信が必要。記事本文の新規投稿・表示機能はない。

## ビルドと検証

Node.js 22以上。npmパッケージのインストールは不要。

```sh
npm run check
npm test
npm run build:preview
node tests/preview.test.mjs
```

`tools/site-files.mjs` に定義した公開ファイルと生成JSONだけをdistへ出力する。SQL、CMS設定、資料、Markdown元ファイル、秘密ファイルは配信しない。保存版JSONにも公開済み記事だけを含める。

ブラウザ確認はPython・Playwright・Chromiumのある環境で `python tools/browser-smoke.py` または `python tools/preview-browser-smoke.py`。ページの外向き通信を遮断し、BBS・Turnstileはモックする。

## 古い記事URL

サイト独自ブログと「残しておきたい話」のメイン導線を廃止した。既存データは同じパスに保持し、以前の公開記事はビルド時に保存版JSONへまとめる。`article.html?file=既存ファイル名.md` から読める。`notes.html` は構成変更の案内と保存記事への入口として残す。これは過去リンクの互換用で、新規ブログ投稿機能ではない。

## 本番・試作・バックアップ

- 本番URLは https://rarirurero-nedoko.pages.dev/ を維持する。
- 試作は https://rarirurero-nedoko-preview.pages.dev/ 。本番D1や秘密値に接続せず、BBSはサンプル表示・投稿削除不可。カウンターは加算しない。
- 本番配信は明示承認後の手動workflowのみ。`deployment/approved-release.json` にはユーザー承認済み17ファイルのハッシュを記録する。今回の再構成は2026-11-13に承認・本番反映済み。
- BBSの暗号化バックアップは既存の日次workflowを維持。D1スキーマをビルドから適用しない。
- `TURNSTILE_SECRET`、`BBS_ADMIN_KEY`、接続トークンをGitへ入れない。

運用は [日常運用](docs/daily-operations.md)、今回の変更は [4コンテンツへの整理](docs/four-sections.md) を参照。
