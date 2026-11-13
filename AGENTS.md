# 作業方針

- サイト本体は `site/`、CMS設定は `.pages.yml`、記事は `content/`。既存の記事・CMS設定を上書きしない。
- 公開用出力は `npm run build` が作る `dist/` のみ。リポジトリ全体をアップロードしない。
- 明示的な依頼がない限り、Cloudflareへのデプロイ、production設定・binding変更、remote D1へのSQL実行、投稿・削除テストは行わない。
- `database/schema.sql` は既存構造の記録。ビルド・CI・デプロイから自動実行しない。
- 秘密値・DB export・個人情報をGit・ログ・報告へ入れない。設定確認は変数名・種別を優先する。
- 試作は作業ブランチとローカルの模擬API・テストデータで行う。ブラウザ検証は外向き通信を遮断し、FC2・X・GitHub・Turnstileをモックする。
- 検証は `npm run check` と `npm test`。必要な変更に応じて検証を追加し、本番未検証の範囲を明記する。
- 本番D1とpreviewのDBを共有しない。既存プロジェクトの配信方式を確認する前にGit連携へ移行しない。
