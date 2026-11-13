# らりるれろの寝床 BBS 版（未デプロイ）

## 追加されたもの
- `bbs.html` : 掲示板（匿名投稿・返信・管理人削除・スマホ対応）
- `_worker.js` : Cloudflare Pages Advanced Mode / 投稿API（D1 + Turnstile）
- `schema.sql` : D1データベース初期設定用
- `bbs.js` : 掲示板の表示と投稿
- `index.html` : FC2カウンター + 掲示板入口
- `app.js` : 全ページのナビゲーションに掲示板を追加

## 公開までに必要な初期設定（無料枠で利用可能）
1. Cloudflareダッシュボード > Storage & databases > D1 でDBを新規作成（例: `nedoko-bbs`）
2. D1のConsoleで `schema.sql` を実行する
3. Workers & Pages > `rarirurero-nedoko` > Settings > Bindings で D1 を選択し、Variable name=`DB` にして作成したDBを結びつける（Production）
4. Cloudflare > Turnstile で `rarirurero-nedoko.pages.dev` に使う無料ウィジェットを作る。Site key / Secret key を確認する。
5. PagesプロジェクトのSettings > Variables and Secrets に次を登録する（Production）。
   - `TURNSTILE_SITE_KEY`: TurnstileのSite key（プレーンテキストで可）
   - `TURNSTILE_SECRET`: TurnstileのSecret key（Secretで登録）
   - `BBS_ADMIN_KEY`: 自分で決めた長い管理人キー（Secretで登録）。16文字以上推奨。
6. ZIPをCloudflare Pagesの既存プロジェクトにドラッグアンドドロップで **新しいProductionデプロイ** としてアップロードする。`_worker.js` はダッシュボードZIPアップロードでもサポートされる。環境変数/Bindingsは変更後に再デプロイが必要なことがある。
7. `https://rarirurero-nedoko.pages.dev/bbs.html` を開いてテスト投稿する。

※ GitHubのREADMEや `.pages.yml` はこのZIPで変更されません。Pages CMSの記事機能はそのままです。
※ `schema.sql` と `README-BBS.md` はZIPに入れているため、サイトにも公開され得ます。個人情報や秘密の鍵は書かれていません。秘密鍵は絶対にソースコードやZIPに追加しないこと。
※ `_worker.js` は既存の全ページに対して動き、静的ページの応答を `env.ASSETS.fetch` に渡します。
