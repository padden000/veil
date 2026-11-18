/* VEIL sample data. Every number here is DEMO / SAMPLE, not measured. */
window.VEIL_DATA = {
  updated: "2026.11.18",
  patch: { version: "X.XX", label: "SAMPLE", summary: "射手の牽制力が上がり、暗殺者の序盤が弱まる調整。GOLD LANEの主導権争いが変わる可能性がある。" },

  roles: [
    { id: "EXP", label: "EXP LANE", jp: "エクスプレーン" },
    { id: "GOLD", label: "GOLD LANE", jp: "ゴールドレーン" },
    { id: "MID", label: "MID LANE", jp: "ミッドレーン" },
    { id: "JUNGLE", label: "JUNGLE", jp: "ジャングル" },
    { id: "ROAM", label: "ROAM", jp: "ローム" }
  ],

  items: {
    ashboots: "灰鉄のブーツ", mistblade: "霧刃", stardust: "星屑の杖", chainward: "聖鎖の護符",
    silverbarrel: "銀弾の銃身", blackcloak: "黒羽の外套", silentbell: "沈黙の鐘", glassshield: "硝子の盾",
    brokencrown: "王冠の残骸", inqhammer: "審問の大槌", veildagger: "夜帷の短剣", sarcoarmor: "石棺の鎧",
    hasteboots: "疾駆のブーツ", mageboots: "詠唱のブーツ", ashplate: "灰の胸当て", eclipse: "蝕の宝珠",
    execblade: "処刑人の剣", crimsonfang: "紅月の牙", abysstome: "深淵の書", starcrown: "星詠みの冠"
  },

  champions: [
    {
      id: "morveth", name: "Morveth", title: "灰燼の審問官", role: "EXP", diff: 2, attr: "物理", rgb: "113,32,42",
      desc: "重い鎧で前線を押し上げ、逃げ道を灰で塞ぐ審問官。",
      stats: { hp: 8, atk: 6, def: 8, spd: 4, aspd: 4 }, wr: 50.8, pick: 9.4, ban: 3.1,
      skills: [
        { key: "P", name: "灰の誓約", desc: "スキルが命中するたびに灰の印を刻む。印が3つたまった敵は移動速度が落ちる。" },
        { key: "1", name: "審問の踏み込み", desc: "前方へ踏み込み、最初に当たった敵を短く打ち上げる。" },
        { key: "2", name: "灰の壁", desc: "指定した位置に灰の壁を立てる。敵は壁を通れない。" },
        { key: "U", name: "火刑台", desc: "周囲を灰の炎で囲い、内側の敵に継続ダメージ。外へ出ようとすると引き戻される。" }
      ],
      combo: ["2", "1", "通常攻撃", "U"],
      comboNote: "壁で退路を先に塞いでから踏み込む。順番を逆にすると逃げられる。",
      build: ["ashboots", "inqhammer", "ashplate", "sarcoarmor", "brokencrown", "chainward"],
      emblem: "ファイター:被ダメージ軽減と体力回復を優先",
      strong: ["lucan", "esme"], weak: ["bram", "veyra"],
      play: "前に立ち続けることが仕事。壁で敵の退路を切り、味方が追いつく時間を作る。",
      lane: "序盤は無理に倒しにいかず、ミニオンを確実に取る。相手の突進スキルを見てから壁を置く。",
      team: "開戦は自分から。壁で敵の後衛を孤立させ、火刑台で前衛ごと閉じ込める。",
      lore: "灰の審問を指揮した最後の審問官。焼いた者の名をすべて覚えていると言われる。",
      events: ["ash-inquisition"], relations: [{ id: "bram", type: "宿敵" }, { id: "thessaly", type: "かつての同志" }]
    },
    {
      id: "ilsyra", name: "Ilsyra", title: "霧を纏う弓姫", role: "GOLD", diff: 2, attr: "物理", rgb: "101,113,125",
      desc: "霧の中から射抜く長射程の射手。位置取りがすべて。",
      stats: { hp: 4, atk: 8, def: 3, spd: 6, aspd: 8 }, wr: 52.4, pick: 18.2, ban: 6.0,
      skills: [
        { key: "P", name: "霧の帳", desc: "茂みの中にいる間、次の通常攻撃の射程が伸びる。" },
        { key: "1", name: "霧の矢", desc: "貫通する矢を放つ。霧の中から撃つとダメージが上がる。" },
        { key: "2", name: "後退の霧", desc: "後ろへ跳び、着地点に小さな霧を残す。" },
        { key: "U", name: "霧雨", desc: "広い範囲に矢の雨を降らせ、範囲内の敵を遅くする。" }
      ],
      combo: ["1", "通常攻撃", "2", "1"],
      comboNote: "矢を当ててから下がり、霧の中からもう一度撃つ。前に出るために後退の霧を使わない。",
      build: ["hasteboots", "mistblade", "silverbarrel", "veildagger", "eclipse", "glassshield"],
      emblem: "ハンター:攻撃速度と移動速度",
      strong: ["lucan", "calder"], weak: ["nyxa", "sable"],
      play: "常に一番後ろから撃つ。後退の霧は逃げるために残しておく。",
      lane: "霧の矢でミニオンごと相手を削る。相手の主要スキルが残っている間は前に出ない。",
      team: "前衛の後ろから、届く敵を撃つ。暗殺者の位置が分からないときは霧雨で牽制する。",
      lore: "霧の森ヴェイルの番人の娘。森が燃えた夜から、一度も霧の外に出ていない。",
      events: ["veil-fall"], relations: [{ id: "nyxa", type: "追う者と追われる者" }, { id: "lucan", type: "好敵手" }]
    },
    {
      id: "kael", name: "Kael Dranos", title: "墜ちた星詠み", role: "MID", diff: 3, attr: "魔法", rgb: "185,154,104",
      desc: "星の残光を束ねる詠唱者。一撃の重さは随一。",
      stats: { hp: 3, atk: 9, def: 3, spd: 5, aspd: 4 }, wr: 48.9, pick: 12.9, ban: 9.8,
      skills: [
        { key: "P", name: "残光", desc: "スキルを当てるたびに星を1つためる。5つで次のスキルが強化される。" },
        { key: "1", name: "星屑", desc: "指定地点に星屑を落とす。少し遅れて着弾する。" },
        { key: "2", name: "引力", desc: "円の中の敵を中心へ引き寄せる。" },
        { key: "U", name: "星墜ち", desc: "長い詠唱のあと、広い範囲に大ダメージ。詠唱中は動けない。" }
      ],
      combo: ["2", "1", "U"],
      comboNote: "引力で集めた位置に星屑を落とす。星墜ちは敵が動けないときだけ撃つ。",
      build: ["mageboots", "stardust", "eclipse", "silentbell", "glassshield", "chainward"],
      emblem: "メイジ:魔法攻撃力とクールダウン短縮",
      strong: ["calder", "morveth"], weak: ["veyra", "nyxa"],
      play: "当てるまでが勝負。射程の端から星屑を置き、近づかれたら下がる。",
      lane: "星屑で削り、残光をためる。詠唱を封じるスキルを持つ相手には大技を急がない。",
      team: "味方の拘束に合わせて星墜ちを撃つ。単独で撃つと詠唱中に倒される。",
      lore: "星墜ちの夜、空から落ちた星を最初に拾った少年。その日から未来の一部が見えるという。",
      events: ["star-night"], relations: [{ id: "veyra", type: "師弟" }, { id: "esme", type: "協力者" }]
    },
    {
      id: "nyxa", name: "Nyxa", title: "夜帷の刃", role: "JUNGLE", diff: 3, attr: "物理", rgb: "70,52,96",
      desc: "影から影へ渡る暗殺者。孤立した敵を逃さない。",
      stats: { hp: 4, atk: 9, def: 3, spd: 9, aspd: 6 }, wr: 51.2, pick: 15.7, ban: 14.3,
      skills: [
        { key: "P", name: "夜目", desc: "体力が半分以下の敵の位置が短時間見える。" },
        { key: "1", name: "影渡り", desc: "敵の背後へ瞬間移動し、最初の一撃のダメージが上がる。" },
        { key: "2", name: "帷", desc: "短時間姿を消し、移動速度が上がる。" },
        { key: "U", name: "夜の刃", desc: "対象に連続で斬りかかる。斬っている間は狙われない。" }
      ],
      combo: ["2", "1", "通常攻撃", "U"],
      comboNote: "帷で近づき、影渡りで背後へ。夜の刃で斬っている間に相手のスキルをかわす。",
      build: ["hasteboots", "veildagger", "blackcloak", "mistblade", "eclipse", "ashplate"],
      emblem: "アサシン:物理貫通と移動速度",
      strong: ["ilsyra", "kael"], weak: ["thessaly", "calder"],
      play: "一人でいる敵を探す。集団に飛び込まず、倒しきれる相手だけを狙う。",
      lane: "ジャングルを効率よく回り、序盤から相手の射手を狙う。",
      team: "開戦の直後ではなく、拘束スキルが使われたあとに後衛へ入る。",
      lore: "霧の森が燃えた夜、炎の中から現れたという。誰に雇われているのかは誰も知らない。",
      events: ["veil-fall"], relations: [{ id: "ilsyra", type: "追う者と追われる者" }, { id: "sable", type: "同じ影に属する" }]
    },
    {
      id: "thessaly", name: "Thessaly", title: "鎖の聖女", role: "ROAM", diff: 1, attr: "魔法", rgb: "150,138,112",
      desc: "祈りの鎖で味方を繋ぎ止める守護の聖女。",
      stats: { hp: 6, atk: 3, def: 7, spd: 5, aspd: 3 }, wr: 53.1, pick: 11.4, ban: 2.2,
      skills: [
        { key: "P", name: "祈り", desc: "近くの味方が受けるダメージを少し肩代わりする。" },
        { key: "1", name: "聖鎖", desc: "味方と自分を鎖でつなぎ、シールドを与える。" },
        { key: "2", name: "戒め", desc: "前方の敵を短く拘束する。" },
        { key: "U", name: "誓約の円", desc: "円の中の味方を一定時間倒されなくする。" }
      ],
      combo: ["2", "1", "U"],
      comboNote: "戒めで止めてから味方を鎖でつなぐ。誓約の円は味方が狙われた瞬間に使う。",
      build: ["hasteboots", "chainward", "sarcoarmor", "glassshield", "silentbell", "ashplate"],
      emblem: "サポート:クールダウン短縮と防御力",
      strong: ["nyxa", "sable"], weak: ["kael", "esme"],
      play: "射手の隣を離れない。暗殺者が来たら戒めで止める。",
      lane: "GOLD LANEで射手を守る。茂みを確認して奇襲を防ぐ。",
      team: "味方の後衛を守ることが最優先。誓約の円は自分のためではなく味方のために使う。",
      lore: "沈黙の修道院の最後の聖女。審問官Morvethとは、かつて同じ誓いを立てた仲だった。",
      events: ["ash-inquisition"], relations: [{ id: "morveth", type: "かつての同志" }, { id: "veyra", type: "修道院の姉妹" }]
    },
    {
      id: "orrin", name: "Orrin Vex", title: "錆びた王冠", role: "EXP", diff: 1, attr: "物理", rgb: "120,84,60",
      desc: "滅びた王国の最後の騎士。粘り強く、倒れない。",
      stats: { hp: 9, atk: 5, def: 8, spd: 4, aspd: 4 }, wr: 50.1, pick: 6.2, ban: 0.9,
      skills: [
        { key: "P", name: "不屈", desc: "体力が少ないほど防御力が上がる。" },
        { key: "1", name: "盾打ち", desc: "盾で殴り、短くスタンさせる。" },
        { key: "2", name: "王の号令", desc: "周りの味方の移動速度を上げる。" },
        { key: "U", name: "最後の砦", desc: "数秒間、受けたダメージの一部を体力に変える。" }
      ],
      combo: ["2", "1", "U"],
      comboNote: "号令で味方と一緒に詰め、盾打ちで止める。最後の砦は体力が減ってから。",
      build: ["ashboots", "ashplate", "sarcoarmor", "brokencrown", "chainward", "inqhammer"],
      emblem: "タンク:体力と防御力",
      strong: ["bram", "lucan"], weak: ["kael", "esme"],
      play: "倒れにくさを活かして長く前に立つ。初心者でも役割が分かりやすい。",
      lane: "体力で押し勝つ。長期戦になるほど有利。",
      team: "味方の先頭に立ち、敵の注意を引きつける。",
      lore: "王冠の喪失の日、王都の門を最後まで守った騎士。錆びた王冠を今も兜に付けている。",
      events: ["crown-lost"], relations: [{ id: "lucan", type: "主従" }, { id: "bram", type: "元同僚" }]
    },
    {
      id: "sable", name: "Sable", title: "黒羽の告死者", role: "JUNGLE", diff: 2, attr: "物理", rgb: "60,64,74",
      desc: "黒い羽を散らして奇襲する。序盤の主導権が鍵。",
      stats: { hp: 5, atk: 8, def: 4, spd: 8, aspd: 6 }, wr: 49.6, pick: 8.8, ban: 4.5,
      skills: [
        { key: "P", name: "告死", desc: "体力の少ない敵へのダメージが上がる。" },
        { key: "1", name: "黒羽", desc: "前方に羽を飛ばし、当たった敵の視界を狭める。" },
        { key: "2", name: "急降下", desc: "指定地点へ飛び込み、周りの敵にダメージ。" },
        { key: "U", name: "群鴉", desc: "鴉の群れになって移動し、通った敵を斬る。" }
      ],
      combo: ["1", "2", "U"],
      comboNote: "黒羽で視界を奪ってから飛び込む。群鴉は逃げにも使える。",
      build: ["hasteboots", "blackcloak", "veildagger", "mistblade", "ashplate", "eclipse"],
      emblem: "アサシン:物理攻撃力と移動速度",
      strong: ["kael", "esme"], weak: ["thessaly", "orrin"],
      play: "序盤のうちに有利を作る。終盤は一人で戦わない。",
      lane: "序盤から各レーンへ奇襲をかける。",
      team: "後ろから回り込み、逃げようとする敵を仕留める。",
      lore: "鴉と話せると言われる告死者。彼女が現れた村には、翌朝一羽の黒羽が落ちている。",
      events: ["veil-fall"], relations: [{ id: "nyxa", type: "同じ影に属する" }]
    },
    {
      id: "veyra", name: "Veyra", title: "沈黙の聖歌隊", role: "MID", diff: 2, attr: "魔法", rgb: "88,96,120",
      desc: "歌えない聖歌で敵の詠唱を封じる制圧型。",
      stats: { hp: 4, atk: 7, def: 4, spd: 5, aspd: 4 }, wr: 51.7, pick: 10.1, ban: 7.4,
      skills: [
        { key: "P", name: "無音", desc: "スキルを当てた敵の次のスキル詠唱を少し遅らせる。" },
        { key: "1", name: "沈黙の詠唱", desc: "前方の敵を短く沈黙させる。沈黙中はスキルが使えない。" },
        { key: "2", name: "封印", desc: "味方1人にかけると、次に受ける拘束を無効にする。" },
        { key: "U", name: "鎮魂歌", desc: "広い範囲の敵を数秒間沈黙させる。" }
      ],
      combo: ["1", "通常攻撃", "U"],
      comboNote: "沈黙の詠唱で大技を止めてから攻める。鎮魂歌は敵の大技に合わせる。",
      build: ["mageboots", "silentbell", "stardust", "eclipse", "glassshield", "chainward"],
      emblem: "メイジ:クールダウン短縮",
      strong: ["kael", "morveth"], weak: ["nyxa", "sable"],
      play: "敵の大技を止めるのが仕事。ダメージより妨害を優先する。",
      lane: "相手の詠唱に合わせて沈黙を入れる。",
      team: "鎮魂歌で敵の大技をまとめて封じる。",
      lore: "沈黙の修道院で声を奪われた歌い手。Kaelに星の読み方を教えたのは彼女だった。",
      events: ["star-night", "ash-inquisition"], relations: [{ id: "kael", type: "師弟" }, { id: "thessaly", type: "修道院の姉妹" }]
    },
    {
      id: "calder", name: "Calder", title: "石棺の守護者", role: "ROAM", diff: 2, attr: "物理", rgb: "96,92,84",
      desc: "石棺を背負う巨躯。開戦の合図は彼が鳴らす。",
      stats: { hp: 9, atk: 4, def: 9, spd: 3, aspd: 3 }, wr: 49.9, pick: 7.5, ban: 1.6,
      skills: [
        { key: "P", name: "石の肌", desc: "最初に受けるスキルダメージを大きく減らす。" },
        { key: "1", name: "棺の投擲", desc: "石棺を投げ、当たった敵を打ち上げる。" },
        { key: "2", name: "地鳴り", desc: "周りの敵を遅くする。" },
        { key: "U", name: "封棺", desc: "敵1人を石棺に閉じ込める。閉じ込められた敵は何もできない。" }
      ],
      combo: ["1", "2", "U"],
      comboNote: "棺の投擲で開戦し、逃げる敵を封棺で止める。",
      build: ["ashboots", "sarcoarmor", "ashplate", "chainward", "glassshield", "brokencrown"],
      emblem: "タンク:体力と防御力",
      strong: ["nyxa", "sable"], weak: ["ilsyra", "kael"],
      play: "開戦を決める役。外すと味方が不利になるので、当てられる距離まで待つ。",
      lane: "射手の横で茂みを確認しながら、相手射手に圧をかける。",
      team: "相手の要となるキャラクターを封棺で止める。",
      lore: "王都の地下墓所の守り手。背負った石棺の中身は誰も見たことがない。",
      events: ["crown-lost"], relations: [{ id: "orrin", type: "古い友" }]
    },
    {
      id: "lucan", name: "Lucan", title: "銀弾の狩人", role: "GOLD", diff: 3, attr: "物理", rgb: "140,146,152",
      desc: "一発ごとに銀弾を込める狩人。終盤に化ける。",
      stats: { hp: 4, atk: 9, def: 3, spd: 5, aspd: 5 }, wr: 47.6, pick: 9.9, ban: 3.3,
      skills: [
        { key: "P", name: "装填", desc: "6発撃つと装填に入り、短い間攻撃できない。" },
        { key: "1", name: "銀弾", desc: "強化した弾を撃ち、当たった敵の防御力を下げる。" },
        { key: "2", name: "転がり撃ち", desc: "短く転がり、すぐに装填を終える。" },
        { key: "U", name: "処刑の一発", desc: "遠くの敵1人を狙撃する。体力が少ないほどダメージが上がる。" }
      ],
      combo: ["1", "通常攻撃", "2", "通常攻撃"],
      comboNote: "装填の隙を転がり撃ちで消す。転がり撃ちを先に使うと、装填の間に狙われる。",
      build: ["hasteboots", "silverbarrel", "mistblade", "eclipse", "veildagger", "glassshield"],
      emblem: "ハンター:物理攻撃力",
      strong: ["morveth", "orrin"], weak: ["ilsyra", "nyxa"],
      play: "序盤は耐える。装備がそろう終盤に一番強くなる。",
      lane: "装填の隙に攻められないよう、弾数を数えて戦う。",
      team: "処刑の一発で逃げる敵を仕留める。前に出すぎない。",
      lore: "王冠の喪失の日に主君を失った狩人。銀弾は主君の王冠を溶かして作ったという。",
      events: ["crown-lost"], relations: [{ id: "orrin", type: "主従" }, { id: "ilsyra", type: "好敵手" }]
    },
    {
      id: "esme", name: "Esme Rook", title: "硝子の魔女", role: "MID", diff: 1, attr: "魔法", rgb: "120,60,70",
      desc: "砕けた硝子で戦場を区切る、扱いやすい魔女。",
      stats: { hp: 4, atk: 7, def: 4, spd: 5, aspd: 4 }, wr: 52.0, pick: 8.1, ban: 1.9,
      skills: [
        { key: "P", name: "反射", desc: "硝子に当たった敵の攻撃を一部はね返す。" },
        { key: "1", name: "破片", desc: "扇状に硝子の破片を飛ばす。" },
        { key: "2", name: "硝子の壁", desc: "細長い硝子の壁を作る。壁は攻撃で壊せる。" },
        { key: "U", name: "万華鏡", desc: "広い範囲を硝子で囲い、中の敵を遅くし続ける。" }
      ],
      combo: ["2", "1", "U"],
      comboNote: "壁で道を分けてから破片を撃つ。万華鏡は敵がまとまったときに。",
      build: ["mageboots", "stardust", "glassshield", "eclipse", "silentbell", "chainward"],
      emblem: "メイジ:魔法攻撃力",
      strong: ["orrin", "thessaly"], weak: ["sable", "morveth"],
      play: "壁で味方を守り、敵を分断する。操作が単純で初心者向け。",
      lane: "破片でミニオンをまとめて処理し、早めに味方を助けに行く。",
      team: "壁で敵の前衛と後衛を分ける。",
      lore: "王都の硝子職人の娘。星墜ちの夜に割れた窓の破片を、今も集め続けている。",
      events: ["star-night"], relations: [{ id: "kael", type: "協力者" }]
    },
    {
      id: "bram", name: "Bram Halloway", title: "廃都の傭兵", role: "EXP", diff: 3, attr: "物理", rgb: "110,100,70",
      desc: "廃都で生き延びた傭兵。読み合いで勝つ玄人向け。",
      stats: { hp: 7, atk: 7, def: 6, spd: 6, aspd: 5 }, wr: 48.2, pick: 5.6, ban: 2.8,
      skills: [
        { key: "P", name: "傭兵の勘", desc: "スキルをかわすと、次の攻撃が強化される。" },
        { key: "1", name: "突進", desc: "前方へ突進し、当たった敵を押し込む。" },
        { key: "2", name: "受け流し", desc: "短い間、正面からの攻撃を無効にして反撃する。" },
        { key: "U", name: "廃都の掟", desc: "敵1人と一騎打ちの場を作る。外からは手出しできない。" }
      ],
      combo: ["2", "1", "U"],
      comboNote: "受け流しで相手のスキルを誘ってから突進。外すと大きな隙になる。",
      build: ["ashboots", "inqhammer", "mistblade", "ashplate", "brokencrown", "sarcoarmor"],
      emblem: "ファイター:物理攻撃力と吸収",
      strong: ["morveth", "kael"], weak: ["orrin", "esme"],
      play: "一騎打ちで勝てる相手を選ぶ。読み負けると一気に不利になる。",
      lane: "相手の主要スキルを受け流しで誘い、使わせてから突進する。",
      team: "廃都の掟で相手の主力を隔離する。",
      lore: "王冠の喪失のあと、王都の廃墟で傭兵団を率いた男。Morvethの審問から唯一逃げ延びた。",
      events: ["crown-lost", "ash-inquisition"], relations: [{ id: "morveth", type: "宿敵" }, { id: "orrin", type: "元同僚" }]
    }
  ],

  /* Detailed matchup guides. Key = you|enemy|lane. Numbers are DEMO. */
  matchups: {
    "ilsyra|lucan|GOLD": {
      diff: 4, wr: 52.4, pick: 6.1, ban: null, games: "DEMO", edge: "やや有利",
      early: "射程で勝っているので、霧の矢でミニオンごと削る。Lucanの装填中だけ前に出る。",
      mid: "Lucanの装備がそろい始める前に、タワーを1本でも多く折る。",
      late: "終盤はLucanのほうが火力が高い。必ず前衛の後ろに立ち、処刑の一発の射線に入らない。",
      danger: [{ who: "enemy", key: "U", note: "処刑の一発は体力が少ないほど痛い。体力が半分を切ったら射線から外れる。" },
               { who: "enemy", key: "1", note: "銀弾を受けると防御力が下がり、そのあとの攻撃が重くなる。" }],
      counter: "銀弾は直線にしか飛ばない。ミニオンの後ろに立って防ぐ。",
      attack: "Lucanが6発撃ち切り、装填に入った瞬間に距離を詰める。",
      avoid: "茂みに入ったLucanを追って、ラインを離れる。",
      key: "敵の主要スキルが残っている間は不用意に前進しない",
      counterplay: "転がり撃ちを使わせてから攻める。転がり撃ちがない間、Lucanは装填の隙を消せない。",
      build: ["hasteboots", "mistblade", "glassshield", "silverbarrel", "veildagger", "eclipse"],
      itemTiming: "硝子の盾を3つ目に早める。処刑の一発で倒されにくくなる。",
      team: "Lucanより前に出ない。Lucanが前に出てきたら、味方の拘束に合わせて集中攻撃する。"
    },
    "morveth|bram|EXP": {
      diff: 3, wr: 49.1, pick: 4.2, ban: null, games: "DEMO", edge: "五分",
      early: "Bramの受け流し中に殴らない。受け流しが終わるのを見てから踏み込む。",
      mid: "灰の壁で退路を塞ぎ、味方のジャングルと挟む。",
      late: "Bramの一騎打ちに引き込まれないよう、味方の近くで戦う。",
      danger: [{ who: "enemy", key: "U", note: "廃都の掟に閉じ込められると味方が助けに来られない。体力が少ないときは近づかない。" },
               { who: "enemy", key: "2", note: "受け流しは正面からの攻撃を無効にする。見えたら攻撃を止める。" }],
      counter: "受け流しを見たら一歩下がり、終わってから壁と踏み込みを合わせる。",
      attack: "Bramが突進を外した直後。灰の壁で退路を塞ぐ。",
      avoid: "体力差がない状態でタワー下まで深追いする。",
      key: "敵の接近スキルを使用させた後、クールダウン中に反撃する",
      counterplay: "Bramは読み合いのキャラクター。こちらからスキルを先に見せず、待つ。",
      build: ["ashboots", "ashplate", "inqhammer", "sarcoarmor", "brokencrown", "chainward"],
      itemTiming: "灰の胸当てを2つ目に。序盤の殴り合いで負けにくくなる。",
      team: "Bramが味方の後衛に一騎打ちを仕掛けたら、壁で外から邪魔する。"
    },
    "kael|veyra|MID": {
      diff: 5, wr: null, pick: null, ban: null, games: "データ不足", edge: "不利",
      early: "Veyraの沈黙の詠唱が届かない距離から星屑を置く。",
      mid: "Veyraが封印を味方にかけた直後は、こちらの拘束が通らない。そのタイミングで大技を撃たない。",
      late: "鎮魂歌が使われたのを確認してから星墜ちを撃つ。",
      danger: [{ who: "enemy", key: "1", note: "沈黙中はスキルが使えない。詠唱を始める前に、Veyraの位置を確認する。" },
               { who: "enemy", key: "U", note: "鎮魂歌は広範囲。集団戦で星墜ちを封じられやすい。" }],
      counter: "沈黙の詠唱を空振りさせてから攻める。クールダウン中が唯一の攻めどき。",
      attack: "Veyraが封印を味方の援護に使った直後。",
      avoid: "詠唱中に正面から歩いて近づく。",
      key: "沈黙の詠唱が見えたら、大技を温存して一歩引く",
      counterplay: "引力で引き寄せる前に、沈黙が使われたかを見る。",
      build: ["mageboots", "stardust", "glassshield", "eclipse", "silentbell", "chainward"],
      itemTiming: "硝子の盾を早めに。沈黙から狙われても耐えられる。",
      team: "鎮魂歌のあとに星墜ち。順番を守れば、集団戦ではKaelのほうが強い。"
    },
    "nyxa|ilsyra|JUNGLE": {
      diff: 2, wr: 54.0, pick: 9.3, ban: null, games: "DEMO", edge: "有利",
      early: "Ilsyraの後退の霧が使われたかを確認してから奇襲する。",
      mid: "Ilsyraが霧の中にいるときは、茂みごと影渡りで入る。",
      late: "Ilsyraの周りに守りのキャラクターがいるときは、無理に入らない。",
      danger: [{ who: "enemy", key: "2", note: "後退の霧で距離を取られると、影渡りが届かない。" },
               { who: "enemy", key: "U", note: "霧雨で遅くされると、逃げ切れない。" }],
      counter: "帷で近づいて後退の霧を先に使わせ、そのあと影渡りで入る。",
      attack: "後退の霧がクールダウン中のとき。",
      avoid: "Thessalyなど守りのキャラクターが隣にいるときに飛び込む。",
      key: "後退の霧が使われたのを見てから、影渡りで背後に入る",
      counterplay: "霧の外へ出たIlsyraは脆い。茂みの出口で待つ。",
      build: ["hasteboots", "veildagger", "blackcloak", "mistblade", "eclipse", "ashplate"],
      itemTiming: "黒羽の外套を2つ目に。霧雨で遅くされても抜けられる。",
      team: "開戦の直後ではなく、Ilsyraが前衛を撃ち始めた瞬間に入る。"
    }
  },

  tierList: {
    EXP: { S: ["morveth"], A: ["orrin"], B: ["bram"] },
    GOLD: { S: ["ilsyra"], A: [], B: ["lucan"] },
    MID: { S: ["veyra"], A: ["esme"], B: ["kael"] },
    JUNGLE: { S: ["nyxa"], A: ["sable"], B: [] },
    ROAM: { S: ["thessaly"], A: ["calder"], B: [] }
  },

  changes: [
    { type: "buff", id: "ilsyra", text: "霧の矢のクールダウンを短縮。レーン中の牽制回数が増える。" },
    { type: "nerf", id: "nyxa", text: "影渡りの初撃ダメージを低下。序盤の奇襲が決まりにくくなる。" },
    { type: "adj", id: "kael", text: "星墜ちの詠唱時間を調整。射程は据え置き。" },
    { type: "buff", id: "thessaly", text: "聖鎖のシールド量を増加。集団戦の耐久力が上がる。" },
    { type: "nerf", id: "lucan", text: "終盤の攻撃力の伸びを抑制。" }
  ],

  metaNotes: [
    { title: "射手の序盤が強くなった", text: "Ilsyraの強化で、GOLD LANEは序盤から押し合いになりやすい。守りのROAMを合わせると安定する。" },
    { title: "暗殺者の奇襲が減る", text: "Nyxaの弱体化で、序盤のジャングルからの奇襲は決まりにくい。中盤以降の集団戦に重心が移る。" },
    { title: "沈黙を持つMIDの価値が上がる", text: "大技に頼るキャラクターが増えると、Veyraのように詠唱を止められるMIDが重宝される。" }
  ],

  news: [
    { date: "2026.11.14", cat: "PATCH", title: "パッチ X.XX 調整内容まとめ:射手環境はどう変わるか", to: "patch" },
    { date: "2026.11.10", cat: "GUIDE", title: "GOLD LANE 序盤の立ち回り:最初の主導権を取るために", to: "matchup-ilsyra-lucan-gold" },
    { date: "2026.11.06", cat: "META", title: "ROAM の採用傾向に変化:ランク帯別に見る", to: "patch" },
    { date: "2026.11.01", cat: "LORE", title: "新章「灰の審問」を公開:Morveth の過去", to: "lore-ash-inquisition" }
  ],

  lore: {
    history: [
      { era: "第一紀", title: "帳の時代", text: "世界は一枚の帳(VEIL)に覆われ、昼と夜の境目がなかった。" },
      { era: "第二紀", title: "王都の繁栄", text: "銀の王都アルセリオンが帳の外へ交易路を伸ばし、大陸を一つにまとめた。" },
      { era: "第三紀", title: "崩落", text: "帳が裂け、星が落ち、王冠が失われた。現在の戦乱はここから始まる。" }
    ],
    nations: [
      { id: "arcelion", name: "銀の王都アルセリオン", text: "王冠を失った王都。今は廃墟と、そこに住みつく傭兵団が残る。", members: ["orrin", "lucan", "calder", "bram", "esme"] },
      { id: "veilwood", name: "霧の森ヴェイル", text: "帳の名残である霧に覆われた森。森が燃えた夜から、霧は濃くなり続けている。", members: ["ilsyra", "nyxa", "sable"] },
      { id: "cloister", name: "沈黙の修道院", text: "声を捧げて祈る修道院。審問官を生み、そして審問によって半ば焼かれた。", members: ["thessaly", "veyra", "morveth", "kael"] }
    ],
    factions: [
      { name: "審問会", text: "帳を裂いた者を探し出し、裁くための組織。Morvethが最後の長。" },
      { name: "影の契約", text: "雇い主の名を明かさない暗殺者たちの集まり。NyxaとSableが属するとされる。" },
      { name: "王冠派", text: "失われた王冠を取り戻し、王都を再建しようとする者たち。" }
    ],
    events: [
      { id: "veil-fall", name: "霧の森の大火", era: "第三紀・初", text: "一夜で霧の森の半分が燃えた事件。火を放った者は見つかっていない。", members: ["ilsyra", "nyxa", "sable"] },
      { id: "star-night", name: "星墜ちの夜", era: "第三紀・初", text: "無数の星が王都に降り注いだ夜。拾われた星の欠片は、今も持ち主に未来を見せるという。", members: ["kael", "esme", "veyra"] },
      { id: "crown-lost", name: "王冠の喪失", era: "第三紀・中", text: "王都の王冠が何者かに奪われ、王家が途絶えた日。", members: ["orrin", "lucan", "calder", "bram"] },
      { id: "ash-inquisition", name: "灰の審問", era: "第三紀・中", text: "帳を裂いた者を探す審問が暴走し、修道院の半分が焼かれた。", members: ["morveth", "thessaly", "veyra", "bram"] }
    ],
    legends: [
      { title: "帳を縫う者", text: "裂けた帳を縫い直せる者がいつか現れる、という言い伝え。" },
      { title: "最初の星", text: "星墜ちの夜、最初に落ちた星だけはまだ誰にも拾われていない。" }
    ],
    secrets: [
      { title: "審問記録 第七号", text: "霧の森に火を放ったのは、審問会の命令を受けた者だったという記述がある。署名は焼け落ちている。" },
      { title: "王冠の行方", text: "王冠は溶かされたのではなく、石棺の中に眠っているという証言がある。" }
    ]
  }
};

/* Added sections (no statistics needed). Spells and items are original to VEIL. */
window.VEIL_EXTRA = {
  spells: { flash: "瞬身", judge: "断罪", vigor: "活力", purge: "浄化", ward: "守護の帳", rush: "疾走" },
  author: { name: "VEIL 編集部", note: "SAMPLE:ここに執筆者の名前と、プレイ歴や最高ランクなど攻略の根拠を書く" },
  heroes: {
    morveth: { spell: ["vigor", "長く前線に立つので、体力回復で粘る。"], swaps: [["glassshield", "相手に魔法の火力が多いとき"], ["hasteboots", "味方の後衛が狙われやすいとき"]],
      draft: "相手に射程の長い射手がいるときに強い。壁で近づく道を作れる。", phase: [3, 4, 4],
      mistakes: ["壁を逃げる敵の正面に置いて、逆に逃げ道を作ってしまう", "火刑台を一人の敵に使い、集団戦で使えなくなる", "体力が少ないのに前に出続ける"],
      tip: "壁は敵の後ろに置く。前に置くと味方の進路まで塞ぐ。", warn: "受け流しを持つ相手には、踏み込みを先に見せない。" },
    ilsyra: { spell: ["flash", "暗殺者から逃げる唯一の手段になる。"], swaps: [["blackcloak", "暗殺者に何度も狙われるとき"], ["glassshield", "処刑系の大技を持つ相手がいるとき"]],
      draft: "相手に守りの弱い射手がいると活きる。暗殺者が2体いる構成には出さない。", phase: [4, 4, 3],
      mistakes: ["後退の霧を前に出るために使う", "霧の外で長く撃ち合う", "茂みを確認せずにレーンを押し上げる"],
      tip: "霧の中から撃つとダメージが上がる。撃つ位置を先に決める。", warn: "後退の霧がクールダウン中は、半歩下がって戦う。" },
    kael: { spell: ["flash", "引力の射程を伸ばして奇襲できる。"], swaps: [["glassshield", "暗殺者に狙われるとき"], ["silentbell", "相手の大技が試合を決めるとき"]],
      draft: "相手の前衛が遅く、集団で固まる構成に強い。沈黙を持つMIDには出さない。", phase: [2, 4, 5],
      mistakes: ["星墜ちを動ける敵に撃つ", "星屑を近距離で撃って反撃される", "残光をためずに大技を急ぐ"],
      tip: "引力の直後に星屑。2つを1セットとして覚える。", warn: "詠唱中は動けない。周りに暗殺者がいないか先に見る。" },
    nyxa: { spell: ["judge", "ジャングルの効率と、とどめに使う。"], swaps: [["ashplate", "相手に拘束が多いとき"], ["glassshield", "魔法の範囲攻撃が多いとき"]],
      draft: "相手の後衛が守られていない構成に強い。守りのROAMが2体いると苦しい。", phase: [4, 4, 2],
      mistakes: ["拘束が残っている敵の集団に飛び込む", "倒しきれない相手を追い続ける", "序盤にレーンへ顔を出さない"],
      tip: "影渡りは帷のあとに使うと、背後を取りやすい。", warn: "終盤は一人で入らない。拘束が使われてから入る。" },
    thessaly: { spell: ["ward", "味方の後衛を守る時間を作る。"], swaps: [["blackcloak", "味方が暗殺者に狙われ続けるとき"], ["silentbell", "相手の大技を止めたいとき"]],
      draft: "味方に射手がいて、相手に暗殺者がいるときに一番活きる。", phase: [3, 4, 4],
      mistakes: ["誓約の円を自分を守るために使う", "射手から離れて茂みを探しに行く", "戒めを開戦に使い、守りに使えなくなる"],
      tip: "聖鎖は狙われている味方につなぐ。", warn: "誓約の円は一度きり。味方が倒れる直前まで待つ。" },
    orrin: { spell: ["vigor", "不屈と合わせて倒れにくくなる。"], swaps: [["glassshield", "魔法の火力が多いとき"], ["inqhammer", "味方の火力が足りないとき"]],
      draft: "初心者がEXP LANEを覚えるのに向いている。相手を選ばず出せる。", phase: [3, 3, 4],
      mistakes: ["最後の砦を体力が多いうちに使う", "号令を一人で使い、味方を置いていく", "倒れにくさを過信して深追いする"],
      tip: "体力が減るほど硬くなる。慌てて下がらない。", warn: "体力が減ったまま回復せずに次の戦闘に入らない。" },
    sable: { spell: ["judge", "序盤の奇襲で倒しきるために使う。"], swaps: [["ashplate", "相手に拘束が多いとき"], ["glassshield", "相手に魔法の火力が多いとき"]],
      draft: "序盤から動ける構成に入れる。終盤まで長引く試合は苦手。", phase: [5, 3, 2],
      mistakes: ["序盤に奇襲せずジャングルだけ回る", "群鴉を攻めに使い、逃げ道を失う", "黒羽を外したまま飛び込む"],
      tip: "黒羽が当たったら飛び込む合図。外したら待つ。", warn: "終盤は守りのキャラクターに近づかない。" },
    veyra: { spell: ["purge", "沈黙や拘束を受けても、自分の妨害を通せる。"], swaps: [["glassshield", "暗殺者に狙われるとき"], ["eclipse", "相手の前衛が柔らかいとき"]],
      draft: "相手に大技頼りのキャラクターが多いときに出す。", phase: [3, 4, 4],
      mistakes: ["沈黙の詠唱を雑魚処理に使う", "鎮魂歌を相手の大技の前に使う", "封印を自分にかけ忘れる場面で前に出る"],
      tip: "相手の大技の構えが見えた瞬間が、沈黙の使いどき。", warn: "沈黙を使ったあとは、次が戻るまで下がる。" },
    calder: { spell: ["flash", "棺の投擲と合わせて開戦の距離を作る。"], swaps: [["glassshield", "魔法の火力が多いとき"], ["silentbell", "相手の要が詠唱型のとき"]],
      draft: "味方に後から入る火力役がいるときに強い。", phase: [3, 4, 4],
      mistakes: ["棺の投擲を遠すぎる距離で投げる", "封棺を前衛に使う", "開戦したあと味方を待たずに下がる"],
      tip: "封棺は相手の一番大事なキャラクターに使う。", warn: "外したら一度下がる。外したまま前に残らない。" },
    lucan: { spell: ["flash", "装填中の隙を消すために使う。"], swaps: [["blackcloak", "暗殺者に狙われるとき"], ["ashplate", "拘束で止められやすいとき"]],
      draft: "味方の前衛が硬く、試合が長引きそうなときに出す。", phase: [2, 3, 5],
      mistakes: ["装填のタイミングで敵の前に立つ", "序盤から撃ち合いを仕掛ける", "処刑の一発を体力の多い敵に撃つ"],
      tip: "6発目を撃つ前に、安全な位置へ下がる。", warn: "序盤は無理をしない。装備がそろうまで耐える。" },
    esme: { spell: ["ward", "壁で守りきれないときの保険になる。"], swaps: [["silentbell", "相手の大技を止めたいとき"], ["eclipse", "相手の前衛が柔らかいとき"]],
      draft: "初心者のMIDに向いている。相手を選ばず出せる。", phase: [3, 4, 3],
      mistakes: ["硝子の壁で味方の道を塞ぐ", "万華鏡を敵が散らばっているときに使う", "破片を当てに前へ出すぎる"],
      tip: "壁は敵の前衛と後衛の間に置く。", warn: "壁は攻撃で壊れる。長く頼りすぎない。" },
    bram: { spell: ["rush", "突進と合わせて一騎打ちの距離に入る。"], swaps: [["glassshield", "魔法の火力が多いとき"], ["sarcoarmor", "相手に物理の火力が多いとき"]],
      draft: "一騎打ちで勝てる相手がいるときに出す。初心者には勧めない。", phase: [4, 4, 3],
      mistakes: ["受け流しを相手のスキルの前に使ってしまう", "廃都の掟を体力の多い相手に使う", "突進を外したあと逃げずに戦い続ける"],
      tip: "受け流しで相手のスキルを誘い、使わせてから攻める。", warn: "読み負けたらすぐ下がる。粘るほど不利になる。" }
  }
};

/* Slots for data that is not collected yet. Fill these later; the page shows them automatically.
   heroes.<id> may hold:
     tier: "S" | "A" | "B" | "C"
     patch: "1.2.34", updated: "2026.12.01"
     trend: [{ date: "2026-10-01", wr: 51.2 }, ...]            (win rate by day)
     rankStats: { epic: { wr, pick, ban }, legend: {...}, ... } (keys = rankGroups ids)
     counterDelta: { lucan: 2.1, nyxa: -3.4 }                    (win-rate difference, points)
     skins: [{ name: "Skin name", img: "file.png", credit: "© MOONTON" }]
     popularBuild: ["hasteboots", "mistblade", ...]                (recent popular build, 6 item keys)
     skillVideos: { P: "clips/ilsyra-p.mp4", "1": "clips/ilsyra-1.mp4", "2": "...", U: "..." }   (skill clips, MP4)
   itemCost: { ashboots: 710, ... } */
window.VEIL_SLOTS = {
  rankGroups: [
    { id: "epic", label: "Epic以下" }, { id: "legend", label: "Legend" }, { id: "mythic", label: "Mythic" },
    { id: "honor", label: "Mythical Honor" }, { id: "glory", label: "Mythical Glory以上" }
  ],
  itemCost: {},
  heroes: {}
};

/* Build variants. "atk" = attack, "def" = defense, "boots" = movement. Used to make the alternate builds. */
window.VEIL_BUILDS = {
  type: { ashboots: "boots", hasteboots: "boots", mageboots: "boots",
    mistblade: "atk", silverbarrel: "atk", veildagger: "atk", inqhammer: "atk", execblade: "atk", crimsonfang: "atk",
    stardust: "atk", eclipse: "atk", abysstome: "atk", starcrown: "atk", silentbell: "atk",
    ashplate: "def", sarcoarmor: "def", glassshield: "def", brokencrown: "def", chainward: "def", blackcloak: "def" },
  attack: { "物理": ["mistblade", "silverbarrel", "veildagger", "execblade", "crimsonfang"], "魔法": ["stardust", "eclipse", "abysstome", "starcrown", "silentbell"] },
  defense: ["ashplate", "sarcoarmor", "glassshield", "brokencrown", "chainward"],
  notes: {
    rec: "VEIL編集部のおすすめ。迷ったらこれ。",
    popular: "投稿された試合で、最近よく使われているビルド。",
    attack: "味方の前衛がそろっていて、自分が狙われにくいとき。倒しきる力は最大だが、倒されやすい。",
    balance: "相手の構成が読めないときの中間案。火力と耐久を半分ずつ。",
    defense: "相手の火力が高いとき、自分が前に立つ役のとき。倒されにくいが、倒しきる力は落ちる。"
  },
  roleNotes: { ROAM: { attack: "ROAMの役割(味方を守る・開戦する)とは合いにくい。試すなら味方に守り役がもう1人いるときだけ。" },
               GOLD: { defense: "射手が防具に寄せすぎると、終盤に火力が足りなくなりやすい。" } }
};

/* Overview (editorial, SAMPLE). ratings: 1-10. synergy = teammates that pair well. */
window.VEIL_OVERVIEW = {
  morveth: { tags: ["突撃", "妨害"], ratings: { dur: 8, off: 6, ctrl: 8, diff: 5 }, pros: ["壁で敵の逃げ道を切れる", "集団戦で複数の敵を閉じ込められる"], cons: ["足が遅く、引き撃ちに弱い", "壁の置き場所を間違えると味方の邪魔になる"], synergy: ["kael", "esme"] },
  ilsyra: { tags: ["遠距離", "牽制"], ratings: { dur: 3, off: 8, ctrl: 4, diff: 5 }, pros: ["射程が長く、レーン戦で削り勝ちやすい", "茂みを使うと火力が上がる"], cons: ["近づかれると脆い", "後退の霧がないときは逃げ手段がない"], synergy: ["thessaly", "calder"] },
  kael: { tags: ["範囲攻撃", "バースト"], ratings: { dur: 3, off: 9, ctrl: 6, diff: 9 }, pros: ["一撃で集団をまとめて削れる", "引力で敵を集められる"], cons: ["詠唱中に動けない", "沈黙を持つ相手に弱い"], synergy: ["morveth", "calder"] },
  nyxa: { tags: ["暗殺", "機動"], ratings: { dur: 3, off: 9, ctrl: 3, diff: 9 }, pros: ["孤立した後衛を確実に倒せる", "移動が速く、奇襲しやすい"], cons: ["拘束を受けるとすぐ倒れる", "終盤の集団戦では入りどころが難しい"], synergy: ["veyra", "orrin"] },
  thessaly: { tags: ["守護", "回復"], ratings: { dur: 6, off: 2, ctrl: 6, diff: 2 }, pros: ["味方を倒されなくする大技を持つ", "操作が分かりやすい"], cons: ["自分では敵を倒しにくい", "味方と離れると役割がなくなる"], synergy: ["ilsyra", "lucan"] },
  orrin: { tags: ["耐久", "前衛"], ratings: { dur: 9, off: 5, ctrl: 5, diff: 2 }, pros: ["とにかく倒れにくい", "長期戦ほど強くなる"], cons: ["敵を追いかける力が弱い", "火力は控えめ"], synergy: ["lucan", "esme"] },
  sable: { tags: ["奇襲", "序盤"], ratings: { dur: 4, off: 8, ctrl: 4, diff: 6 }, pros: ["序盤の奇襲で試合の流れを作れる", "群鴉で逃げにも使える"], cons: ["終盤は火力が伸びにくい", "黒羽を外すと仕掛けられない"], synergy: ["calder", "veyra"] },
  veyra: { tags: ["妨害", "沈黙"], ratings: { dur: 4, off: 6, ctrl: 9, diff: 5 }, pros: ["相手の大技を止められる", "集団戦をひっくり返す鎮魂歌を持つ"], cons: ["自分の火力は控えめ", "沈黙を外すと何もできない時間ができる"], synergy: ["kael", "nyxa"] },
  calder: { tags: ["開戦", "拘束"], ratings: { dur: 9, off: 3, ctrl: 9, diff: 5 }, pros: ["開戦の起点を作れる", "相手の要を封棺で止められる"], cons: ["足が遅い", "棺の投擲を外すと味方が不利になる"], synergy: ["kael", "ilsyra"] },
  lucan: { tags: ["遠距離", "終盤"], ratings: { dur: 3, off: 9, ctrl: 2, diff: 9 }, pros: ["終盤の火力が非常に高い", "処刑の一発で逃げる敵を仕留められる"], cons: ["序盤が弱い", "装填の隙を狙われやすい"], synergy: ["orrin", "thessaly"] },
  esme: { tags: ["分断", "初心者向け"], ratings: { dur: 4, off: 7, ctrl: 7, diff: 2 }, pros: ["壁で味方を守り、敵を分断できる", "操作が単純で覚えやすい"], cons: ["壁は攻撃で壊される", "一対一は得意ではない"], synergy: ["kael", "morveth"] },
  bram: { tags: ["一騎打ち", "上級者向け"], ratings: { dur: 7, off: 7, ctrl: 5, diff: 9 }, pros: ["一騎打ちに持ち込めば強い", "読み合いに勝つと一気に有利になる"], cons: ["読み負けると大きな隙ができる", "初心者には扱いにくい"], synergy: ["sable", "veyra"] }
};

/* SAMPLE statistics, generated (not real). Remove this block when real data arrives.
   trendByRank.<rankId or "all"> = [{ date, wr, games }]  (daily) */
(function () {
  var S = window.VEIL_SLOTS, D = window.VEIL_DATA, days = 30, end = Date.parse("2026-11-18");
  var base = { epic: 140, legend: 95, mythic: 60, honor: 28, glory: 11 };
  D.champions.forEach(function (c, ci) {
    var seed = 7 + ci * 97; function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    var byRank = {}, offs = {};
    S.rankGroups.forEach(function (g) { offs[g.id] = (rnd() - .5) * 6; });
    S.rankGroups.forEach(function (g) {
      var wr = c.wr + offs[g.id], arr = [];
      for (var i = 0; i < days; i++) {
        wr += (rnd() - .5) * 1.4 + (c.wr + offs[g.id] - wr) * .15;
        var games = Math.max(2, Math.round(base[g.id] * (c.pick / 10) * (.7 + rnd() * .6)));
        var d = new Date(end - (days - 1 - i) * 864e5).toISOString().slice(0, 10);
        arr.push({ date: d, wr: Math.round(wr * 10) / 10, games: games });
      }
      byRank[g.id] = arr;
    });
    var all = byRank.epic.map(function (p, i) {
      var g = 0, w = 0; S.rankGroups.forEach(function (r) { var q = byRank[r.id][i]; g += q.games; w += q.wr * q.games; });
      return { date: p.date, wr: Math.round(w / g * 10) / 10, games: g };
    });
    byRank.all = all;
    var rs = {};
    S.rankGroups.forEach(function (g) {
      var a = byRank[g.id], gm = 0, w = 0; a.forEach(function (q) { gm += q.games; w += q.wr * q.games; });
      rs[g.id] = { wr: w / gm, pick: Math.max(0.3, c.pick + (rnd() - .5) * 4), ban: Math.max(0.1, c.ban + (rnd() - .5) * 3), games: gm };
    });
    var h = S.heroes[c.id] = S.heroes[c.id] || {};
    h.sample = true; h.trendByRank = byRank; h.rankStats = rs;
  });
})();

/* Equipment (original to VEIL). Numbers (stats, cost) are not set yet: they show as データ待ち. */
window.VEIL_ITEMS = {
  ashboots: { cat: "boots", desc: "物理防御が上がる重いブーツ。前に立つキャラ向け。" },
  hasteboots: { cat: "boots", desc: "移動速度が大きく上がる。射手や暗殺者の基本。" },
  mageboots: { cat: "boots", desc: "スキルのクールダウンが短くなる。詠唱型のキャラ向け。" },
  mistblade: { cat: "atk", dmg: "物理", desc: "攻撃速度が上がり、霧の中からの攻撃が強くなる刃。" },
  silverbarrel: { cat: "atk", dmg: "物理", desc: "通常攻撃が相手の防御を一部無視する。硬い相手に。" },
  veildagger: { cat: "atk", dmg: "物理", desc: "背後からの一撃が重くなる短剣。奇襲向け。" },
  inqhammer: { cat: "atk", dmg: "物理", desc: "スキルを当てるたびに次の通常攻撃が強くなる大槌。" },
  execblade: { cat: "atk", dmg: "物理", desc: "体力の少ない相手へのダメージが上がる。とどめ役に。" },
  crimsonfang: { cat: "atk", dmg: "物理", desc: "与えたダメージの一部で体力が回復する。長く戦うキャラ向け。" },
  stardust: { cat: "atk", dmg: "魔法", desc: "魔法攻撃力が大きく上がる、魔法キャラの基本。" },
  eclipse: { cat: "atk", dmg: "魔法", desc: "相手の魔法防御を一部無視する宝珠。" },
  abysstome: { cat: "atk", dmg: "魔法", desc: "スキルを連続で当てるほど魔法ダメージが増える書。" },
  starcrown: { cat: "atk", dmg: "魔法", desc: "大技のダメージが上がる冠。終盤向け。" },
  silentbell: { cat: "atk", dmg: "魔法", desc: "スキルを当てた相手の回復量を減らす鐘。" },
  ashplate: { cat: "def", desc: "物理防御と体力が上がる胸当て。前衛の定番。" },
  sarcoarmor: { cat: "def", desc: "受けた通常攻撃の一部を跳ね返す鎧。" },
  glassshield: { cat: "def", desc: "魔法防御が上がり、体力が少ないときに盾を張る。" },
  brokencrown: { cat: "def", desc: "体力が大きく上がり、周りの味方を少し硬くする。" },
  chainward: { cat: "def", desc: "味方を守る効果が強くなる護符。守り役向け。" },
  blackcloak: { cat: "def", desc: "拘束から抜けやすくなる外套。狙われやすいキャラ向け。" }
};

/* Roles each character can be played in, with SAMPLE tier / rates / teammates per role. First = main role. */
window.VEIL_ROLESETS = {
  morveth: { EXP: { tier: "A", wr: 50.8, pick: 9.4, ban: 3.1, synergy: ["kael", "esme"] }, ROAM: { tier: "B", wr: 48.6, pick: 2.2, ban: 3.1, synergy: ["ilsyra", "lucan"] } },
  ilsyra: { GOLD: { tier: "S", wr: 52.4, pick: 18.2, ban: 6.0, synergy: ["thessaly", "calder"] }, MID: { tier: "B", wr: 47.9, pick: 1.8, ban: 6.0, synergy: ["morveth", "calder"] } },
  kael: { MID: { tier: "B", wr: 48.9, pick: 12.9, ban: 9.8, synergy: ["morveth", "calder"] }, ROAM: { tier: "C", wr: 46.2, pick: 1.1, ban: 9.8, synergy: ["nyxa", "orrin"] } },
  nyxa: { JUNGLE: { tier: "S", wr: 51.2, pick: 15.7, ban: 14.3, synergy: ["veyra", "orrin"] }, EXP: { tier: "B", wr: 49.0, pick: 2.6, ban: 14.3, synergy: ["sable", "veyra"] } },
  thessaly: { ROAM: { tier: "S", wr: 53.1, pick: 11.4, ban: 2.2, synergy: ["ilsyra", "lucan"] } },
  orrin: { EXP: { tier: "A", wr: 50.1, pick: 6.2, ban: 0.9, synergy: ["lucan", "esme"] }, ROAM: { tier: "A", wr: 51.4, pick: 3.0, ban: 0.9, synergy: ["kael", "lucan"] } },
  sable: { JUNGLE: { tier: "A", wr: 49.6, pick: 8.8, ban: 4.5, synergy: ["calder", "veyra"] }, EXP: { tier: "C", wr: 46.8, pick: 0.9, ban: 4.5, synergy: ["nyxa", "thessaly"] } },
  veyra: { MID: { tier: "S", wr: 51.7, pick: 10.1, ban: 7.4, synergy: ["kael", "nyxa"] }, ROAM: { tier: "A", wr: 50.6, pick: 3.4, ban: 7.4, synergy: ["ilsyra", "kael"] } },
  calder: { ROAM: { tier: "A", wr: 49.9, pick: 7.5, ban: 1.6, synergy: ["kael", "ilsyra"] }, EXP: { tier: "B", wr: 48.3, pick: 1.4, ban: 1.6, synergy: ["esme", "nyxa"] } },
  lucan: { GOLD: { tier: "B", wr: 47.6, pick: 9.9, ban: 3.3, synergy: ["orrin", "thessaly"] } },
  esme: { MID: { tier: "A", wr: 52.0, pick: 8.1, ban: 1.9, synergy: ["kael", "morveth"] }, ROAM: { tier: "B", wr: 49.3, pick: 1.6, ban: 1.9, synergy: ["ilsyra", "nyxa"] } },
  bram: { EXP: { tier: "B", wr: 48.2, pick: 5.6, ban: 2.8, synergy: ["sable", "veyra"] }, JUNGLE: { tier: "C", wr: 46.5, pick: 0.8, ban: 2.8, synergy: ["veyra", "esme"] } }
};

/* Emblems (7 types) and their talents. Talent names are original to VEIL.
   Each hero's emblem is set by VEIL_EMBLEM_OF below; the text after ":" in champions[].emblem is what it boosts. */
window.VEIL_EMBLEMS = {
  "共通": [["万能の構え", "攻撃と防御が少しずつ上がる"], ["適応", "状況に合わせて攻撃か防御が上がる"], ["不屈の心", "体力が少ないとき受けるダメージが減る"]],
  "タンク": [["鋼の意志", "受けるダメージを少し減らす"], ["不動の構え", "拘束される時間が短くなる"], ["盾の返礼", "受けた攻撃の一部を相手に返す"]],
  "アサシン": [["影走り", "移動速度が上がる"], ["急所狙い", "相手の物理防御を一部無視する"], ["仕留め", "体力の少ない相手へのダメージが上がる"]],
  "メイジ": [["魔力循環", "スキルのクールダウンが短くなる"], ["深淵", "相手の魔法防御を一部無視する"], ["詠唱強化", "大技のダメージが上がる"]],
  "ファイター": [["闘志", "物理攻撃力が上がる"], ["吸血", "与えたダメージの一部で回復する"], ["逆境", "体力が少ないほど攻撃が強くなる"]],
  "サポート": [["祈りの間", "味方を守ると自分も回復する"], ["導き", "近くの味方の移動速度が上がる"], ["献身", "回復とシールドの量が増える"]],
  "ハンター": [["鷹の目", "通常攻撃の射程が少し伸びる"], ["疾風", "攻撃速度が上がる"], ["狩人の印", "同じ相手を撃ち続けるとダメージが上がる"]]
};
/* [おすすめ, 代わりに使えるもの...] */
window.VEIL_EMBLEM_OF = { morveth: ["ファイター", "タンク"], ilsyra: ["ハンター", "共通"], kael: ["メイジ"], nyxa: ["アサシン"],
  thessaly: ["サポート", "タンク"], orrin: ["タンク", "共通"], sable: ["アサシン", "共通"], veyra: ["メイジ", "サポート"],
  calder: ["タンク", "サポート"], lucan: ["ハンター"], esme: ["共通", "メイジ"], bram: ["共通", "ファイター"] };
window.VEIL_DATA.champions.forEach(function (c) {
  var e = window.VEIL_EMBLEM_OF[c.id]; if (e) c.emblem = e[0] + ":" + (c.emblem.split(":")[1] || "");
});
