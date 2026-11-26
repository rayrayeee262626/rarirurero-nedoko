# ダメ感トレーナー　〜どれだけダメージ入るかな〜

『Pokémon Champions』の非公式対戦練習ツール。現行レギュレーション M-C（2026年11月26日調査）のダブルバトルを想定した全10問のダメージ予想クイズです。

## ローカルと Cloudflare Pages

Node.js 22 以降で `npm ci`、`npm test`、`npm run build` を実行します。生成された `dist/index.html` をブラウザーで開くと遊べます。実行時の外部通信やログインは不要です。

Cloudflare Pages の Git 連携では、ルートディレクトリをこのプロジェクトのルート、ビルドコマンドを `npm run build`、出力ディレクトリを `dist` に設定します。Direct Upload の場合はビルド済みの `dist` ディレクトリまたはその内容を収録した ZIP をアップロードします。Functions や環境変数は不要です。Cloudflare Pages への実デプロイは未実施です。[Cloudflare Pages のビルド設定](https://developers.cloudflare.com/pages/configuration/build-configuration/) · [Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/)

## エンジンとデータ

- npm 公開版 `@smogon/calc` 0.12.0 を固定。パッケージの `Generations.get(0)` は Champions データと `calculateChampions` に接続します。旧 API 名の `evs` に能力ポイントを等倍で渡し、Champions 専用のステータス式を使います。種族値・性格・タイプ相性・特性・持ち物・メガシンカ後のフォルム・ダブルの範囲補正・85〜100の16段階乱数は、この経路で計算します。[npm](https://www.npmjs.com/package/@smogon/calc/v/0.12.0) · [専用の計算処理](https://github.com/smogon/damage-calc/blob/master/calc/src/mechanics/champions.ts)
- M-C の使用率上位を中心に12フォルム・18種類の攻撃技を選び、性格・特性・能力ポイント・持ち物を固定したセットを作りました。245通りの攻撃側・防御側・技の組み合わせから、毎回重複なしでランダムに10問出題します。使用率は Showdown の2026年10月分を参照し、現在の実機ランクマッチの使用率は取得していません。[公式のシーズン M-8](https://news.pokemon-home.com/ja/page/867.html) · [Showdown 使用率](https://www.smogon.com/stats/2026-10/gen9championsvgc2026regmc-0.txt) · [技・配分別集計](https://www.smogon.com/stats/2026-10/moveset/gen9championsvgc2026regmc-0.txt)
- 正解範囲は `ダメージ ÷ 防御側の最大HP × 100` の両端を小数第1位に丸めた値です。最大HPを超える計算ダメージも表示します。範囲内は100点、範囲外は最も近い端までの差をそのまま100点から引きます（1パーセントポイントにつき1点、最低0点）です。

## 検証と対応範囲

- `npm test` で能力値・乱数範囲の整合性・代表対面・出題の重複防止・採点境界を検証できます。
- Pokémon Showdown の Champions 対戦シミュレーター（コミット `c7fa6f16503de510c319239b5b2d29d4f7abd8c4`）の M-C チームバリデーターで12セットすべてが合法でした。ダブルの計算で245対面の最大HPと技タイプ、および全3,920乱数結果が一致しました。Showdown ソースの同コミットを別途用意して依存関係をインストールすると、`node scripts/verify-showdown.cjs /path/to/pokemon-showdown` で再試験できます。[Showdown ソース](https://github.com/smogon/pokemon-showdown/tree/c7fa6f16503de510c319239b5b2d29d4f7abd8c4)
- 検証はシミュレーターとの照合です。実機のゲーム内でのダメージ比較は未実施です。出題条件は防御側HP満タン、非急所、メガシンカ済み、特性による登場時効果を反映したダブルの1回の攻撃です。天候、状態異常、味方の補助、連続技、複数ターン、変則的な条件を必要とする技、メガシンカと「いかく」が重なる対面、および収録セット外の仕様は対象外です。
- マネージドプレビューはローカルポートの待ち受け権限エラーで起動できませんでした。スマートフォン実機とブラウザーでの見た目は未確認です。

## ライセンス

- `@smogon/calc` とパッケージに含まれる計算用データは上流の MIT ライセンスに従います。配布物に上流のライセンス表示を同梱しています。ゲームに関する権利は各権利者に帰属します。[上流のライセンス](https://github.com/smogon/damage-calc/blob/master/LICENSE)
- ビルド時に MIT の esbuild を使用します。照合に使用した Pokémon Showdown は MIT で、ゲーム本体には同梱していません。[esbuild](https://github.com/evanw/esbuild/blob/main/LICENSE.md) · [Pokémon Showdown](https://github.com/smogon/pokemon-showdown/blob/master/LICENSE)
- 使用率の集計ファイルには再配布条件を確認できる明示的なライセンスを見つけられなかったため、集計ファイルと数値は同梱せず、セット選定の参照元としてリンクしています。公式画像・ロゴ・音楽・効果音は使用していません。
