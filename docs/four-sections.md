# 4コンテンツへの整理（本番反映済み）

## 本番公開記録

ユーザーの「これで公開して」という明示承認後、2026-11-13 22:49 UTCに本番へ反映した。以下の試作・承認待ちの説明は準備段階の記録であり、この節が最新状態。

- 成功実行: https://github.com/rayrayeee262626/rarirurero-nedoko/actions/runs/43522250051
- 配信コミット: `85dffd70dee1796d5efa7d3b82b466cb8be9af6d`
- 本番配信ID: `e459f7c6-75f2-4db0-ba40-16f60ea6525f`
- 直前の復旧先ID: `d46de83a-1217-4762-a626-e37390683ea9`
- 暗号化バックアップ: `encrypted-pre-release-backup-43522250051`（2027-02-11 UTCまで保存）

公開ファイル16本（Workerを除く）が承認済みハッシュと一致。DB binding・環境変数・Turnstile設定が不変、既存投稿2件・返信1件が保持されていることを確認。別途GETでnote直接リンク、重複一覧の削除、キャラ画像、FC2タグ、旧記事URLも確認した。記事データ・投稿・返信は削除していない。

## 試作時の記録

## 追加調整

ユーザーの追加指定により、ホームの「書いたもの」カードと共通ナビは https://note.com/rcp262626 への直接リンクに変更。ホームの「noteに書いたもの」一覧は外した。「まずは、この作品から」・他の入口・BBS・X等は維持する。旧writings.html自体は既存リンクの互換用に残す。

右上の丸い飾りは、添付キャラを元に上半身中心の丸枠向けに整えた画像へ置換した。画像はsite/mascot.webp（約212KB）としてGit管理し、ビルド・試作配信へバイナリのままコピーする。PCは172px、スマホは76pxの丸枠で表示する。

作業ブランチ: `codex/reorganize-four-sections`。現行本番URLは https://rarirurero-nedoko.pages.dev/ を維持する。本番反映・mainへのマージ・D1変更・データ削除は行わず、既存の分離した試作プロジェクトのみへ配信する。

試作配信成功: https://github.com/rayrayeee262626/rarirurero-nedoko/actions/runs/43520292536 。確認URL: https://rarirurero-nedoko-preview.pages.dev/ 。レビュー用Draft PR: https://github.com/rayrayeee262626/rarirurero-nedoko/pull/11 。

配信後もGETで生成カタログ（作品2件・制作中4件・note紹介3件）、保存版JSON（公開記事1件）、旧article/notes URL、試作BBSの投稿停止を確認。本番ホーム・CSSは現行承認版のハッシュと一致し、未変更であることを確認した。

## 新しい構成

| 入口 | URL | 管理元 |
|---|---|---|
| 作ったもの | works.html | content/projectsのstatusがpublished/completedの項目 |
| 書いたもの | https://note.com/rcp262626 | noteプロフィールへ直接リンク。本文はnote |
| 現在進行中 | projects.html | content/projectsのstatusがdeveloping/pausedの項目 |
| 掲示板（BBS） | bbs.html | 既存のWorker・D1・Turnstile |

ホームと運営者紹介は補助ページとして維持。ホームの4カードも上記と同じ順に整理し、従来の淡い配色・雰囲気を維持した。note記事のカードはすべてnoteへリンクし、独自ブログや「残しておきたい話」をメインナビ・ホーム一覧から外した。FC2カウンター、X埋め込み・リンク、noteプロフィールへのリンクは本番用ソースで維持する。

## ブログ廃止と既存リンクの両立

- Pages CMSのpostsコレクションを外し、新規ブログ投稿欄を廃止する。
- `content/posts/` 内の既存Markdownは元のパス・バイトのまま保存し、削除しない。
- 公開済み記事だけをビルドで `legacy-posts.json` に変換する。非公開フラグのデータを保存版へ含めない。
- 既存 `article.html?file=2026-11-12-.md` は同じ本文・リンクを読める保存版として維持。URLや本文を推測でnoteへ置換しない。
- `notes.html` は構成変更の案内と保存記事への入口にする。メインナビには表示しない。
- 保存版は過去の公開URLの互換用。新規投稿・新着ブログ・カテゴリ別ブログの機能はない。

## 作品・制作中・note紹介の管理

既存のJSに埋め込まれていた作品6件とnote紹介3件を、既存の外部URLのままMarkdownメタデータへ移した。各項目は1つのファイルだけを編集する。JS側の固定デフォルトとタイトルでマージする処理を廃止し、改名や非表示で古い項目が復活しないようにした。

例:

```yaml
---
title: "作品の名前"
status: developing
visible: true
url: "https://example.com/"
description: "短い紹介文"
---
```

`content/projects/` へ新しいmdを追加すれば項目を追加できる。同じファイルでタイトル・説明・状態を変更でき、`visible: false` で非表示。公開済みの作品はリンク必須、制作中はリンクなしでも表示できる。note紹介は `content/writings/` に保存し、HTTPSのnote.com URLのみを許可する。

`.pages.yml` は作品・制作中とnote紹介の2コレクションにする。記事本文はCMSに持たせない。`visible: false` は公開GitHubの秘密保管機能ではない。

## ビルドと配信の変更

作品・note紹介は `catalog.json` としてビルド時にまとめる。閲覧時のGitHub APIアクセス・各Markdownの追加取得を廃止し、サイトと同じCloudflare Pagesから配信する。これで試作ブランチのデータをmainに先行反映せず試せる。

紹介文・項目をCMSやGitHubで編集した場合も、以後は再ビルド・配信が必要。Codexが変更ブランチ→検証→試作→承認後本番の順で対応する。

`tools/site-files.mjs` を公開ファイルの一覧とし、公開用HTML/JS/CSS14ファイル・キャラ画像1ファイル・生成JSON2ファイルだけをdistへ出力する。元Markdown、SQL、設定、運用資料、秘密値は配信しない。既存のDB初期SQLはビルドや配信から実行しない。

## 維持したもの・検証

- BBSの `_worker.js`、bbs.js、bbs.html、database/schema.sqlは変更なし。
- D1 binding、Turnstileのキー・許可ドメイン、BBS管理キーを変更する処理は追加していない。
- 日次バックアップworkflow、Cloudflare接続設定、既存の本番配信workflowは変更なし。
- 既存noteの3リンク、公開作品の2リンクを移行前と照合済み。
- 既存記事ファイル、BBS関係、日次バックアップ、本番release manifestが基点mainと同一であることを確認。
- Node: Worker9件、カタログ/保存版4件、試作分離3件。Python既存25件。ビルド・差分チェック成功。
- 外部通信を遮断したブラウザで1280/740/390/320pxを確認。6つのナビ（補助2・メイン4）、4カード、note専用リンク、作品・制作中一覧、空/通信失敗時、旧記事URL、保存記事案内、BBSの模擬投稿・試作の投稿停止を確認。

試作では本番DBを使わず、BBSはサンプルのみ。FC2・X等は読み込まずカウントを加算しない。記事・note本文を外部サービスへ新規投稿する操作はしていない。

## 本番反映の条件

この試作をユーザーが承認してから、変更をmainへ統合し、生成JSON・画像を含む17ファイルのrelease manifestを更新する。現在の `deployment/approved-release.json` は以前の承認版のままであり、新構成を誤って配信しようとするとファイル一覧・ハッシュ不一致で停止する。

実際の本番反映時は従来どおり直前の暗号化BBSバックアップ→既存binding確認→手動配信→静的ファイル・BBS読み取り確認を行う。記事データの削除やD1スキーマ変更は含めない。
