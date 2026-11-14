# Print PONの編集

このディレクトリーはprint-pon.pages.dev専用の静的ソース。親リポジトリの寝床本体とは別サイト。
公開用ファイル一覧はtools/print-pon/build.pyとrecovered-release.jsonで管理し、このAGENTS.mdを配信しない。
公開指示がある場合は専用workflow print-pon-production.ymlで既存print-ponへWrangler直接デプロイする。寝床の本番workflowやD1には触れない。

単元ページはtools/print-pon/topics.jsonとbuild.pyから静的生成する。出力だけを直接編集しない。小3の割り算はmaxQuotient=9を維持し、未対応の条件をページ名に約束しない。
匿名イベントはtools/print-pon/event-worker.mjsと専用wrangler.tomlで管理する。操作と公開ページID以外の項目、Cookie、利用者識別子を追加しない。DNT/GPCを尊重する。
