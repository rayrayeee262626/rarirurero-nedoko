# Cloudflare接続と完全バックアップの準備状態

## 確認済み

2026-11-13、GitHub Actionsの登録済みSecretを使ったGET限定の確認が成功した。

- 対象は `rarirurero-nedoko.pages.dev` の既存Pagesプロジェクト。
- 提示されたアカウントIDを直接指定し、アカウント一覧を読む追加権限は不要にした。
- トークンはactive。Pages設定と本番 `DB` bindingが指すD1のメタデータを読み取れた。
- 現行プロジェクトはGit integrationを持たず、本番デプロイは存在する。
- 秘密値・生のAPI応答・D1内容をログへ出していない。
- 接続確認の成功実行: https://github.com/rayrayeee262626/rarirurero-nedoko/actions/runs/43427532568

これでGitHub Actions経由の接続経路は確認できた。ただし、PagesデプロイやD1 exportの成功を実証したものではない。デプロイ用workflowはまだ作っておらず、本番更新はしていない。

## 掲示板バックアップ完了（2026-11-13）

ユーザーが、全データを暗号化してGitHubへ90日保存することと、書き出し中の一時的な応答停止の可能性を明示的に承認。その後に実行した。

公式export APIはD1 ReadではHTTP 401となったため、権限を広げず、公式query APIに単一の読み取りSELECTを送る方式へ変更した。この方式は本番への書き込み・DBロック操作・復元を行わない。

- 本番DB bindingから対象DBを特定した。
- 1つのSELECTで、実際のアプリケーションスキーマ、bbs_postsの全列（ip_hashを含む）、全3行（親2・返信1）、sqlite_sequenceの採番情報を取得。
- ユーザーテーブルがbbs_postsだけであること、列が想定の全6列であることを確認。追加テーブル・追加列・想定外のschema objectがあれば、不完全なコピーを成功扱いせず停止する。
- 取得データをSQLiteのメモリDBへ組み立て、全列の一致・採番情報・整合性・返信関係を確認した。
- 認証付き暗号化後、復号と再復元を確認。SQL・秘密値・IPハッシュはログや公開Gitへ出していない。
- 暗号化ファイルだけをGitHub Actions artifactへ90日保存。今回の有効期限は2027-02-11 UTC。
- 保存済みartifactをコネクタ経由で取得し、SHA-256一致を再確認。暗号化済みの別コピーを保護された作業領域にも保存した。

成功実行: https://github.com/rayrayeee262626/rarirurero-nedoko/actions/runs/43428987189

artifact: `encrypted-d1-backup-43428987189`。SQL平文のartifactは作っていない。

これは掲示板アプリケーションのスキーマ・全データのバックアップ。Cloudflareの内部管理テーブル、Pagesの設定や秘密値、FC2カウントは含まない。DBへ復元可能なSQLを保持するが、本番D1へのimportやテスト用D1の新規作成は実施していない。

### 暗号鍵の取り扱い

cryptographyのHKDF-SHA256とFernetを使用。専用の `D1_BACKUP_KEY` が未登録のため、今回の復号鍵はGitHub Secretの `CLOUDFLARE_API_TOKEN` からドメイン分離して導出した。**保存時と同じSecretの値が復号に必要**。キー自体は出力していない。

GitHub Secretを上書き・削除する前に、元の鍵を安全に保管するか、既存バックアップを別鍵で再暗号化すること。Cloudflare側のトークン失効と、復号用に保存値を保持することは別。将来は専用バックアップ鍵への移行を推奨する。

### 復旧の流れ

1. artifactの暗号化ファイル・チェックサムを取得する。
2. 保存時と同じSecretが利用できる保護された実行環境で、`tools/backup-d1.py` の `unseal` を呼ぶ。秘密値を引数やログに出さない。
3. 復号JSONのsql_base64からSQLをメモリ内で取り出し、sql_sha256と照合する。
4. `validate_sql` を使い、まずSQLiteメモリDBへ復元して検証する。
5. 必要なら本番と分離したD1へimportする。SQLite dumpのBEGIN/COMMITラッパーはD1 import向けに調整し、対象DBを再確認する。
6. 本番への復元は別途明示的な承認後に行う。バックアップ以後の投稿の救出・重複処理・復旧後の読み取り確認も計画する。

### 未完了と改善点

- 定期scheduleは2026-11-13にPR #5でdefault branchへ統合して有効化済み。標準ブランチでの初回手動実行も成功した。毎日のschedule実行は今後の履歴で確認する。詳細は [日常運用](daily-operations.md)。
- 90日を超える独立保管先・自動転送・専用の復号鍵は未設定。
- 実DBにはZIPのschema.sqlに記載された名前の2索引が揃っていない。バックアップは実DBの構造をそのまま保存し、本番索引は変更していない。必要性を確認したうえで別作業として扱う。
- 本番サイトへのデプロイや本番設定変更は実施していない。別プロジェクトへの試作配信は成功し、 https://rarirurero-nedoko-preview.pages.dev/ で確認できる。試作に本番DBや秘密値はbindingしない。

参考: https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/query/
