# VEIL

Mobile Legends: Bang Bang 向けの非公式・戦術データベースサイト(試作版)。

## 開き方
- `index.html` をブラウザで開くだけで動きます(サーバー不要)。
- フォントは Google Fonts から読み込むので、ネットにつながっていると本来の見た目になります。

## ファイル
| ファイル | 中身 |
|---|---|
| index.html | ページの土台 |
| style.css | デザイン(色・レイアウト) |
| app.js | 画面を作る処理(各ページ・タブ・フィルター) |
| roster.js | ヒーロー133体と試合記録68件(スプレッドシートから生成) |
| adapter.js | 試合記録から勝率・レーン・相性などを集計 |
| art.js | ヒーローの背景画像の登録(スキンをランダム表示) |
| data.js | 装備・エンブレムなどの枠と仮データ |
| kagura-skin.png | カグラの背景画像 |
| make_roster.py | スプレッドシート(.xlsx)から roster.js を作り直すスクリプト |

## データの更新
```
python3 make_roster.py <シート.xlsx> roster.js
```

## ログイン用の設定(config.js)
- Supabase の URL とキーはコードに書かず、Cloudflare Pages の環境変数 `SUPABASE_URL` と `SUPABASE_PUBLISHABLE_KEY` から作ります。
- 手元で試すときは `config.example.js` をコピーして `config.js` を作り、2つの値を入れます。`config.js` は GitHub に上がりません(`.gitignore`)。
- 入れてよいのは Publishable key(`sb_publishable_...`)だけです。Secret key や service_role キーを入れると、ビルドが止まります。

## 公開するには
Cloudflare Pages で公開しています。設定は次のとおりです。
- Build command:`node tools/build.js`
- Build output directory:`dist`
- 環境変数:`SUPABASE_URL`、`SUPABASE_PUBLISHABLE_KEY`

`tools/build.js` は、サイトに必要なファイルだけを `dist/` にまとめます。`db/`・説明書(`.md`)・スクリプトは公開されません。

画像・ゲーム内の名称の権利は MOONTON に帰属します。非公式のファンサイトです。
