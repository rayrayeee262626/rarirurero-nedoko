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

## 利用者獲得・第1弾（2026-11-14）

- tools/print-pon/topics.jsonを教材の定義元として、build.pyが10単元ページとトップの学年別リンク、14 URLのサイトマップを静的生成。学習内容・注意点・問題例・答えはJSなしでも読める。
- 学年対応は文科省「小学校学習指導要領（平成29年告示）解説 算数編」の内容構成（冊子p12〜14）と照合。 https://www.mext.go.jp/component/a_menu/education/micro_detail/__icsFiles/afieldfile/2019/03/18/1387017_004.pdf
- 小1：1桁の加減。小2：2桁の加減と九九。小3：2桁×1桁、商1〜9の除法（余りあり／なし）。小4：3桁÷1桁、3桁÷2桁。2桁×2桁は3年の内容に含まれるため、小4の新単元としては設けていない。
- 小3の商を1桁に限定するため、既存エンジンに任意のmaxQuotientを追加。未指定時の出題条件は維持。小1の1桁−1桁は45式しかないので、単元ページの選択肢は10/20/30問。
- 各ページは20問・答えつきで初期生成。操作ボタンを見本の前に配置。答えの有無を変えても問題を入れ替えない。単元のURLをシェア・ブックマークすれば同じ条件から再開できる。
- 検索語は想定した検索意図に基づく候補。検索ボリューム・順位を実測したとの主張はしていない。Search Consoleで公開後の実際の検索語を検証する。

### 操作の匿名集計

既存のCloudflare Web Analyticsにはカスタムイベントを無理に混ぜず、そのタグとページ閲覧計測を維持する。Workers Analytics Engineのprint_pon_eventsデータセットに、最小限のPages Workerからイベントだけを記録する。

- APIはPOST /api/eventsだけ。_routes.jsonにより他のパスは静的配信を継続。
- 送信内容はevent（generate/pdf/print）、page（homeまたは定義済みの10単元）の2項目。AEには同じ2項目と定数1のみ保存。Cookie、利用者ID、氏名、問題、答え、設定、IP、User-Agent、参照元はアプリで収集しない。Cloudflare自体の技術的接続情報の処理は既存ポリシーに記載。
- generateは利用者の再生成・条件変更で成功した回数。初期の自動生成・答えの表示切り替えは数えない。pdfはダウンロード開始操作、printは印刷画面を開く操作であり、完了を示さない。
- DNTまたはGPCが有効なら送信せず、サーバーでも抑止。通信失敗は再送せず、印刷機能を止めない。healthは公開確認専用でカウントしない。
- サーバーは同一Origin、固定項目・固定値、256バイトまでを検証。外部サイトからのブラウザー送信は拒否するが、公開の匿名集計のため悪意ある直接投稿やボットを厳密に排除する値ではない。人数・再訪率・実際の印刷完了率は測れない。
- SQLではサンプリング補正のためSUM(_sample_interval * double1)を使う。AEのデータ保持は通常3か月。 https://developers.cloudflare.com/analytics/analytics-engine/limits/
- 公式の現行案内ではWorkers Freeにも枠があり、AE料金は現在未課金の案内（2026-11-14に確認）。有料プラン変更は行わない。 https://developers.cloudflare.com/analytics/analytics-engine/pricing/
- 設定は専用wrangler.tomlのPRINT_PON_EVENTS bindingだけ。秘密値は既存Actions Secretのまま。公開失敗時のロールバックでは、このbindingも以前の設定へ戻す。

集計はCloudflareのAnalytics Engineで確認するか、GitHub Actionsの「Print PON anonymous action report」を実行する。SQL読取権限が不足する場合は、その点だけを報告し、既存トークンの権限を自動で広げない。レポートは過去28日の日別・操作別・単元別の集計だけを出力する。

### 検証と次の判断

CIは既存13テストに加え、850件の演算／教材条件、10ページの静的SEO・リンク・サイトマップ、イベントの許可項目と拒否ケースを検証。Chromiumで10ページ×4画面幅、10件のPDF保存、最大問題数の印刷、答え切り替え、再生成、シェアURL、DNT、既存トップの学年プリセットと不可能条件を確認する。ブラウザーテストは外向き通信を遮断し、イベントをモックする。

最初の28日で、Search Consoleのページ別表示回数・クリック・CTR・検索語と、CloudflareのVisits/PV・流入元、単元別のgenerate/pdf/printを確認。表示があるのにクリックが少ないページはタイトル・説明を再検討し、閲覧があるのに保存操作が少ない単元は見本や条件を点検する。まだ少数のデータから効果を断定しない。次の候補は、実際の検索語に基づく「くり上がりなし」などの条件追加と、利用の多い単元の導線改善。新規ページの量産を先に行わない。
