# 作業方針

- サイト本体は `site/`。作品・制作中は `content/projects/`、note紹介は `content/writings/` を編集する。`.pages.yml` はこの2コレクションのみを管理する。
- `content/posts/` は旧記事の保管用。新規ブログ機能を復活させたり、既存データを削除したりしない。`article.html?file=...` と `notes.html` は過去リンクの互換性のため残す。
- 追加・編集・非表示はファイル単位で管理し、ビルドで公開用catalogを生成する。既存項目と同名のデフォルトをJSへ二重定義しない。非表示は `visible: false`。公開GitHubの秘匿機能ではない。
- 公開用出力は `npm run build` が作る `dist/` のみ。リポジトリ全体をアップロードしない。
- 明示的な依頼がない限り、Cloudflareへのデプロイ、production設定・binding変更、remote D1へのSQL実行、投稿・削除テストは行わない。
- `database/schema.sql` は既存構造の記録。ビルド・CI・デプロイから自動実行しない。
- 秘密値・DB export・個人情報をGit・ログ・報告へ入れない。設定確認は変数名・種別を優先する。
- 試作は作業ブランチとローカルの模擬API・テストデータで行う。ブラウザ検証は外向き通信を遮断し、FC2・X・GitHub・Turnstileをモックする。
- 検証は `npm run check` と `npm test`。必要な変更に応じて検証を追加し、本番未検証の範囲を明記する。
- 本番D1とpreviewのDBを共有しない。既存プロジェクトの配信方式を確認する前にGit連携へ移行しない。
