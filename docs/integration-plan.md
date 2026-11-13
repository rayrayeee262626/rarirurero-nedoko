# ZIP起点のソース統合計画と差分

2026-11-13 UTC。対象GitHub: `rayrayeee262626/rarirurero-nedoko`。
基点: `3fc320cf552a7ef5f4dbfecd58b671e3c470bc61`。
作業ブランチ: `codex/integrate-site-source`。

現在、このブランチはローカルのみ。GitHub接続のGit tree作成とGit pushがいずれも403で拒否され、リモートへの反映・PR作成は未完了。接続にリポジトリのContents書き込み権限を付与した後、このブランチをpushする。秘密値をチャットへ貼る必要はない。引き継ぎ用のGit bundleとパッチを別途出力している。

## 今回の作業範囲

ZIPの16ファイルを読み、サイト本体を別ブランチへ統合した。既存の `.pages.yml` と `content/posts` は変更していない。mainの更新、Cloudflareへのデプロイや設定変更、実D1へのSQL実行、投稿・削除は行っていない。DB exportや秘密値もコミットしない。

ZIPには実キー値を含む設定ファイルはなく、WorkerはCloudflareのenvから値を取得する。キー名を文書化するが、値を必要とする作業は行わない。

## 現在のサイトとの差分

公開サイトからGETで取得した次の12ファイルは、ZIPとバイト単位で一致した。

`index.html`, `about.html`, `works.html`, `writings.html`, `notes.html`, `projects.html`, `article.html`, `bbs.html`, `app.js`, `content.js`, `bbs.js`, `styles.css`

拡張子付きHTMLがリダイレクトされる場合は、その最終応答を比較した。カウンターのJSやX埋め込みは取得・実行していない。

`_worker.js` は公開配信から稼働コードを取得できないため、ZIPとの稼働一致を断定できない。`schema.sql` も本番のD1スキーマと照合していない。これらは「デプロイに使ったZIPにある実装」として保存した。

## 統合ブランチに加えた構成

| ZIP／既存パス | 統合先 | 変更内容 |
|---|---|---|
| HTML8本、JS3本、styles.css、_worker.js | `site/` | 13ファイルをそのままコピー。内容変更なし |
| schema.sql | `database/schema.sql` | バイト同一で保存。自動適用しない |
| ZIPのREADME.md、README-BBS.md | `docs/source-zip/` | 元説明書をそのまま保存 |
| 既存README.md | README.md | 構成・検証・運用上の注意を記載 |
| 既存.pages.ymlと記事 | 同じ場所 | 内容変更なし |
| 追加 | tools/build.mjs、tools/check.mjs、package.json | 公開出力をdistへ限定。外部依存・デプロイ処理なし |
| 追加 | tests/worker.test.mjs、tools/browser-smoke.py | 模擬DB・模擬APIで確認。本番データに接続しない |
| 追加 | AGENTS.md、.gitignore、本文書、ZIPハッシュ一覧 | Codexの作業範囲と秘密・生成物の除外を明文化 |

HTML内の相対パスは、ビルドで同じ階層のdistにコピーするため維持される。現在のCMSはrootのcontentを引き続き読む。GitHub上でsiteディレクトリへ移すこと自体は、既存の配信済みサイトに影響しない。

## 機能維持の条件

| 機能 | 維持する実装 | 将来の配信前に確認すること |
|---|---|---|
| ブログ・医学メモ | GitHub mainのcontent/postsを直接取得 | リポジトリの公開性・記事パス維持。main固定なのでPR記事は既存プレビューでは確認不可 |
| CMS | .pages.yml、既存の記事を保持 | Pages CMSアプリの権限と編集ブランチ。ブランチ保護導入との互換性 |
| 作品・外部記事 | content.js内の初期データとGitHub追加データ | 既存タイトルでのマージ規則、外部リンクの維持 |
| BBS | Advanced Modeの_worker.jsとbbs.js | 配信出力直下に_worker.jsがあること、既存DBのbinding名がDBであること |
| D1 | bbs_posts、既存列・索引、親子関係 | 実DBとの定義照合・バックアップ。初期SQLを本番へ再適用しない |
| Turnstile | サーバーsiteverify、クライアントwidget | 既存envと許可hostnameを保持。プレビューは別ウィジェット・別秘密値 |
| 管理削除 | x-admin-keyとサーバー照合 | BBS_ADMIN_KEYの安全な継承。今回削除操作は未検証 |
| FC2カウンター・X | 元のタグとURLを維持 | 試作・自動テストで本番の外部スクリプトを実行しない |

## ZIPで確認できたBBS実装と残る課題

DB bindingは `DB`、表は `bbs_posts`。列はid、parent_id、name、message、created_at、ip_hash。根投稿とレート制限用の索引を持つ。SQLはパラメータbindを使用し、投稿本文はクライアント側textContentで描画する。

Turnstile検証でsuccessを確認する。IPとTurnstile secretをSHA-256で加工し、直近1時間8件、30秒の投稿間隔をチェックする。削除は管理キー照合後、指定IDと直接返信を削除する。

今回は移管の再現性を優先して挙動を変更していない。後続改善として次を扱う。

- IP hashは投稿行に保存され、自動削除・短期化処理はない。「短期間の連投防止」は参照期間の説明であり、保存期間を意味しない。実際のデータ保持方針を決める。
- Turnstileのhostname/actionを明示照合していない。ウィジェットの許可ドメイン設定と併せて確認する。
- レート制限の照会とINSERTが分離しており、同時投稿による上限超過の余地がある。
- 返信は表示ページ全体で200件まで。大量返信の際に省略されても続きを取得できない。
- JSONがnullの場合など、JSON構文は正しいがオブジェクトでない入力の扱いを改善する必要がある。
- 本文上限と名前の上限でUnicodeの数え方が異なる。必要に応じて統一する。
- ナビの現在位置判定が.html前提で、拡張子なしURLでは一致しない。
- CMS日付項目なし・簡易Markdownの対応範囲・公開下書き・GitHub API制限は既存のまま。

これらの修正は別PRで行い、データ構造や表示を変える場合は復旧方法も記載する。

## 段階的な統合・更新計画

### 1. ソース保管の確立（今回）

ZIPを基準にサイト・DB定義・元資料を保管し、コードを変えずビルドと隔離テストを用意する。mainへはまだマージしない。ビルド出力はdistのみであり、ルート全体のアップロードは禁止する。

### 2. Cloudflare側の読み取り確認

既存プロジェクトの作成方式、現在の本番デプロイID、Git連携の有無、本番ブランチ、build/output設定、DB binding、環境変数の名前・種別、Turnstile許可ホストを確認する。秘密値は報告・Gitへ出さない。D1スキーマを読み取りで照合し、既存バックアップの有無・復旧可能期間を確認する。

ZIPの元説明書はダッシュボードによるProduction ZIPアップロードを想定している。ただし実際のアカウント設定は未確認なので、これだけでDirect Uploadと確定しない。

### 3. 配信経路を決める

- 既存プロジェクトがDirect Uploadの場合: GitHubをソースの正とし、将来は承認したGitHub ActionsからWranglerで同じプロジェクトへdistをアップロードする方式が候補。Direct UploadプロジェクトをGit integrationへそのまま変更できると仮定しない。現在のURLとbindingを維持する。
- 既存がGit integrationの場合: 対象repoと本番ブランチを確認し、将来のbuild commandを `npm run build`、outputを `dist`、rootをrepo rootとする設定を検討。
- 今回はWrangler設定、API token、デプロイworkflow、CloudflareのGit連携変更を追加しない。プロジェクト名・DB ID・環境設定の推測で本番設定を生成しない。

将来のCIはまず非配信の検証だけ導入する。デプロイは手動承認付きproduction環境・対象ブランチ・コミットの確認・最小権限資格情報を使う。CMSの記事更新ごとに不要な配信を起動しないよう、変更パスによる分岐も検討する。

### 4. Codexの試作環境を整える

まずローカルの隔離テストを使う。実D1を使う必要があれば別のテストDB・架空データ・別Turnstileを用意する。プレビューに本番DBをbindingしない。FC2・Xを遮断し、CMS記事もテスト用refへ切り替える手段を別PRで実装する。既存公開サイトのmain参照は維持する。

### 5. 本番反映前の条件

現行コード・設定・デプロイIDの記録、D1 exportと復旧手順、既知の正常デプロイの確認、テスト環境でのAPI・返信・認証・管理操作確認を完了する。CMSの更新と競合しないよう最新mainを取り込む。承認後に対象コミットのみ配信し、読み取りで確認する。DB変更は別作業とする。

### 6. 戻し方

ソースはPRのrevert、Pagesは既知の正常デプロイへのrollback、記事はGitHubの該当変更のrevert。これらはD1を戻さない。D1の復旧は独立バックアップ／Time Travelと必要投稿の保全計画を用いて別途実施する。FC2も別サービスのためGitやD1からは復元できない。

## 今回の検証

- 公開静的ファイル12本: ZIPと完全一致。
- site内13ファイル、database/schema.sql、元README2本: ZIPのSHA-256と一致。
- `.pages.yml` と既存content: 基点コミットと同一。
- `npm run check`: JS構文、distの公開ファイル限定、コピー元と出力の一致を確認。
- `npm test`: 9件。静的配信委譲、設定の準備状態・秘密値非公開、DB未設定、ページ指定検証、公開GET・ページング、異なるOrigin拒否、認証トークン欠落、管理設定欠落を模擬envで確認。
- Python SQLiteのメモリDB: 初期SQLと親子削除を確認。本番D1での試験ではない。
- Playwright/Chromium: 8ページ、記事リンク・HTMLエスケープ、模擬BBS投稿、390px幅のナビ・横はみ出しを確認。ページの外向き通信をすべて横取りし、本番BBS・Turnstile・FC2に接続していない。

本番Workerの一致、実D1の定義・データ、実Turnstileの成功経路、実管理削除、Cloudflareビルド・デプロイは未検証。ローカル検証の成功は本番設定が正しいことの保証ではない。

## 参照

- https://developers.cloudflare.com/pages/functions/advanced-mode/
- https://developers.cloudflare.com/pages/get-started/direct-upload/
- https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/
- https://developers.cloudflare.com/d1/reference/time-travel/
