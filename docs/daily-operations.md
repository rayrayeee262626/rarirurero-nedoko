# 今後の更新・バックアップ

## 公開URL

- 本番: https://rarirurero-nedoko.pages.dev/
- 試作: https://rarirurero-nedoko-preview.pages.dev/

試作版は別のPagesプロジェクト。全ページに試作バナーとnoindexを付け、BBSは架空サンプルのみで投稿・削除を拒否する。本番D1、Turnstile秘密鍵、管理人キーを接続しない。FC2、X埋め込み、外部フォントも読み込まない。記事一覧は既存の公開GitHub mainの記事を読み、publishedがtrueの記事だけを表示する。

## 毎日の掲示板バックアップ

2026-11-13に `.github/workflows/bbs-backup.yml` をdefault branchへ統合し、毎日18:23 UTC（日本時間03:23）の実行設定を有効化した。GitHub側の混雑で開始が遅れることがある。暗号化したartifactは各回90日保存する。GitHub Actions画面から手動でも実行でき、CodexもGitHub経由で実行・確認できる。

標準ブランチの同じ設定で手動の初回実行に成功: https://github.com/rayrayeee262626/rarirurero-nedoko/actions/runs/43431016989 。次回以降のschedule実行は今後の履歴で確認する。実行した時点で本番ホームが以前とバイト同一であることも確認した。

本番D1には単一SELECTのみを送り、書き込みSQLやDBロックを使わない。実スキーマ、全BBS列、投稿・返信、採番情報をまとめて取得し、SQLiteメモリ内で整合性・復元を検証してから暗号化する。未知の追加表・列があれば停止して、不完全なバックアップを成功扱いしない。

実行が失敗した場合はGitHubの通知とActions履歴で確認する。公開リポジトリでは長期間活動がないとGitHubがscheduleを停止することがあるため、運用時に直近成功を確認する。90日を超える保管先は別途必要。

**現在はCLOUDFLARE_API_TOKENの保存値を復号鍵の材料に使用する。Secretの削除・上書き前に既存バックアップの復号鍵保全または再暗号化が必要。** 詳細は [接続と復旧記録](cloudflare-operations.md)。

## Codexからの更新

1. 作業ブランチで変更し、`npm run check`、`npm test` と変更に必要な検証を行う。
2. `npm run build:preview` と `node tests/preview.test.mjs`、必要なら `python tools/preview-browser-smoke.py` で分離を確認する。
3. preview workflowを対象ブランチで手動実行する。配信先はコード中で試作プロジェクトに固定され、本番への切替入力はない。
4. 試作URLと検証結果をユーザーに提示する。
5. 本番への反映は別途依頼・承認後に行う。今回、本番配信用workflowは追加していない。

preview workflowは配信前に、別プロジェクトの本番・プレビュー両設定にDB・KV・R2・サービスbinding・環境変数がないことを確認する。不審な既存設定があれば勝手に消さず停止する。

## GitHubとCloudflareの関係

現行本番PagesはGit integrationを持たないことをAPIで確認済み。GitHubのmainへソースをまとめても、本番への配信は発生しない。ただしブログ本文は元からGitHub mainを閲覧時に取得するため、記事の変更は別途表示に影響する。今回、既存記事・CMS設定は変更していない。

最初の試作配信成功: https://github.com/rayrayeee262626/rarirurero-nedoko/actions/runs/43430546600

バックアップ・試作配信ともSecret値をチャット・Git・ログへ出さない。SQL平文をartifactへ保存しない。
