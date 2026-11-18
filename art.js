/* ヒーローの背景画像。
   画像ファイルをサイトのフォルダ(art/ など)に置いて、ここに足すと、
   そのヒーローの詳細ページの背景と、図鑑のカードに表示されます。

   1枚だけのとき:
     miya: { img: "art/miya.jpg", credit: "© MOONTON" }
   スキンが何枚もあるとき(ページを開くたびにランダムで1枚を表示):
     kagura: [
       { img: "art/kagura-1.jpg", name: "スキン名", credit: "© MOONTON" },
       { img: "art/kagura-2.jpg", name: "スキン名", pos: "60% 20%" }
     ]

   id   : ヒーローのID(URLの #champion-◯◯ の部分。例 kagura, miya, fanny)
   img  : 画像ファイルのパス
   name : スキン名(右下の権利表記の横に出る。なくてもよい)
   pos  : 画像のどこを見せるか(横% 縦%)。キャラの顔が切れるときに調整する
   credit: 画像の権利表記

   スキンタブ(VEIL_SLOTS.heroes[id].skins)に画像付きで入れたスキンも、自動でランダムの候補に入ります。
   画像は横長(16:9 前後)、横1600px以上がきれいに見えます。 */
window.VEIL_ART = {
  kagura: { img: "kagura-skin.png", pos: "50% 30%", credit: "© MOONTON" }
};
