# 検索で見つけてもらうための整備

サイト名・作品名で検索する人に内容が伝わるよう、各ページのタイトル・説明、正規URL、共有用画像、サイト名と作品一覧の構造化データを生成する。公開作品・制作中の内容とナビゲーションはビルド時にHTMLへ出力し、JavaScriptなしでも読める。表示用コードを共通化し、ブラウザでの再描画と内容を揃える。

`/robots.txt` と `/sitemap.xml` を追加する。従来このURLはホームのHTMLへフォールバックしていた。サイトマップはホーム・作品・制作中・掲示板・運営者紹介の実在する正規URLのみ。旧記事のクエリURLは変更しない。試作環境は引き続きnoindexとrobotsのDisallowで検索対象から外す。

BBSの処理・D1・Turnstile・カウンター・記事データ・作品リンクは変更しない。別サービスprint-ponにも変更しない。

確認: npm run check / npm test、試作ビルドの検査、外部通信を遮断したブラウザで4画面幅・JavaScript無効時の作品一覧・旧記事・模擬掲示板を確認する。本番反映には既存の承認済みファイル一覧を更新し、バックアップ付きの手動公開手順を使う。

これは検索エンジンが読み取れる状態にする整備であり、Googleでの掲載・順位・掲載日は保証しない。Search Consoleの所有権確認・サイトマップ送信は未実施。サイトマップはrobotsから発見可能。

参考:
- https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics
- https://developers.google.com/search/docs/appearance/site-names
