# サイトマップ取得エラーの調査（2026-11-15 UTC）

所有者の画面では所有権確認完了、トップのライブ検査は登録可能。しかしサイトマップは取得失敗、インデックス登録リクエストは日をまたいで割り当て量超過。登録リクエストの再試行は中止。

## 確認結果

- https://print-pon.pages.dev/sitemap.xml はリダイレクトなしHTTP 200、application/xml、UTF-8、正しいsitemaps.org名前空間。14 URL、重複なし、同じHTTPSホスト。
- 通常UA、Googlebot、Google-InspectionToolでXMLを取得できる。UA偽装だけでGoogleの到達成功とは扱わない。
- robots.txtは取得200、クロール許可、正しいサイトマップURLを記載。
- 全14 URLがHTTP 200、自己canonical、インデックス許可。トップの静的a要素から全14 URLへ到達。JavaScript実行や折りたたみを開く操作は不要。
- この環境とGitHub Actionsの別ネットワークで診断成功。診断はHTML/XMLを取得するだけで、解析スクリプトや操作イベントを実行しない。
- Google公式Rich Results Testからもサイトマップをクロール成功（Nov 15 2026 01:11:34 UTC）。No items detectedはXMLにリッチリザルトがないという結果であり、取得失敗ではない。

Google公式結果： https://search.google.com/test/rich-results/result?id=bSiDUKonz-OkxkoMo114lA
独立診断： https://github.com/rayrayeee262626/rarirurero-nedoko/actions/runs/43661889166

## 判断と残る確認

公開配信上の不具合は再現しなかった。Search Consoleの取得失敗の原因は未特定で、修正済みとはしない。HTTP正常・Google公開テスト成功も、GoogleのSitemaps処理成功や実際のインデックス登録を保証しない。

原因の証拠なくXMLの名前・構造・URLを差し替えたり、robots・セキュリティ設定を緩めたりしない。サイトの見た目・計算機能・解析・公開ファイルは無変更、再デプロイなし。追加したのは再実行可能な読み取り専用の運用診断だけ。

本人操作はSearch Consoleの「サイトマップ」で、既存URL https://print-pon.pages.dev/sitemap.xml を1回だけ再送信して再取得を依頼すること。これはインデックス登録リクエストとは別。削除や繰り返し送信は不要。成功または新しい取得日時・エラーの変化を確認する。引き続き同じ失敗なら追加再送は止め、更新された取得日時と詳細を調べる。こちらにSearch Console認証がないため、Google側の処理結果を直接確認・操作できない。

## 再実行

GitHub Actionsの Audit Print PON sitemap discovery → Run workflow。または `python docs/print-pon-sitemap-audit/audit.py`。認証・秘密情報不要。

既存の `npm run check` と `npm test` は成功。公開ファイルを変更していないため、生成エンジンやUIの追加改修・再テストは行わない。
