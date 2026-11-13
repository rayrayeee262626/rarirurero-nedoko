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
5. 本番への反映は別途依頼・承認後、`deployment/approved-release.json` の対象ファイルハッシュを更新してテストする。手動のproduction workflowへ、レビュー済みmainの完全一致コミットをexpected_commitとして指定する。push・マージだけでは本番配信しない。

production workflowは直前の暗号化BBSバックアップを保存してから既存本番へdistのみを配信する。DB binding・変数を照合し、公開ファイル・BBS readiness・既存表示投稿を確認する。検証失敗時は直前の本番配信へrollbackし、D1は復元しない。

## 本番反映記録（2026-11-13 14:02 UTC）

ユーザーが試作版の配色を確認し、本番反映を明示承認。承認済み配色とホームの新着・作品表示を本番へ反映した。掲示板Worker・bbs.js・schema.sqlは元ZIPと同一、CMS設定・既存記事も変更していない。FC2・Xの既存タグも維持した。

- 成功実行: https://github.com/rayrayeee262626/rarirurero-nedoko/actions/runs/43438940071
- 配信コミット: `535cadbcdc8df5046971d6fa1533ff5f8235a289`
- 本番配信ID: `d46de83a-1217-4762-a626-e37390683ea9`
- 直前の復旧先ID: `14bc87e4-1633-4c05-87ab-7615f037f842`
- 直前の暗号化バックアップ: `encrypted-pre-release-backup-43438940071`、保管期限2027-02-11 UTC。

公開静的ファイル12本が承認済みハッシュと一致、DB bindingと環境変数が不変、BBS readinessとTurnstile設定が不変、以前の表示投稿が保持されていることを確認した。本番への投稿・削除・D1書き込みは実施していない。

最初の試行は公開GET確認で停止し、アップロード前だった。確認方法を修正した再実行で成功。実行時のrollbackは不要だった。

preview workflowは配信前に、別プロジェクトの本番・プレビュー両設定にDB・KV・R2・サービスbinding・環境変数がないことを確認する。不審な既存設定があれば勝手に消さず停止する。

## GitHubとCloudflareの関係

現行本番PagesはGit integrationを持たないことをAPIで確認済み。GitHubのmainへソースをまとめても、本番への配信は発生しない。ただしブログ本文は元からGitHub mainを閲覧時に取得するため、記事の変更は別途表示に影響する。今回、既存記事・CMS設定は変更していない。

最初の試作配信成功: https://github.com/rayrayeee262626/rarirurero-nedoko/actions/runs/43430546600

バックアップ・試作配信ともSecret値をチャット・Git・ログへ出さない。SQL平文をartifactへ保存しない。
