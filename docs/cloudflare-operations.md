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

## 完全バックアップの実行は未承認・未実施

`tools/backup-d1.py` と `.github/workflows/bbs-backup.yml` はローカルで準備済み。このworkflowを含むコミットのpushは自動承認レビューに拒否されており、リモートへ送っていない。実D1のexport、SQL取得、暗号化artifactの保存はまだ行っていない。

拒否理由は、完全な本番DBを別サービスのGitHub Actions artifactへ転送することと、Cloudflareのexport中はDBの他クエリがブロックされ得ることについて、一般的なバックアップ依頼に加え、具体的な許可が必要と判定されたため。本番データの変更・削除ではないが、可用性と保存先を明示して許可を得るまで実行しない。

## 準備した具体的な処理

1. GETで対象Pagesと本番DB bindingを再確認する。
2. そのD1にCloudflare公式export APIを呼び、全テーブルのスキーマとデータをSQLとして取得する。書き出し中は掲示板の読み書きが一時的に待たされる可能性がある。
3. SQLをGitHub runnerのメモリ内でSQLiteへ復元し、整合性・BBSの列・索引・投稿返信の関係を確認する。本番へimportしない。
4. SQL、チェックサム、対象DB、復旧bookmarkを認証付き暗号化で包む。暗号化後の復号とローカル復元をもう一度確認する。
5. **暗号化済みファイルだけ**をGitHub Actions artifactへ90日保存する。公開repoでは他の閲覧者もartifactを取得できる前提とし、SQL平文はログ・artifact・Gitへ出さない。

使用する暗号はcryptographyのHKDF-SHA256とFernet。復号用に専用の `D1_BACKUP_KEY` が登録済みならそれを使い、なければ登録済み `CLOUDFLARE_API_TOKEN` をドメイン分離して鍵導出に使う。**保存時と同じSecretの値が復号に必要**。トークンの失効だけでは保存値が同じなら復号できるが、GitHub Secretの上書き・削除前に既存バックアップを別鍵で再暗号化するか、元の鍵を安全に保管する必要がある。鍵自体は出力しない。

90日を超える独立保管先は未設定。workflowはブランチでの初回実行を想定し、毎日のscheduleはdefault branchにレビュー・マージされた後にのみ有効になる。定期バックアップが稼働済みとは扱わない。

## ローカル検証

架空データで4件のテストに成功。秘密列を含むDBのメモリ復元、認証付き暗号化の往復、異なる鍵での復号拒否、不正な返信やfilesystem ATTACHの拒否、期待するスキーマの欠落検出を確認した。本番exportは権限・SQL互換性を含め未検証。

参考: https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/export/
