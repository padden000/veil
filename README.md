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

## 公開するには
静的なファイルだけなので、GitHub Pages / Cloudflare Pages / Netlify などにフォルダごと置けば公開できます。

画像・ゲーム内の名称の権利は MOONTON に帰属します。非公式のファンサイトです。
