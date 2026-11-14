# Print PON 運用

https://print-pon.pages.dev/ の既存Cloudflare Pagesプロジェクトprint-ponを管理する。

## ソースの由来

元の制作ZIPは未入手。Cloudflareのデプロイ詳細APIから本番デプロイ02e6e2e2-d023-498c-964d-1d7aee2866e6の全14ファイル一覧を取得し、固定URLから回収した静的配信一式をmanaged-sites/print-ponに保存した。自動挿入されたAnalyticsタグはHTMLから除去し、既存のPagesによる自動注入を継続する。recovered-release.jsonに回収時のSHA-256を記録。元の制作履歴やZIPそのものを復元したという意味ではない。

公開前にAPIでサーバー側Functionsなし、Git連携なし、環境変数なし、全ファイル一覧を照合する。想定外があれば公開せず停止する。配信設定をPATCHせず、既存プロジェクトへWranglerで直接デプロイする。

## 更新

- managed-sites/print-ponの必要ファイルだけを編集する。
- python3 tools/print-pon/build.pyで完全な15ファイルをdistへ出力する。根のnpm run checkが寝床のdistを作るため、ぷりぽんっビルドは最後に実行する。
- 専用workflow print-pon-production.ymlは対象ファイル変更にだけ反応。GitHub Actionsの既存CLOUDFLARE_API_TOKENを使い、固定Wrangler 4.162.0でproject-name print-pon / branch mainへ公開する。秘密値の抽出やコピーはしない。
- 公開後にタイトル、Analyticsタグ1個、Google確認タグ、主要ファイルの200と存在しないURLの404を確認。検証に失敗した場合は、他の公開作業が割り込んでいないことを確認して直前のデプロイへロールバックする。
- 寝床の本番workflowは手動実行式のままで、このworkflowから実行しない。D1への操作はしない。

## 今回の検証

npm run check、npm test（既存13テスト）成功。修正済み配信ファイルをChromiumで読み込み、幅320/375/390/768/1280pxに横スクロールなし。6学年プリセット、50問の余りありPDF保存、A4印刷2ページ、答えなし1ページを確認。ブラウザーの未処理エラーなし。実機iOS/Androidと実プリンターは未検証。

解析は設置済みのCloudflare Web Analyticsを使う。Search Console確認タグ・robots・sitemap・canonicalも維持。Google側の所有権確認完了や検索登録の管理画面は今回の認証では確認できない。
