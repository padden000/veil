(function () {
  "use strict";
  var D = window.VEIL_DATA;
  var CH = {}; D.champions.forEach(function (c) { CH[c.id] = c; });
  var ROLE = {}; D.roles.forEach(function (r) { ROLE[r.id] = r; });

  /* ---------------- state (memory only) ---------------- */
  var S = {
    cf: { q: "", role: "ALL", diff: "ALL", attr: "ALL", sort: "games" },
    lab: { you: "", enemy: "", lane: "EXP" },
    rl: { lane: "ALL", cls: "ALL", laneToo: true, last: null, spinning: false },
    meta: { role: "ALL", key: "games", dir: -1 },
    secrets: {}
  };

  /* ---------------- helpers ---------------- */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (m) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]; }); }
  var IC = {
    dice: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2.5"/><circle cx="9" cy="9" r="1.1" fill="currentColor" stroke="none"/><circle cx="15" cy="15" r="1.1" fill="currentColor" stroke="none"/><circle cx="15" cy="9" r="1.1" fill="currentColor" stroke="none"/><circle cx="9" cy="15" r="1.1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none"/></svg>',
    arrow: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 12 H20 M14 6 L20 12 L14 18"/></svg>',
    search: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20 L16.5 16.5"/></svg>',
    chev: '<svg class="ic chev" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M6 9 L12 15 L18 9"/></svg>',
    menu: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 7 H20 M4 12 H20 M4 17 H20"/></svg>',
    close: '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M6 6 L18 18 M18 6 L6 18"/></svg>'
  };
  var LOGO = '<svg width="30" height="30" viewBox="0 0 40 40" aria-hidden="true" fill="none" stroke="#B99A68" stroke-width="1.2"><path d="M20 3 L37 20 L20 37 L3 20 Z"/><path d="M20 9 C12 16 12 24 20 31 C28 24 28 16 20 9 Z"/><path d="M20 15 L20 25"/></svg>';
  var SIG = {
    EXP: "M50 10 L80 22 L80 52 C80 72 64 84 50 90 C36 84 20 72 20 52 L20 22 Z M50 24 L50 76 M38 40 L62 40",
    GOLD: "M30 14 C72 30 72 70 30 86 M30 14 L30 86 M18 50 L86 50 M77 41 L86 50 L77 59",
    MID: "M50 10 L58 42 L90 50 L58 58 L50 90 L42 58 L10 50 L42 42 Z M50 42 A8 8 0 1 1 49.9 42",
    JUNGLE: "M66 12 A38 38 0 1 0 66 88 A30 30 0 1 1 66 12 Z M42 38 L54 50 L42 62",
    ROAM: "M50 18 A32 32 0 1 1 49.9 18 M50 32 A18 18 0 1 1 49.9 32 M50 6 L50 18 M50 82 L50 94 M6 50 L18 50 M82 50 L94 50"
  };
  function sigil(role, size, color, sw) {
    return '<svg class="sigil" width="' + size + '" height="' + size + '" viewBox="0 0 100 100" fill="none" stroke="' + (color || "rgba(232,229,223,.55)") + '" stroke-width="' + (sw || 0.9) + '" aria-hidden="true"><path d="' + SIG[role] + '"/></svg>';
  }
  function artBg(rgb) {
    return "background: radial-gradient(ellipse 80% 60% at 50% 38%, rgba(" + rgb + ",.55), transparent 70%), radial-gradient(ellipse 120% 50% at 50% 110%, #09090B 30%, transparent 70%), linear-gradient(180deg, #1c1c22, #111114);";
  }
  function portrait(c, sm) {
    /* with art: a zoomed crop of the hero's first picture, centred on its focus point; otherwise the class sigil */
    var a = c && c.id ? artPool(c)[0] : null;
    if (a) {
      var p = (a.pos || "50% 25%").split(" ");
      return '<span class="portrait has-img' + (sm ? " sm" : "") + '"><img src="' + esc(a.thumb || a.img) + '" alt="" loading="lazy" decoding="async" style="object-position:' + esc(a.pos || "50% 25%") + ";transform-origin:" + esc(p[0]) + " " + esc(p[1] || "25%") + '"></span>';
    }
    return '<span class="portrait' + (sm ? " sm" : "") + '" style="' + artBg(c.rgb) + '">' + sigil(c.sigil || c.role, sm ? 24 : 30, "#E8E5DF", 2) + "</span>";
  }

  function pips(n) { var s = ""; for (var i = 0; i < 3; i++) s += '<i class="' + (i < n ? "on" : "") + '"></i>'; return '<span class="pips" aria-label="難易度 ' + n + ' / 3">' + s + "</span>"; }
  function bars(n) { var s = ""; for (var i = 0; i < 5; i++) s += '<i class="' + (i < n ? "on" : "") + '"></i>'; return '<span class="bars" aria-label="対面難易度 ' + n + ' / 5">' + s + "</span>"; }
  function demo(t) { return '<span class="badge">' + (t || "DEMO") + "</span>"; }
  function pct(v) { return v == null ? "—" : v.toFixed(1) + "%"; }
  function laneLabel(id) { return ROLE[id] ? ROLE[id].label : id; }
  function muKey(y, e, l) { return y + "|" + e + "|" + l; }
  function muHash(y, e, l) { return "#matchup-" + y + "-" + e + "-" + l.toLowerCase(); }
  function secHead(num, en, jp, extra, right) {
    return '<div class="sec-head"><div class="t"><div class="n"><span class="mono gold" style="font-size:12px;letter-spacing:.2em">' + num + "</span>" + (extra || "") + '</div><h2>' + en + '</h2><p class="jp">' + jp + "</p></div>" + (right || "") + "</div>";
  }

  /* ruins silhouette, seeded */
  function ruins(width, height, top, n, seed, openH) {
    var r = seed; function rnd() { r = (r * 9301 + 49297) % 233280; return r / 233280; }
    var pts = [[0, height], [0, top + Math.round(rnd() * 40 - 20)]], x = 0, y;
    var steps = [0, 0, -18, 14, -40, 26, 60, -8];
    while (x < width) {
      x = Math.min(width, x + 18 + Math.round(rnd() * 42));
      y = top + steps[Math.floor(rnd() * steps.length)] + (rnd() < .25 ? Math.round(rnd() * 90) : 0);
      pts.push([x, pts[pts.length - 1][1]]); pts.push([x, y]);
    }
    pts.push([width, height]);
    var d = "M" + pts.map(function (p) { return p[0] + " " + p[1]; }).join(" L") + " Z";
    var bay = width / n;
    for (var i = 0; i < n; i++) {
      var x0 = Math.round(i * bay + bay * .22), x1 = Math.round((i + 1) * bay - bay * .22), xc = (x0 + x1) / 2;
      var ys = height - openH, ya = ys - (x1 - x0) * .95, ya2 = ys - (ys - ya) * .62;
      if (ya < top + 70) continue;
      d += " M" + x0 + " " + height + " L" + x0 + " " + ys + " Q" + x0 + " " + ya2 + " " + xc + " " + ya + " Q" + x1 + " " + ya2 + " " + x1 + " " + ys + " L" + x1 + " " + height + " Z";
    }
    return d;
  }
  function atmo(opts) {
    opts = opts || {};
    var h = opts.h || 360;
    return '<div class="atmo" aria-hidden="true">' +
      '<div style="position:absolute;inset:0;background:radial-gradient(ellipse 55% 60% at ' + (opts.lx || 70) + '% 25%, rgba(185,154,104,.15), transparent 70%), radial-gradient(ellipse 45% 55% at 5% 100%, rgba(113,32,42,.38), transparent 70%), radial-gradient(ellipse 80% 60% at 50% 0%, rgba(101,113,125,.12), transparent 70%)"></div>' +
      (opts.far === false ? "" : '<svg class="ruins" viewBox="0 0 1440 460" preserveAspectRatio="xMidYMax slice" style="height:' + Math.round(h * 1.3) + 'px;opacity:.9"><path fill="#141418" fill-rule="evenodd" d="' + ruins(1440, 460, 150, 6, opts.seed || 7, 230) + '"/></svg>') +
      '<div class="fog" style="bottom:40px;height:' + Math.round(h * .8) + 'px;background:radial-gradient(ellipse 40% 50% at 30% 60%, rgba(133,131,138,.16), transparent 70%), radial-gradient(ellipse 35% 45% at 75% 50%, rgba(133,131,138,.12), transparent 70%)"></div>' +
      '<svg class="ruins" viewBox="0 0 1440 300" preserveAspectRatio="xMidYMax slice" style="height:' + Math.round(h * .8) + 'px"><path fill="#0B0B0D" fill-rule="evenodd" d="' + ruins(1440, 300, 120, 9, (opts.seed || 7) + 4, 120) + '"/></svg>' +
      '<div class="fog b" style="bottom:-40px;height:' + Math.round(h * .5) + 'px;background:radial-gradient(ellipse 50% 60% at 50% 60%, rgba(133,131,138,.14), transparent 70%)"></div>' +
      '<div style="position:absolute;inset:0;background:linear-gradient(180deg, transparent 55%, #09090B 100%)"></div>' +
      '<svg class="grain"><filter id="g' + (opts.seed || 7) + '"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(#g' + (opts.seed || 7) + ')"/></svg>' +
      "</div>";
  }

  /* ---------------- shared pieces ---------------- */
  function laneMarks(c) {
    return '<span class="lmarks">' + D.roles.map(function (r) { var a = c.lanes && c.lanes[r.id]; return a ? '<span class="lm' + (a === "○" ? " main" : "") + '" title="' + r.label + (a === "○" ? "(一番多い)" : "(使われた)") + '">' + r.id.slice(0, 1) + (r.id === "JUNGLE" ? "G" : "") + "</span>" : ""; }).join("") + "</span>";
  }
  /* every picture we have for a hero: art.js entries plus skins that have an image */
  function artPool(c) {
    var A = (window.VEIL_ART || {})[c.id], SLh = ((window.VEIL_SLOTS || {}).heroes || {})[c.id] || {}, out = [], seen = {};
    [].concat(A ? (Array.isArray(A) ? A : [A]) : [], (SLh.skins || []).filter(function (k) { return k.img; })).forEach(function (a) {
      if (a && a.img && !seen[a.img]) { seen[a.img] = 1; out.push(a); }
    });
    return out;
  }
  /* one picture per visit, chosen at random; it stays the same until the page changes */
  function artOf(c) {
    var pool = artPool(c); if (!pool.length) return null;
    S.artSel = S.artSel || {};
    if (S.artSel[c.id] == null || S.artSel[c.id] >= pool.length) S.artSel[c.id] = Math.floor(Math.random() * pool.length);
    var a = pool[S.artSel[c.id]];
    return { img: a.img, thumb: a.thumb || a.img, pos: a.pos, credit: a.credit, name: a.name, n: pool.length, i: S.artSel[c.id] };
  }
  function champCard(c, extra) {
    return '<a class="card" href="#champion-' + c.id + '" aria-label="' + esc(c.name) + ' の詳細">' +
      '<div class="art" style="aspect-ratio:4/5">' + (artOf(c) ? '<div class="fill"><img class="art-img" src="' + esc(artOf(c).thumb) + '" alt="" loading="lazy" decoding="async" style="object-position:' + esc(artOf(c).pos || "50% 30%") + '"></div>' : '<div class="fill" style="' + artBg(c.rgb) + '">' + sigil(c.sigil, 120) + '</div>') + '<div class="shade"></div>' +
      '<span class="tag tl">' + laneLabel(c.role) + '</span>' + (artOf(c) ? "" : '<span class="tag dim tr" style="font-size:9px">ART</span>') + '</div>' +
      '<div class="cbody"><span class="cname mincho" style="font-size:26px">' + esc(c.name) + '</span><span class="ctitle serif" style="font-size:16px;letter-spacing:.04em">' + esc(c.en) + '</span>' +
      '<p class="cdesc" style="min-height:0">' + esc(c.desc) + '</p><div class="cfoot">' + laneMarks(c) +
      (extra || '<span class="mono muted num" style="font-size:10px">' + (c.games ? c.games + "試合 · " + pct(c.wr) : "記録なし") + "</span>") + "</div></div></a>";
  }

  function recOf(y, e, lane) { var s = (window.VEIL_STATS || {})[y]; return s && s.vs[e + "|" + lane] ? s.vs[e + "|" + lane] : null; }
  function topPairs(n) {
    var out = [], seen = {}, ST = window.VEIL_STATS || {};
    Object.keys(ST).forEach(function (id) { Object.keys(ST[id].vs).forEach(function (k) { var p = k.split("|"), key = [id, p[0]].sort().join("|") + "|" + p[1]; if (seen[key]) return; seen[key] = 1; out.push({ y: id, e: p[0], lane: p[1], r: ST[id].vs[k] }); }); });
    return out.sort(function (a, b) { return b.r.games - a.r.games || (b.r.wins / b.r.games) - (a.r.wins / a.r.games); }).slice(0, n);
  }
  function muCard(p) {
    var y = CH[p.y], e = CH[p.e], r = p.r, wr = r.wins / r.games * 100;
    return '<article class="card hov" style="background:linear-gradient(180deg,#17171C,#111114)">' +
      '<div class="mu-top"><div class="mu-side">' + portrait(y) + '<span style="display:flex;flex-direction:column;min-width:0"><span class="mono muted" style="font-size:9px">YOU</span><span class="mincho" style="font-size:19px;white-space:nowrap">' + esc(y.name) + '</span></span></div><span class="mu-vs">vs</span>' +
      '<div class="mu-side r">' + portrait(e) + '<span style="display:flex;flex-direction:column;min-width:0"><span class="mono muted" style="font-size:9px">ENEMY</span><span class="mincho" style="font-size:19px;white-space:nowrap">' + esc(e.name) + "</span></span></div></div>" +
      '<div class="mu-body"><span class="mono gold">' + laneLabel(p.lane) + '</span><div class="keyrule"><span class="k">KEY RULE</span><span class="v muted" style="font-size:15px">攻略メモは準備中です。</span></div></div>' +
      '<div class="mu-foot"><div style="display:flex;flex-direction:column;gap:8px"><div style="display:flex;align-items:baseline;gap:10px"><span class="bignum num">' + wr.toFixed(0) + '<span style="font-size:22px">%</span></span><span class="tag warn">' + r.games + "試合</span></div>" +
      '<span class="mono muted" style="font-size:10px">' + esc(y.name) + " 側の勝率 · VEIL集計</span></div>" +
      '<a class="link" href="' + muHash(p.y, p.e, p.lane) + '">対戦記録を見る' + IC.arrow + "</a></div></article>";
  }

  function crumbs(list) {
    return '<nav class="crumbs" aria-label="パンくずリスト">' + list.map(function (c, i) {
      return (i ? '<span class="sep">/</span>' : "") + (c[1] ? '<a href="' + c[1] + '">' + c[0] + "</a>" : '<span aria-current="page">' + c[0] + "</span>");
    }).join("") + "</nav>";
  }
  function selectField(id, label, options, value, cls) {
    return '<div class="field ' + (cls || "") + '"><label for="' + id + '">' + label + '</label><select id="' + id + '" data-bind="' + id + '">' +
      options.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === value ? " selected" : "") + ">" + esc(o[1]) + "</option>"; }).join("") + "</select>" + IC.chev + "</div>";
  }
  var champOpts = D.champions.slice().sort(function (a, b) { return a.name.localeCompare(b.name, "ja"); }).map(function (c) { return [c.id, c.name + " (" + c.en + ")"]; });
  var laneOpts = D.roles.map(function (r) { return [r.id, r.label]; });

  /* ---------------- HOME ---------------- */
  function viewHome() {
    var MI = window.VEIL_MATCH_INFO || { count: 0 };
    var featured = D.champions.slice().sort(function (a, b) { return b.games - a.games || (b.wr || 0) - (a.wr || 0); }).slice(0, 4);
    var news = D.news.map(function (n) {
      return '<a class="row" href="#' + n.to + '" style="padding:24px 8px"><span class="mono muted num" style="width:110px;font-size:12px">' + n.date + '</span><span class="mono gold" style="width:72px">' + n.cat + '</span><span class="mincho" style="flex:1 1 320px;font-size:19px;line-height:1.6">' + esc(n.title) + '</span><span class="muted">' + IC.arrow + "</span></a>";
    }).join("");
    var topWr = D.champions.filter(function (c) { return c.games >= 5; }).sort(function (a, b) { return b.wr - a.wr; }).slice(0, 5);
    var gate = "M0 640 L0 520 L180 520 L180 300 L260 300 L260 520 L460 520 L460 230 Q460 60 720 20 Q980 60 980 230 L980 520 L1180 520 L1180 300 L1260 300 L1260 520 L1440 520 L1440 640 Z M540 640 L540 280 Q540 140 720 100 Q900 140 900 280 L900 640 Z";
    return '<section class="hero" aria-label="メインビジュアル">' + atmo({ h: 420, far: false, lx: 68 }).replace('<div class="atmo" aria-hidden="true">', '<div class="atmo" aria-hidden="true"><div class="hero-art"><img src="kagura-skin.png" alt=""></div><div style="position:absolute;inset:0;background:linear-gradient(90deg, rgba(9,9,11,.82) 0%, rgba(9,9,11,.5) 40%, rgba(9,9,11,0) 70%)"></div>') +
      '<div class="wrap hero-body"><div class="hero-copy"><span class="eyebrow rise">TACTICAL INTELLIGENCE ARCHIVE</span>' +
      '<h1 class="rise d1">KNOW YOUR<br>ENEMY.<br><em>Master the Veil.</em></h1>' +
      '<p class="lead rise d2">勝敗を分けるのは、相手を知っているかどうか。<br>対面ごとの記録と立ち回りを、ひとつの書庫に。</p>' +
      '<div class="rise d3" style="display:flex;flex-wrap:wrap;gap:14px"><a class="btn primary" href="#matchup">対面を調べる' + IC.arrow + '</a><a class="btn ghost" href="#champions">ヒーロー図鑑</a></div></div>' +
      '<div class="hero-caption"><span class="eyebrow" style="font-size:11px">FEATURED · NEW SKIN</span><span class="mincho" style="font-size:28px;letter-spacing:.12em">神楽</span><span class="mono muted" style="font-size:10px">ARTWORK © MOONTON</span></div></div>' +
      '<div class="wrap"><form class="qbar" data-form="quick" aria-label="対面をすばやく検索"><div class="qtitle"><span class="mono gold">MATCHUP LAB</span><span class="mincho" style="font-size:17px">対面を検索する</span></div>' +
      selectField("q-you", "YOU · 自分", champOpts, S.lab.you) + selectField("q-enemy", "ENEMY · 相手", champOpts, S.lab.enemy) + selectField("q-lane", "LANE · レーン", laneOpts, S.lab.lane) +
      '<button class="btn primary" type="submit">検索' + IC.arrow + "</button></form></div></section>" +

      '<section class="band" aria-label="タグライン"><div class="wrap"><span class="rule"></span><p>“Every battle leaves a trace.”</p><span class="rule r"></span></div></section>' +

      '<section class="section"><div class="wrap">' + secHead("01", "THE RECORD", "VEILの集計", "", '<a class="link" href="#patch">PATCH &amp; META へ' + IC.arrow + "</a>") +
      '<div class="split"><div class="panel" style="flex:1 1 320px;display:flex;flex-direction:column;justify-content:space-between;gap:28px;min-height:340px">' +
      '<div style="display:flex;flex-direction:column;gap:14px"><span class="mono muted">RECORDED MATCHES</span><span class="serif num" style="font-size:88px;line-height:.9">' + MI.count + '</span><span class="mono muted num" style="font-size:11px">' + (MI.from ? MI.from.replace(/-/g, ".") + " 〜 " + MI.to.replace(/-/g, ".") : "") + " · " + esc((MI.ranks || []).join(" / ")) + "</span></div>" +
      '<p class="mincho" style="font-size:15px;line-height:2;color:var(--mid)">記録した試合の両チームのピックから集計しています。試合数が少ないうちは、数字が大きくぶれます。</p></div>' +
      '<div style="flex:2 1 560px;min-width:0;display:flex;flex-direction:column;gap:12px"><span class="mono gold" style="font-size:10px">勝率の高いヒーロー(5試合以上)</span><div class="rows">' + topWr.map(function (c) {
        return '<a class="row" href="#champion-' + c.id + '">' + portrait(c, true) + '<span style="display:flex;flex-direction:column;width:170px"><span class="mincho" style="font-size:19px;line-height:1.2">' + esc(c.name) + '</span><span class="mono muted" style="font-size:10px">' + esc(c.en) + '</span></span><span class="serif num" style="font-size:26px;width:90px">' + pct(c.wr) + '</span><span class="mono muted num" style="flex:1;font-size:11px">' + c.games + "試合 · " + esc(c.desc) + '</span><span class="muted">' + IC.arrow + "</span></a>";
      }).join("") + "</div></div></div></div></section>" +

      '<section class="section" style="background:linear-gradient(180deg,#09090B,#111114 40%,#09090B)"><div class="wrap">' + secHead("02", "HEROES", "よく使われているヒーロー", "", '<a class="link" href="#champions">図鑑をすべて見る' + IC.arrow + "</a>") +
      '<div class="grid g4">' + featured.map(function (c) { return champCard(c); }).join("") + "</div></div></section>" +

      '<section class="section" aria-label="よく当たる対面"><div class="wrap">' + secHead("03", "MATCHUP LAB", "よく当たる対面 — 記録が多い組み合わせ", "", '<a class="link" href="#matchup">対面を検索する' + IC.arrow + "</a>") +
      '<div class="grid g3">' + topPairs(3).map(muCard).join("") + "</div></div></section>" +

      '<section class="section" style="padding-top:64px" aria-label="お知らせ"><div class="wrap">' + secHead("04", "DISPATCHES", "お知らせ") + '<div class="rows">' + news + "</div></div></section>" +

      '<section style="position:relative;overflow:hidden;border-top:1px solid var(--line)" aria-label="世界観への導線">' +
      '<div class="atmo" aria-hidden="true"><div class="breath" style="position:absolute;left:50%;top:120px;width:560px;height:560px;margin-left:-280px;border-radius:50%;background:radial-gradient(circle, rgba(185,154,104,.35), rgba(113,32,42,.25) 40%, transparent 70%);filter:blur(30px)"></div>' +
      '<svg class="ruins" viewBox="0 0 1440 640" preserveAspectRatio="xMidYMax slice" style="height:100%"><path fill="#0B0B0D" fill-rule="evenodd" d="' + gate + '"/></svg></div>' +
      '<div class="wrap" style="position:relative;padding-top:190px;padding-bottom:140px;display:flex;flex-direction:column;align-items:center;gap:26px;text-align:center">' +
      '<span class="mono gold" style="font-size:12px;letter-spacing:.32em">05 · LORE ARCHIVE</span><h2 class="serif" style="font-size:clamp(46px,6.4vw,96px);line-height:1;font-weight:400">The Veil <em class="gold">remembers.</em></h2>' +
      '<p class="mincho" style="font-size:17px;line-height:2;color:var(--mid);max-width:560px">世界観の記録は準備中です。</p>' +
      '<a class="btn ghost" href="#lore" style="border-color:rgba(185,154,104,.5);color:var(--text);background:rgba(9,9,11,.5)">LORE ARCHIVE へ' + IC.arrow + "</a></div></section>";
  }

  /* ---------------- CHAMPIONS ---------------- */
  function filteredChamps() {
    var f = S.cf, q = f.q.trim().toLowerCase();
    return D.champions.filter(function (c) {
      return (f.role === "ALL" || (c.lanes && c.lanes[f.role])) && (f.diff === 0 || f.diff === "ALL" || !f.diff || c.cls === f.diff) &&
        (!q || c.name.toLowerCase().indexOf(q) >= 0 || c.en.toLowerCase().indexOf(q) >= 0);
    }).sort(function (a, b) {
      if (f.sort === "games") return b.games - a.games || a.en.localeCompare(b.en);
      if (f.sort === "wr") return ((b.games ? b.wr : -1) - (a.games ? a.wr : -1)) || b.games - a.games;
      if (f.sort === "en") return a.en.localeCompare(b.en);
      return a.name.localeCompare(b.name, "ja");
    });
  }

  function champGrid() {
    var list = filteredChamps();
    document.querySelectorAll("[data-count]").forEach(function (el) { el.textContent = list.length; });
    if (!list.length) return '<div class="empty"><svg width="48" height="48" viewBox="0 0 40 40" fill="none" stroke="#85838A" stroke-width=".8" aria-hidden="true"><path d="M20 3 L37 20 L20 37 L3 20 Z"/><path d="M14 20 L26 20"/></svg><h3>該当するキャラクターはいません</h3><p class="muted" style="font-size:14px">条件を減らすか、別の名前で検索してください。</p><button class="btn ghost" type="button" data-action="reset-filters">条件をリセット</button></div>';
    return '<div class="grid g4">' + list.map(function (c) { return champCard(c); }).join("") + "</div>";
  }
  function chips(group, opts, cur) {
    return opts.map(function (o) { return '<button type="button" class="chip" data-action="filter" data-group="' + group + '" data-value="' + o[0] + '" aria-pressed="' + (String(cur) === String(o[0])) + '">' + o[1] + "</button>"; }).join("");
  }
  function viewChampions() {
    var f = S.cf; if (f.diff === 0) f.diff = "ALL";
    var cls = window.VEIL_CLS_JP || {};
    return '<section class="phead">' + atmo({ h: 260, seed: 21 }) + '<div class="wrap">' + crumbs([["HOME", "#home"], ["CHAMPIONS"]]) +
      '<div class="phead-row"><div style="display:flex;flex-direction:column;gap:14px"><h1 class="rise">CHAMPIONS</h1><p class="jp rise d1">ヒーロー図鑑 — 全' + D.champions.length + '体</p></div>' +
      '<div style="display:flex;align-items:baseline;gap:12px"><span class="serif gold num" style="font-size:64px;line-height:1" data-count>' + filteredChamps().length + '</span><span class="mono muted">/ ' + D.champions.length + " 体を表示</span></div></div></div></section>" +
      '<section class="section tight" style="padding-top:40px"><div class="wrap" style="display:flex;flex-direction:column;gap:40px">' +
      '<div class="filters" role="search"><div class="frow"><div class="fsearch">' + IC.search + '<label for="cf-q" class="sr">名前で検索</label><input id="cf-q" type="search" placeholder="名前で検索(日本語・英語)" value="' + esc(f.q) + '" data-input="cf-q" autocomplete="off"></div>' +
      '<div class="fsort"><label for="cf-sort" class="mono muted" style="font-size:10px">SORT</label><select id="cf-sort" data-bind="cf-sort">' +
      [["name", "名前順"], ["en", "英語名順"], ["games", "試合数が多い順"], ["wr", "勝率が高い順"]].map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === f.sort ? " selected" : "") + ">" + o[1] + "</option>"; }).join("") + "</select>" + IC.chev + "</div></div>" +
      '<div class="fgroups"><div class="fgroup" role="group" aria-label="レーン"><span class="mono gold" style="font-size:10px">LANE</span>' + chips("role", [["ALL", "ALL"]].concat(D.roles.map(function (r) { return [r.id, r.id]; })), f.role) + "</div>" +
      '<div class="fgroup" role="group" aria-label="クラス"><span class="mono gold" style="font-size:10px">CLASS</span>' + chips("diff", [["ALL", "ALL"]].concat(Object.keys(cls).map(function (k) { return [k, cls[k]]; })), f.diff) + "</div></div></div>" +
      '<a class="rl-cta" href="#roulette">' + IC.dice + '<span><b>使うヒーローに迷ったら</b><span class="muted">条件をしぼってルーレットで決める</span></span>' + IC.arrow + '</a><p class="sample-note">レーンは記録した試合で実際に使われたレーンです。カード右下の記号は、一番多く使われたレーンが金色、ほかに使われたレーンが灰色です。</p>' +
      '<div id="champ-grid" aria-live="polite">' + champGrid() + "</div></div></section>";
  }

  /* background behind the detail body: the hero's art, faint and blurred; without art, a large sigil and haze in the class colour */
  function bodyBg(c, ART) {
    var inner = ART
      ? '<img class="dbody-art" src="' + esc(ART.img) + '" alt="" style="object-position:' + esc(ART.pos || "50% 30%") + '">'
      : '<div class="dbody-sig">' + sigil(c.sigil, 560, "rgba(185,154,104,.5)", 0.5) + "</div>";
    return '<div class="dbody-bg" aria-hidden="true"><div class="dbody-pin">' +
      '<div class="dbody-glow" style="background:radial-gradient(ellipse 50% 55% at 82% 35%, rgba(' + c.rgb + ',.20), transparent 70%), radial-gradient(ellipse 40% 45% at 8% 90%, rgba(113,32,42,.22), transparent 70%)"></div>' +
      inner +
      '<svg class="ruins dbody-ruins" viewBox="0 0 1440 300" preserveAspectRatio="xMidYMax slice"><path fill="#0E0E11" fill-rule="evenodd" d="' + ruins(1440, 300, 140, 9, 51, 120) + '"/></svg>' +
      '<div class="fog dbody-fog"></div>' +
      '<svg class="grain"><filter id="gb"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(#gb)"/></svg>' +
      "</div></div>";
  }

  /* ---------------- CHAMPION DETAIL ---------------- */
  function viewChampion(id) {
    var c = CH[id];
    if (!c) return viewNotFound("このヒーローは見つかりませんでした。");
    if (S.dtabFor !== c.id) { S.dtabFor = c.id; S.dtab = "sec-overview"; }
    var P = function (pid) { return 'id="' + pid + '" role="tabpanel" aria-labelledby="tab-' + pid + '" tabindex="0"' + (S.dtab === pid ? "" : " hidden"); };
    var SL = window.VEIL_SLOTS || { heroes: {} }, Y = SL.heroes[c.id] || {};
    var VID = Y.skillVideos || {};
    var prep = function (what) { return '<div class="slot" style="min-height:120px"><span class="mono muted" style="font-size:10px">準備中</span><span class="muted" style="font-size:13px">' + what + "</span></div>"; };
    function muList(ids) {
      if (!ids.length) return '<p class="muted" style="font-size:13px">まだ対戦記録がありません。</p>';
      return '<div class="side-list">' + ids.map(function (oid) {
        var o = CH[oid], r = recOf(c.id, oid, c.role);
        return '<a href="' + muHash(c.id, oid, c.role) + '">' + portrait(o, true) + '<span style="display:flex;flex-direction:column;flex:1;min-width:0"><span class="mincho" style="font-size:17px;line-height:1.2">' + esc(o.name) + '</span><span class="mono muted" style="font-size:10px">' + esc(o.en) + "</span></span>" +
          (r ? '<span class="delta mono num" style="color:var(--text)">' + Math.round(r.wins / r.games * 100) + '%</span><span class="tag dim">' + r.games + "試合</span>" : "") + "</a>";
      }).join("") + "</div>";
    }
    var same = D.champions.filter(function (o) { return o.cls === c.cls && o.id !== c.id; }).sort(function (a, b) { return b.games - a.games; }).slice(0, 6).map(function (o) {
      return '<a href="#champion-' + o.id + '">' + portrait(o, true) + '<span style="display:flex;flex-direction:column;flex:1;min-width:0"><span class="mincho" style="font-size:17px;line-height:1.2">' + esc(o.name) + '</span><span class="mono muted" style="font-size:10px">' + esc(o.en) + "</span></span></a>";
    }).join("");
    var skillSlots = ["P", "1", "2", "U"].map(function (k) {
      var lab = k === "P" ? "パッシブ" : k === "U" ? "アルティメット" : "スキル" + k, src = VID[k];
      var vid = src ? '<button type="button" class="vclip" data-action="video" aria-label="' + lab + 'の動画を再生・停止"><video src="' + esc(src) + '" muted loop playsinline preload="none"></video><span class="vplay mono" aria-hidden="true">▶ PLAY</span><span class="vcredit mono">映像 © MOONTON</span></button>' : '<div class="vclip slot"><span class="mono muted" style="font-size:10px">' + lab + ' · 動画の枠</span><span class="muted" style="font-size:11px">16:9 · 5〜10秒</span></div>';
      return '<div class="skill"><span class="key">' + (k === "P" ? "P" : k === "U" ? "U" : "S" + k) + '</span><div style="display:flex;flex-direction:column;gap:4px"><h3 class="muted">' + lab + '</h3><p class="muted">スキル名と説明は準備中です。</p></div>' + vid + "</div>";
    }).join("");
    var hasSkins = !!(Y.skins && Y.skins.length);
    var skins = hasSkins ? '<div class="skins">' + Y.skins.map(function (k) { return '<figure class="skin"><img src="' + esc(k.img) + '" alt="' + esc(k.name) + '" loading="lazy"><figcaption><span class="mincho">' + esc(k.name) + '</span><span class="mono muted" style="font-size:9px">' + esc(k.credit || "© MOONTON") + "</span></figcaption></figure>"; }).join("") + "</div>" : '<p class="muted" style="font-size:14px">スキン情報は準備中です。</p>';
    var faq = [
      [c.name + " のクラスは?", c.desc + "。記録した試合では主に " + laneLabel(c.role) + " で使われています" + (D.roles.some(function (r) { return c.lanes[r.id] === "△"; }) ? "(ほかに " + D.roles.filter(function (r) { return c.lanes[r.id] === "△"; }).map(function (r) { return r.label; }).join("、") + ")。" : "。")],
      ["勝率はどれくらいですか?", c.games ? "VEILが記録した " + c.games + " 試合で " + pct(c.wr) + "(両チームのピックを集計)。試合数が少ないため、目安として見てください。" : "まだ記録した試合に登場していません。"],
      ["おすすめのビルドは?", "ビルド情報は準備中です。"]
    ].map(function (q) { return "<details><summary>" + esc(q[0]) + "</summary><p>" + esc(q[1]) + "</p></details>"; }).join("");

    var ART = artOf(c);
    return '<section class="dhero' + (ART ? " has-art" : "") + '">' + atmo({ h: 300, seed: 33, lx: 30 }) +
      (ART ? '<div class="dbg" aria-hidden="true"><img src="' + esc(ART.img) + '" alt="" style="object-position:' + esc(ART.pos || "50% 30%") + '"></div><span class="dbg-credit mono">' + (ART.name ? esc(ART.name) + " · " : "") + esc(ART.credit || "© MOONTON") + "</span>" + (ART.n > 1 ? '<button type="button" class="dbg-next mono" data-action="artnext" data-id="' + c.id + '" aria-label="別のスキンの画像にする">SKIN ' + (ART.i + 1) + " / " + ART.n + " ↻</button>" : "") : "") +
      '<div class="wrap" style="flex-direction:column;align-items:stretch;gap:28px">' + crumbs([["HOME", "#home"], ["CHAMPIONS", "#champions"], [esc(c.name)]]) +
      '<div style="display:flex;flex-wrap:wrap;gap:48px;align-items:flex-end">' + (ART ? "" : '<div class="dvisual" style="' + artBg(c.rgb) + '">' + sigil(c.sigil, 180) + '<span class="tag dim" style="position:absolute;top:14px;right:14px;font-size:9px">背景画像の枠</span></div>') +
      '<div class="dinfo"><span class="eyebrow">' + esc(c.desc) + '</span><h1 class="rise mincho" style="letter-spacing:.06em">' + esc(c.name) + '</h1><p class="serif gold rise d1" style="font-size:24px;letter-spacing:.06em">' + esc(c.en) + "</p>" +
      '<p class="mono muted" style="font-size:11px">VEIL集計 · ' + (window.VEIL_MATCH_INFO || {}).count + " 試合中 " + c.games + " 試合に登場</p>" +
      roleChips(c) + '<div class="facts" id="role-facts">' + roleFacts(c) + "</div></div></div></div></section>" +

      '<section class="section tight dbody" style="padding-top:0">' + bodyBg(c, ART) + '<nav class="dtabs" aria-label="ページ内の項目"><div class="wrap" role="tablist" aria-label="ヒーロー情報">' +
      [["sec-overview", "概要"], ["sec-skills", "スキル"], ["sec-build", "ビルド"], ["sec-matchups", "対面"], ["sec-stats", "統計"], ["sec-guide", "立ち回り"], ["sec-skins", "スキン"], ["sec-faq", "FAQ"]].map(function (t) {
        var on = S.dtab === t[0];
        return '<button type="button" class="dtab" role="tab" id="tab-' + t[0] + '" aria-controls="' + t[0] + '" aria-selected="' + on + '" tabindex="' + (on ? 0 : -1) + '" data-action="tab" data-target="' + t[0] + '">' + t[1] + "</button>";
      }).join("") + "</div></nav>" +
      '<div class="wrap" style="display:flex;flex-direction:column;gap:40px;padding-top:36px"><div class="dgrid"><div style="display:flex;flex-direction:column;gap:64px;min-width:0">' +

      '<div class="block" ' + P("sec-overview") + '><h2>OVERVIEW <small>概要</small></h2>' +
      '<div class="cta-mu"><div style="display:flex;flex-direction:column;gap:6px"><span class="mono gold">MATCHUP LAB</span><span class="mincho" style="font-size:20px">' + esc(c.name) + ' の対面を調べる</span><span class="muted" style="font-size:13px">相手とレーンを選ぶと、記録した対戦成績を表示します。</span></div>' +
      '<button class="btn primary" type="button" data-action="lab-from" data-id="' + c.id + '">対面を選ぶ' + IC.arrow + "</button></div>" +
      '<div class="ov-tags">' + ((window.VEIL_OVERVIEW || {})[c.id] || { tags: [] }).tags.map(function (t, i) { return '<span class="tag' + (i ? " dim" : "") + '">' + esc(t) + "</span>"; }).join("") + "</div>" +
      '<div class="ov-grid"><div class="ov-rates"><span class="mono gold" style="font-size:10px">使われたレーン</span>' + (function () { var ST = (window.VEIL_STATS || {})[c.id] || { lane: {}, all: { games: 0 } }; return D.roles.map(function (r) { var x = ST.lane[r.id], n = x ? x.games : 0; return '<div class="rate"><span>' + r.id + '</span><span class="track"><i style="width:' + (ST.all.games ? Math.round(n / ST.all.games * 100) : 0) + '%"></i></span><span class="mono num">' + n + "</span></div>"; }).join(""); })() + '<span class="muted" style="font-size:11px">記録した試合で、そのレーンで使われた回数です</span></div>' +
      '<div class="ov-pc"><div><span class="mono gold" style="font-size:10px">長所</span><p class="muted" style="font-size:13px">準備中</p></div><div><span class="mono" style="font-size:10px;color:var(--redtext)">短所</span><p class="muted" style="font-size:13px">準備中</p></div></div></div>' +
      '<div class="ov-syn" id="role-syn">' + roleSynergy(c) + "</div></div>" +

      '<div class="block" ' + P("sec-skills") + '><h2>SKILLS <small>スキル</small></h2><div>' + skillSlots + "</div></div>" +

      '<div class="block" ' + P("sec-build") + '><h2>BUILD <small>ビルド</small></h2>' + prep("おすすめ・直近の人気・フル火力・バランス・フル防具のビルドを、ここに表示します。") +
      '<div class="loadout"><div id="emb-box" class="embwrap">' + embBox(c) + '</div><div class="item"><b>SPELL · バトルスキル</b><span class="muted" style="font-size:13px">このヒーローのおすすめはデータ待ちです</span><a class="link" href="#spells" style="padding:0">バトルスキルの一覧を見る' + IC.arrow + '</a></div></div></div>' +

      '<div class="block" ' + P("sec-matchups") + '><h2>MATCHUPS <small>' + laneLabel(c.role) + ' での対戦成績</small></h2><div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:24px">' +
      '<div style="display:flex;flex-direction:column;gap:12px"><span class="mono gold" style="font-size:10px">勝ち越している相手</span>' + muList(c.strong) + "</div>" +
      '<div style="display:flex;flex-direction:column;gap:12px"><span class="mono" style="font-size:10px;color:var(--redtext)">負け越している相手</span>' + muList(c.weak) + "</div></div>" +
      '<p class="muted" style="font-size:12px">同じレーンで当たった相手との記録です。試合数が少ないため、相性の目安として見てください。</p></div>' +

      '<div class="block" ' + P("sec-stats") + '><h2>STATISTICS <small>統計</small></h2><div id="stats-box" style="display:flex;flex-direction:column;gap:18px">' + statsBox(c) + "</div></div>" +

      '<div class="block" ' + P("sec-guide") + '><h2>PLAYBOOK <small>立ち回り</small></h2>' + prep("基本の立ち回り・レーン戦・集団戦・よくあるミスを、ここに書きます。") + "</div>" +

      '<div class="block" ' + P("sec-skins") + '><h2>SKINS <small>スキン</small></h2>' + skins + "</div>" +

      '<div class="block" ' + P("sec-faq") + '><h2>FAQ <small>よくある質問</small></h2><div class="faq">' + faq + "</div></div>" +

      '<div class="byline"><span class="portrait sm" style="color:var(--gold)">' + LOGO + '</span><div style="display:flex;flex-direction:column;gap:2px"><span class="mono muted" style="font-size:10px">執筆・監修</span><span class="mincho" style="font-size:16px">' + esc(window.VEIL_EXTRA.author.name) + '</span><span class="muted" style="font-size:12px">' + esc(window.VEIL_EXTRA.author.note) + "</span></div></div></div>" +

      '<aside class="daside"><div class="block"><h2 style="font-size:26px">STATUS <small>性能</small></h2>' + prep("HP・攻撃・防御・移動速度などの実際の数値を、全ヒーロー中の位置と一緒に表示します。") + "</div>" +
      '<div class="block"><h2 style="font-size:26px">SAME CLASS <small>同じクラス</small></h2><div class="side-list">' + same + "</div></div></aside></div></div></section>";
  }

  var BV = [["rec", "おすすめ"], ["popular", "直近の人気"], ["attack", "フル火力"], ["balance", "バランス"], ["defense", "フル防具"]];
  function variantItems(c, v) {
    var B = window.VEIL_BUILDS, boots = c.build.filter(function (b) { return B.type[b] === "boots"; })[0] || "ashboots";
    var atk = B.attack[c.attr] || B.attack["物理"];
    if (v === "rec") return c.build;
    if (v === "attack") return [boots].concat(atk.slice(0, 5));
    if (v === "defense") return [boots].concat(B.defense.slice(0, 5));
    if (v === "balance") {
      var mine = c.build.filter(function (b) { return B.type[b] === "atk"; }).concat(atk), out = [boots], seen = {};
      mine.forEach(function (b) { if (!seen[b] && out.length < 3) { seen[b] = 1; out.push(b); } });
      var defs = c.build.filter(function (b) { return B.type[b] === "def"; }).concat(B.defense);
      defs.forEach(function (b) { if (!seen[b] && out.length < 6) { seen[b] = 1; out.push(b); } });
      return out;
    }
    var pop = ((window.VEIL_SLOTS || {}).heroes || {})[c.id];
    return pop && pop.popularBuild ? pop.popularBuild : null;
  }
  function buildBox(c) { return ""; }

  var STAT_MIN_GAMES = 20; /* a day with fewer games than this is drawn dashed and faint as データ不足 */
  function wavg(arr) { var g = 0, w = 0; arr.forEach(function (p) { g += p.games; w += p.wr * p.games; }); return g ? w / g : null; }
  function gsum(arr) { return arr.reduce(function (a, p) { return a + p.games; }, 0); }
  function statsBox(c) {
    var ST = (window.VEIL_STATS || {})[c.id];
    if (!ST || !ST.all.games) return '<p class="muted" style="font-size:14px">まだ記録した試合に登場していません。</p>';
    var months = Object.keys(ST.month).sort(), md = function (m) { return Number(m.slice(5, 7)) + "月"; };
    var chart;
    if (months.length < 2) {
      var r0 = ST.month[months[0]];
      chart = '<div class="chart-box"><div class="slot" style="height:160px"><span class="mono muted" style="font-size:10px">勝率の推移</span><span class="muted" style="font-size:13px">記録が ' + md(months[0]) + " の1か月分だけなので、推移はまだ描けません(" + r0.games + "試合 · " + pct(r0.wins / r0.games * 100) + ")。</span></div></div>";
    } else {
      var pts = months.map(function (m) { return { m: m, wr: ST.month[m].wins / ST.month[m].games * 100, games: ST.month[m].games }; });
      var W = 660, H = 230, L = 44, Rr = 20, T = 16, Bm = 40, lo = 0, hi = 100;
      var X = function (i) { return L + (pts.length === 1 ? 0 : i * (W - L - Rr) / (pts.length - 1)); }, Yp = function (v) { return T + (hi - v) / (hi - lo) * (H - T - Bm); };
      var grid = [0, 50, 100].map(function (t) { return '<line x1="' + L + '" x2="' + (W - Rr) + '" y1="' + Yp(t) + '" y2="' + Yp(t) + '" stroke="' + (t === 50 ? "#65717D" : "#202026") + '"' + (t === 50 ? ' stroke-dasharray="2 4"' : "") + '/><text x="' + (L - 8) + '" y="' + (Yp(t) + 4) + '" text-anchor="end" fill="#85838A" font-size="11">' + t + "%</text>"; }).join("");
      var line = pts.map(function (p, i) { return (i ? "L" : "M") + X(i).toFixed(1) + " " + Yp(p.wr).toFixed(1); }).join(" ");
      var dots = pts.map(function (p, i) { var thin = p.games < 5; return '<circle cx="' + X(i).toFixed(1) + '" cy="' + Yp(p.wr).toFixed(1) + '" r="4" fill="#B99A68"' + (thin ? ' opacity=".5"' : "") + '><title>' + md(p.m) + " 勝率 " + p.wr.toFixed(1) + "% · " + p.games + "試合</title></circle>" +
        '<text x="' + X(i).toFixed(1) + '" y="' + (H - 14) + '" text-anchor="middle" fill="#85838A" font-size="11">' + md(p.m) + "</text>" + '<text x="' + X(i).toFixed(1) + '" y="' + (Yp(p.wr) - 10).toFixed(1) + '" text-anchor="middle" fill="#E8E5DF" font-size="11">' + Math.round(p.wr) + "% (" + p.games + ")</text>"; }).join("");
      chart = '<div class="chart-box"><svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="月ごとの勝率の推移" style="width:100%;height:auto">' + grid + '<path d="' + line + '" fill="none" stroke="#B99A68" stroke-width="2"/>' + dots + "</svg>" +
        '<div class="legend"><span>点の上は「勝率(試合数)」。5試合未満の月は点を薄くしています。</span></div></div>';
    }
    var laneRows = D.roles.map(function (r) { var x = ST.lane[r.id]; return x ? "<tr><td>" + r.label + '</td><td class="num">' + x.games + '</td><td class="num">' + pct(x.wins / x.games * 100) + "</td><td>" + (c.sheetLanes && c.sheetLanes[r.id] ? c.sheetLanes[r.id] : "—") + "</td></tr>" : ""; }).join("");
    var rankRows = Object.keys(ST.rank).map(function (k) { var x = ST.rank[k]; return "<tr><td>" + esc(k) + '</td><td class="num">' + x.games + '</td><td class="num">' + pct(x.wins / x.games * 100) + "</td></tr>"; }).join("");
    return '<p class="sample-note"><span class="badge">VEIL集計</span>記録した ' + (window.VEIL_MATCH_INFO || {}).count + " 試合のうち、" + c.games + " 試合分の数字です。</p>" +
      '<h3 class="subh" style="margin:0">月ごとの勝率</h3>' + chart +
      '<h3 class="subh">レーンごとの成績</h3><div class="table-box"><table class="data" style="min-width:420px"><thead><tr><th>レーン</th><th>試合数</th><th>勝率</th><th>シートの適正</th></tr></thead><tbody>' + laneRows + "</tbody></table></div>" +
      '<h3 class="subh">ランク帯ごとの成績</h3><div class="table-box"><table class="data" style="min-width:360px"><thead><tr><th>ランク帯</th><th>試合数</th><th>勝率</th></tr></thead><tbody>' + rankRows + "</tbody></table></div>";
  }

  /* ---------------- EQUIPMENT · EMBLEM · SPELLS (real data from gear.js) ---------------- */
  var G = window.VEIL_GEAR || { items: {}, cats: [], emblems: [], talents: [], spells: [] };
  var CAT = {}; G.cats.forEach(function (c) { CAT[c[0]] = c[1]; });
  function gicon(src, size, alt) {
    return '<span class="gicon" style="width:' + size + "px;height:" + size + 'px"><img src="' + esc(src) + '" alt="' + esc(alt || "") + '" width="' + size + '" height="' + size + '" loading="lazy" decoding="async"></span>';
  }
  function itemIcon(id, size) { return gicon("icons/i-" + id + ".webp", size); }
  function gearSource() {
    return '<p class="sample-note">ゲーム内の画面から書き写した内容です(文章・アイコン © MOONTON)。ゲーム側の表示が途中で切れていた説明は「…」で終わり、続きは準備中です。</p>';
  }
  function gearTabs(cur) {
    return '<nav class="gtabs" aria-label="装備とエンブレム">' + [["equipment", "装備", "EQUIPMENT"], ["emblem", "エンブレム・天賦", "EMBLEM"], ["spells", "バトルスキル", "SPELLS"]].map(function (t) {
      return '<a href="#' + t[0] + '"' + (cur === t[0] ? ' aria-current="page"' : "") + '><span class="mono" style="font-size:10px">' + t[2] + "</span>" + t[1] + "</a>"; }).join("") + "</nav>";
  }
  function usersOf(id) {
    return D.champions.filter(function (c) { return (c.build || []).indexOf(id) >= 0; }).map(function (c) { return { c: c, rec: true }; });
  }
  function catCount(cat) { return Object.keys(G.items).filter(function (id) { return G.items[id].cats.indexOf(cat) >= 0; }).length; }
  function catLabel(it) { return it.cats.map(function (c) { return CAT[c]; }).join("・"); }
  function priceOf(it, hi) { return it.price != null ? it.price : (hi ? Infinity : -1); }
  function filteredItems() {
    var f = S.itf || { q: "", cat: "ALL", sort: "price" }, q = f.q.trim();
    var list = Object.keys(G.items).filter(function (id) {
      var it = G.items[id], hay = it.name + it.tag + it.stats.join("") + it.passive;
      return (f.cat === "ALL" || it.cats.indexOf(f.cat) >= 0) && (!q || hay.indexOf(q) >= 0);
    });
    return list.sort(function (a, b) { var A = G.items[a], B = G.items[b]; return f.sort === "name" ? A.name.localeCompare(B.name, "ja") : f.sort === "cheap" ? priceOf(A, 1) - priceOf(B, 1) : priceOf(B) - priceOf(A); });
  }
  function itemGrid() {
    var list = filteredItems(), f = S.itf || {};
    document.querySelectorAll("[data-icount]").forEach(function (el) { el.textContent = list.length; });
    if (f.cat && f.cat !== "ALL" && !catCount(f.cat)) return '<div class="empty"><h3>' + esc(CAT[f.cat]) + 'の装備は準備中です</h3><p class="muted" style="font-size:14px">まだゲーム画面を撮っていない種類です。画面をもらえれば追加します。</p></div>';
    if (!list.length) return '<div class="empty"><h3>該当する装備はありません</h3><p class="muted" style="font-size:14px">条件を減らすか、別の言葉で検索してください。</p><button class="btn ghost" type="button" data-action="reset-items">条件をリセット</button></div>';
    return '<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:20px">' + list.map(function (id) {
      var it = G.items[id];
      return '<a class="card icard" href="#item-' + id + '"><div class="icard-top">' + itemIcon(id, 60) + '<div style="display:flex;flex-direction:column;gap:4px;min-width:0"><span class="mincho" style="font-size:19px">' + esc(it.name) + '</span><span class="mono muted" style="font-size:10px">' + esc(catLabel(it)) + " · " + esc(it.tag) + "</span></div></div>" +
        (it.stats.length ? '<ul class="istats">' + it.stats.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ul>" : '<p class="cdesc" style="min-height:0;font-size:13px">' + esc(it.passive.length > 70 ? it.passive.slice(0, 70) + "…" : it.passive) + "</p>") +
        '<div class="cfoot"><span class="mono muted" style="font-size:10px">' + (it.price != null ? "価格" : esc(it.tag)) + '</span><span class="serif gold num" style="font-size:20px">' + (it.price != null ? it.price.toLocaleString() : "") + "</span></div></a>";
    }).join("") + "</div>";
  }
  function viewEquipment() {
    S.itf = S.itf || { q: "", cat: "ALL", sort: "price" };
    var f = S.itf;
    return '<section class="phead">' + atmo({ h: 260, seed: 71 }) + '<div class="wrap">' + crumbs([["HOME", "#home"], ["EQUIPMENT"]]) +
      '<div class="phead-row"><div style="display:flex;flex-direction:column;gap:14px"><h1 class="rise">EQUIPMENT</h1><p class="jp rise d1">装備一覧 — 何を、いつ、誰が積むか</p></div>' +
      '<div style="display:flex;align-items:baseline;gap:12px"><span class="serif gold num" style="font-size:64px;line-height:1" data-icount>' + filteredItems().length + '</span><span class="mono muted">/ ' + Object.keys(G.items).length + " 個を表示</span></div></div>" + gearTabs("equipment") + "</div></section>" +
      '<section class="section tight" style="padding-top:40px"><div class="wrap" style="display:flex;flex-direction:column;gap:32px">' +
      '<div class="filters" role="search"><div class="frow"><div class="fsearch">' + IC.search + '<label for="it-q" class="sr">装備名・効果で検索</label><input id="it-q" type="search" placeholder="装備名・効果で検索(例 クリティカル、HP)" value="' + esc(f.q) + '" data-input="it-q" autocomplete="off"></div>' +
      '<div class="fsort"><label for="it-sort" class="mono muted" style="font-size:10px">SORT</label><select id="it-sort" data-bind="it-sort">' + [["price", "価格が高い順"], ["cheap", "価格が安い順"], ["name", "名前順"]].map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === f.sort ? " selected" : "") + ">" + o[1] + "</option>"; }).join("") + "</select>" + IC.chev + "</div></div>" +
      '<div class="fgroups"><div class="fgroup" role="group" aria-label="種類"><span class="mono gold" style="font-size:10px">種類</span>' +
      chips("icat", [["ALL", "ALL"]].concat(G.cats.map(function (c) { return [c[0], c[1] + (catCount(c[0]) ? "" : '<span class="muted" style="font-size:10px"> 準備中</span>')]; })), f.cat) + "</div></div></div>" +
      gearSource() + '<div id="item-grid" aria-live="polite">' + itemGrid() + "</div></div></section>";
  }
  function viewItem(id) {
    var it = G.items[id];
    if (!it) return viewNotFound("この装備は見つかりませんでした。");
    var users = usersOf(id);
    var c0 = it.cats[0], same = Object.keys(G.items).filter(function (k) { return k !== id && G.items[k].cats.indexOf(c0) >= 0; }).sort(function (a, b) { return Math.abs((G.items[a].price || 0) - (it.price || 0)) - Math.abs((G.items[b].price || 0) - (it.price || 0)); }).slice(0, 8);
    return '<section class="phead">' + atmo({ h: 240, seed: 73 }) + '<div class="wrap">' + crumbs([["HOME", "#home"], ["EQUIPMENT", "#equipment"], [esc(it.name)]]) +
      '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:28px">' + itemIcon(id, 120) + '<div style="display:flex;flex-direction:column;gap:10px"><span class="eyebrow">' + esc(catLabel(it)) + " · " + esc(it.tag) + '</span><h1 class="mincho rise" style="font-size:clamp(40px,5vw,64px);letter-spacing:.06em">' + esc(it.name) + "</h1>" + (it.price != null ? '<p class="mono muted" style="font-size:12px">価格 <span class="serif gold num" style="font-size:26px;letter-spacing:0">' + it.price.toLocaleString() + "</span></p>" : '<p class="mono muted" style="font-size:12px">' + esc(it.tag) + " · 価格は未掲載</p>") + "</div></div></div></section>" +
      '<section class="section tight"><div class="wrap dgrid"><div style="display:flex;flex-direction:column;gap:48px;min-width:0">' +
      (it.stats.length ? '<div class="block"><h2>STATS <small>上がる能力</small></h2><ul class="istats big">' + it.stats.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ul></div>" : "") +
      '<div class="block"><h2>EFFECT <small>効果</small></h2>' + (it.passive ? '<p class="prose">' + esc(it.passive) + "</p>" : '<p class="muted">能力値が上がるだけで、特別な効果はありません。</p>') + (it.cut ? '<p class="muted" style="font-size:12px">ゲーム画面で説明が途中までしか表示されていなかったため、続きは準備中です。</p>' : "") + "</div>" +
      '<div class="block"><h2>USED BY <small>この装備を使うキャラ</small></h2>' + (users.length ? '<div class="side-list">' + users.map(function (u) {
        return '<a href="#champion-' + u.c.id + '">' + portrait(u.c, true) + '<span class="serif" style="font-size:20px;flex:1">' + esc(u.c.name) + "</span></a>"; }).join("") + "</div>" : '<div class="slot"><span class="muted">ヒーローごとのビルドが入ると、ここにこの装備を使うヒーローが並びます。</span></div>') + "</div>" + gearSource() + "</div>" +
      '<aside class="daside"><div class="block"><h2 style="font-size:26px">SIMILAR <small>' + (it.price != null ? "近い価格の" : "同じ種類の") + esc(CAT[c0]) + '装備</small></h2><div class="side-list">' + same.map(function (k) { return '<a href="#item-' + k + '">' + itemIcon(k, 44) + '<span class="mincho" style="font-size:16px;flex:1">' + esc(G.items[k].name) + '</span><span class="mono muted num" style="font-size:11px">' + (G.items[k].price != null ? G.items[k].price.toLocaleString() : "") + "</span></a>"; }).join("") + "</div></div></aside></div></section>";
  }
  function talentCard(t) {
    return '<article class="tcard" id="tal-' + t.id + '">' + gicon("icons/t-" + t.id + ".webp", 56) + '<div style="display:flex;flex-direction:column;gap:6px;min-width:0"><h3 class="mincho">' + esc(t.name) + "</h3>" + (t.sub ? '<span class="gold" style="font-size:13px">' + esc(t.sub) + "</span>" : "") +
      '<p style="font-size:14px;line-height:1.8">' + esc(t.desc) + "</p>" + (t.extra ? '<p class="muted" style="font-size:12px;line-height:1.7">' + esc(t.extra) + (t.cut ? "…" : "") + "</p>" : "") + "</div></article>";
  }
  function viewEmblem() {
    return '<section class="phead">' + atmo({ h: 260, seed: 77 }) + '<div class="wrap">' + crumbs([["HOME", "#home"], ["EQUIPMENT", "#equipment"], ["EMBLEM"]]) +
      '<div class="phead-row"><div style="display:flex;flex-direction:column;gap:14px"><h1 class="rise">EMBLEM</h1><p class="jp rise d1">エンブレムと天賦 — 試合前に決める、もう一つのビルド</p></div></div>' + gearTabs("emblem") + "</div></section>" +
      '<section class="section tight" style="padding-top:40px"><div class="wrap" style="display:flex;flex-direction:column;gap:56px">' +
      '<div class="block">' + secHead("01", "EMBLEMS", "エンブレム 7種") + '<div class="embgrid">' + G.emblems.map(function (e) {
        return '<div class="ecard">' + gicon(e.icon, 64, e.name) + '<div style="display:flex;flex-direction:column;gap:8px;min-width:0"><h3 class="mincho">' + esc(e.name) + "</h3>" +
          (e.stats ? '<span class="mono muted" style="font-size:10px" title="' + esc(e.full) + '">Lv60</span><ul class="istats">' + e.stats.map(function (s) { return "<li>" + esc(s[0]) + ' <b class="num">' + esc(s[1]) + "</b></li>"; }).join("") + "</ul>" : '<span class="tag dim" style="align-self:flex-start">能力値は準備中</span>') + "</div></div>";
      }).join("") + '</div><p class="sample-note">能力値はすべてLv60のものです。</p></div>' +
      G.talents.map(function (tr) {
        return '<div class="block">' + secHead("0" + (tr.tier + 1), "TALENT " + tr.tier, "天賦 " + tr.label + " — " + tr.note) + '<p class="muted" style="font-size:13px">この段の中から1つ選びます。</p><div class="tgrid">' + tr.list.map(talentCard).join("") + "</div></div>";
      }).join("") + gearSource() + "</div></section>";
  }
  function viewSpells() {
    return '<section class="phead">' + atmo({ h: 260, seed: 79 }) + '<div class="wrap">' + crumbs([["HOME", "#home"], ["EQUIPMENT", "#equipment"], ["SPELLS"]]) +
      '<div class="phead-row"><div style="display:flex;flex-direction:column;gap:14px"><h1 class="rise">SPELLS</h1><p class="jp rise d1">バトルスキル — 試合で1つだけ持ち込める切り札</p></div>' +
      '<div style="display:flex;align-items:baseline;gap:12px"><span class="serif gold num" style="font-size:64px;line-height:1">' + G.spells.length + '</span><span class="mono muted">種類</span></div></div>' + gearTabs("spells") + "</div></section>" +
      '<section class="section tight" style="padding-top:40px"><div class="wrap" style="display:flex;flex-direction:column;gap:32px"><div class="tgrid">' + G.spells.map(function (s) {
        return '<article class="tcard" id="spell-' + s.id + '">' + gicon("icons/s-" + s.id + ".webp", 64) + '<div style="display:flex;flex-direction:column;gap:6px;min-width:0"><div style="display:flex;align-items:baseline;gap:12px;flex-wrap:wrap"><h3 class="mincho">' + esc(s.name) + '</h3><span class="mono gold" style="font-size:11px">CD ' + s.cd + '秒</span></div><span class="tag dim" style="align-self:flex-start">' + esc(s.tag) + "</span>" +
          '<p style="font-size:14px;line-height:1.8">' + esc(s.desc) + (s.cut ? "…" : "") + "</p></div></article>"; }).join("") + "</div>" + gearSource() + "</div></section>";
  }

  /* ---------------- role switch on the detail page ---------------- */
  function roleSet(c) { return (window.VEIL_ROLESETS || {})[c.id] || null; }
  function curRole(c) {
    var rs = roleSet(c); S.heroRole = S.heroRole || {};
    var r = S.heroRole[c.id]; if (!rs) return c.role;
    return r && rs[r] ? r : Object.keys(rs)[0];
  }
  function roleChips(c) {
    var rs = roleSet(c); if (!rs) return "";
    var keys = Object.keys(rs), cur = curRole(c);
    return '<div class="rolepick"><span class="mono muted" style="font-size:10px">レーンを選ぶ</span><div class="bvars" role="group" aria-label="レーン">' + keys.map(function (k) {
      return '<button type="button" class="chip" data-action="herorole" data-id="' + c.id + '" data-value="' + k + '" aria-pressed="' + (k === cur) + '">' + laneLabel(k) + "</button>"; }).join("") + "</div></div>";
  }

  function roleFacts(c) {
    var rs = roleSet(c), r = curRole(c), d = rs ? rs[r] : { wr: c.wr, pick: c.pick, games: c.games };
    return '<div><span class="mono muted" style="font-size:10px">TIER</span><span class="tag dim">データ待ち</span></div>' +
      '<div><span class="mono muted" style="font-size:10px">レーン</span><span class="serif" style="font-size:19px">' + laneLabel(r) + '</span></div>' +
      '<div><span class="mono muted" style="font-size:10px">クラス</span><span class="mincho" style="font-size:16px">' + esc(c.attr) + "</span></div>" +
      '<div><span class="mono muted" style="font-size:10px">試合数</span><span class="serif num" style="font-size:24px">' + (d.games || 0) + "</span></div>" +
      '<div><span class="mono muted" style="font-size:10px">勝率</span><span class="serif num" style="font-size:24px">' + (d.games ? pct(d.wr) : "—") + "</span></div>" +
      '<div><span class="mono muted" style="font-size:10px">使用率</span><span class="serif num" style="font-size:24px">' + (d.games ? pct(d.pick) : "—") + "</span></div>";
  }

  function roleSynergy(c) {
    var rs = roleSet(c), r = curRole(c), ids = rs && rs[r] ? rs[r].synergy : [];
    var ST = (window.VEIL_STATS || {})[c.id] || { mates: {} };
    return '<span class="mono gold" style="font-size:10px">一緒に勝っている味方 <span class="muted">· ' + laneLabel(r) + ' で使ったとき</span></span>' + (ids.length ? '<div class="rel">' + ids.map(function (id) { var o = CH[id], m = ST.mates[id]; return '<a class="tchip" href="#champion-' + id + '">' + portrait(o, true) + esc(o.name) + "</a>"; }).join("") + "</div>" : '<p class="muted" style="font-size:13px">まだ記録がありません。</p>');
  }

  function embBox(c) {
    var list = ((window.VEIL_EMBLEM_OF || {})[c.id]) || ["共通"];
    S.emb = S.emb || {}; var cur = S.emb[c.id] && list.indexOf(S.emb[c.id]) >= 0 ? S.emb[c.id] : list[0];
    var e = G.emblems.filter(function (x) { return x.name === cur; })[0];
    var chipsH = list.length > 1 ? '<div class="bvars" role="group" aria-label="エンブレム">' + list.map(function (n) {
      return '<button type="button" class="chip" data-action="emb" data-id="' + c.id + '" data-value="' + n + '" aria-pressed="' + (n === cur) + '">' + esc(n) + "</button>"; }).join("") + "</div>" : "";
    return '<div class="item"><b>EMBLEM · エンブレム</b><span style="display:flex;align-items:center;gap:10px">' + (e ? gicon(e.icon, 32, e.name) : "") + esc(cur) + '</span><small class="muted">クラスから選んだ仮の表示です</small>' + chipsH + "</div>" +
      '<div class="item"><b>TALENTS · エンブレム天賦</b><span class="muted" style="font-size:13px">このヒーローのおすすめはデータ待ちです</span><a class="link" href="#emblem" style="padding:0">天賦の一覧を見る' + IC.arrow + "</a></div>";
  }


  /* ---------------- MATCHUP LAB ---------------- */
  function labForm() {
    return '<form class="lab-form" data-form="lab" aria-label="対面検索">' + selectField("l-you", "1 · 自分のキャラクター", champOpts, S.lab.you) + selectField("l-enemy", "2 · 相手のキャラクター", champOpts, S.lab.enemy) +
      selectField("l-lane", "3 · レーン", laneOpts, S.lab.lane) + '<button class="btn primary" type="submit" style="justify-content:center">4 · 検索' + IC.arrow + "</button></form>";
  }
  function viewLab() {
    return '<section class="phead">' + atmo({ h: 260, seed: 41 }) + '<div class="wrap">' + crumbs([["HOME", "#home"], ["MATCHUP LAB"]]) +
      '<h1 class="rise">MATCHUP LAB</h1><p class="jp rise d1">対面 — 同じレーンで当たった相手との記録</p></div></section>' +
      '<section class="section tight" style="padding-top:40px"><div class="wrap" style="display:flex;flex-direction:column;gap:56px">' + labForm() +
      "<div>" + secHead("—", "MOST PLAYED", "記録が多い対面") + '<div class="grid g3">' + topPairs(9).map(muCard).join("") + "</div></div></div></section>";
  }

  function skillLine(c, key) { var s = c.skills.filter(function (x) { return x.key === key; })[0]; return s ? s : null; }
  function viewMatchup(y, e, lane) {
    var you = CH[y], en = CH[e];
    if (!you || !en || !ROLE[lane]) return viewNotFound("対面の指定が正しくありません。ヒーローとレーンを選び直してください。");
    S.lab = { you: y, enemy: e, lane: lane };
    var head = '<section class="phead">' + atmo({ h: 240, seed: 43 }) + '<div class="wrap">' + crumbs([["HOME", "#home"], ["MATCHUP LAB", "#matchup"], [esc(you.name) + " vs " + esc(en.name)]]) + labForm() + "</div></section>";
    var top = '<div class="res-head"><div class="mu-side">' + portrait(you) + '<span style="display:flex;flex-direction:column"><span class="mono muted" style="font-size:9px">YOU</span><span class="mincho" style="font-size:30px;line-height:1.1">' + esc(you.name) + '</span><span class="mono muted" style="font-size:10px">' + esc(you.en) + '</span></span></div><span class="mu-vs" style="font-size:36px">vs</span><div class="mu-side">' + portrait(en) + '<span style="display:flex;flex-direction:column"><span class="mono muted" style="font-size:9px">ENEMY</span><span class="mincho" style="font-size:30px;line-height:1.1">' + esc(en.name) + '</span><span class="mono muted" style="font-size:10px">' + esc(en.en) + '</span></span></div><span class="tag" style="margin-left:auto">' + laneLabel(lane) + "</span></div>";
    if (y === e) return head + '<section class="section tight"><div class="wrap"><div class="empty"><h3>同じヒーロー同士は選べません</h3><p class="muted" style="font-size:14px">相手のヒーローを変えて、もう一度検索してください。</p></div></div></section>';
    var r = recOf(y, e, lane);
    var body = r ? '<div class="kpis"><div><span class="mono muted" style="font-size:10px">対戦数</span><span class="serif num" style="font-size:32px">' + r.games + '</span></div><div><span class="mono muted" style="font-size:10px">' + esc(you.name) + ' の勝ち</span><span class="serif num" style="font-size:32px">' + r.wins + '</span></div><div><span class="mono muted" style="font-size:10px">勝率</span><span class="serif num" style="font-size:32px">' + pct(r.wins / r.games * 100) + '</span></div><div><span class="mono muted" style="font-size:10px">信頼度</span><span class="tag warn" style="align-self:flex-start">' + (r.games < 10 ? "データ不足" : "参考値") + "</span></div></div>"
      : '<div class="empty" style="padding:48px 28px"><span class="tag dim">NO DATA</span><h3>この組み合わせの対戦記録はまだありません</h3><p class="muted" style="font-size:14px">勝率などの数値は、記録がない状態では表示しません。</p></div>';
    var alt = [];
    var ST = (window.VEIL_STATS || {})[y] || { vs: {} };
    Object.keys(ST.vs).forEach(function (k) { var p = k.split("|"); if (p[1] === lane && p[0] !== e) alt.push({ y: y, e: p[0], lane: lane, r: ST.vs[k] }); });
    alt.sort(function (a, b) { return b.r.games - a.r.games; });
    return head + '<section class="section tight"><div class="wrap" style="display:flex;flex-direction:column;gap:40px">' + top + body +
      '<div class="keyrule" style="padding:24px 28px"><span class="k">KEY RULE · 攻略メモ</span><span class="v muted" style="font-size:16px">この対面の具体的な立ち回りは準備中です。</span></div>' +
      '<div class="block"><h2>OTHER RECORDS <small>' + esc(you.name) + " の " + laneLabel(lane) + " でのほかの対面</small></h2>" + (alt.length ? '<div class="side-list">' + alt.map(function (p) { var o = CH[p.e]; return '<a href="' + muHash(p.y, p.e, p.lane) + '">' + portrait(o, true) + '<span class="mincho" style="font-size:17px;flex:1">' + esc(o.name) + '</span><span class="delta mono num" style="color:var(--text)">' + Math.round(p.r.wins / p.r.games * 100) + '%</span><span class="tag dim">' + p.r.games + "試合</span></a>"; }).join("") + "</div>" : '<p class="muted">まだありません。</p>') + "</div></div></section>";
  }

  /* ---------------- LORE ---------------- */
  function viewLore(focus) {
    return '<section class="phead">' + atmo({ h: 280, seed: 51, lx: 50 }) + '<div class="wrap">' + crumbs([["HOME", "#home"], ["LORE ARCHIVE"]]) + '<h1 class="rise">LORE ARCHIVE</h1><p class="jp rise d1">世界観の記録</p></div></section>' +
      '<section class="section tight"><div class="wrap"><div class="empty"><span class="tag dim">準備中</span><h3>世界観の記録は準備中です</h3><p class="muted" style="font-size:14px;max-width:560px">ヒーロー同士の関係や国家・事件などを、ここにまとめていきます。</p></div></div></section>';
  }

  /* ---------------- PATCH & META ---------------- */
  function metaTable() {
    var mt = S.meta, list = D.champions.filter(function (c) { return (mt.role === "ALL" || (c.lanes && c.lanes[mt.role])) && c.games > 0; }).slice();
    if (mt.key === "pick" || mt.key === "ban") mt.key = "games";
    list.sort(function (a, b) { return (mt.key === "name" ? a.name.localeCompare(b.name, "ja") : (a[mt.key] || 0) - (b[mt.key] || 0)) * (mt.key === "name" ? 1 : mt.dir); });
    function th(key, label) { return "<th" + (mt.key === key ? ' aria-sort="' + (mt.dir < 0 ? "descending" : "ascending") + '"' : "") + '><button type="button" data-action="sort" data-key="' + key + '">' + label + (mt.key === key ? (mt.dir < 0 ? " ↓" : " ↑") : "") + "</button></th>"; }
    return '<table class="data"><thead><tr>' + th("name", "ヒーロー") + "<th>クラス</th>" + th("games", "試合数") + th("wr", "勝率") + "<th>使用率</th></tr></thead><tbody>" +
      list.map(function (c) {
        return '<tr><td><a href="#champion-' + c.id + '" style="display:flex;align-items:center;gap:12px">' + portrait(c, true) + '<span style="display:flex;flex-direction:column"><span class="mincho" style="font-size:16px">' + esc(c.name) + '</span><span class="mono muted" style="font-size:10px">' + esc(c.en) + '</span></span></a></td><td class="muted" style="font-size:12px">' + esc(c.attr) + '</td><td class="num">' + c.games + '</td><td><span style="display:flex;align-items:center;gap:10px"><span class="num" style="min-width:52px">' + pct(c.wr) + '</span><span style="width:90px;height:4px;background:var(--line);display:block"><i style="display:block;height:100%;width:' + Math.round(c.wr) + '%;background:' + (c.wr >= 50 ? "var(--gold)" : "var(--steel)") + '"></i></span></span></td><td class="num">' + pct(c.pick) + "</td></tr>";
      }).join("") + "</tbody></table>";
  }

  function viewPatch() {
    var MI = window.VEIL_MATCH_INFO || {};
    return '<section class="phead">' + atmo({ h: 260, seed: 61 }) + '<div class="wrap">' + crumbs([["HOME", "#home"], ["PATCH &amp; META"]]) +
      '<div class="phead-row"><div style="display:flex;flex-direction:column;gap:14px"><h1 class="rise">PATCH &amp; META</h1><p class="jp rise d1">環境とVEILの集計</p></div>' +
      '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px"><span class="serif num" style="font-size:56px;line-height:1">' + (MI.count || 0) + ' <span class="muted" style="font-size:22px">試合</span></span><span class="mono muted num">' + (MI.from ? MI.from.replace(/-/g, ".") + " 〜 " + MI.to.replace(/-/g, ".") : "") + "</span></div></div></div></section>" +
      '<section class="section tight"><div class="wrap" style="display:flex;flex-direction:column;gap:88px">' +
      "<div>" + secHead("01", "PATCH", "最新パッチ") + '<div class="empty" style="padding:48px 28px"><span class="tag dim">準備中</span><h3>パッチ情報は準備中です</h3><p class="muted" style="font-size:14px">強化・弱体化の内容を、パッチごとにここへまとめます。</p></div></div>' +
      "<div>" + secHead("02", "TIER LIST", "ロール別Tier List") + '<div class="empty" style="padding:48px 28px"><span class="tag dim">データ待ち</span><h3>Tierを決めるには試合数が足りません</h3><p class="muted" style="font-size:14px">試合が集まったら、勝率と使用率からTierを出します。</p></div></div>' +
      "<div>" + secHead("03", "STATISTICS", "ヒーロー別の勝率", '<span class="badge" style="order:2">VEIL集計</span>') +
      '<div style="display:flex;flex-direction:column;gap:18px"><div class="fgroup" role="group" aria-label="レーンで絞り込む">' + chips("meta-role", [["ALL", "ALL"]].concat(D.roles.map(function (r) { return [r.id, r.id]; })), S.meta.role) +
      '</div><p class="muted" style="font-size:12px">記録した試合に登場したヒーローだけを載せています。使用率 = 登場した試合 ÷ 記録した全試合。</p><div class="table-box" id="meta-table">' + metaTable() + "</div></div></div></div></section>";
  }

  function viewNotFound(msg) {
    return '<section class="section"><div class="wrap"><div class="empty"><span class="tag warn">ERROR</span><h3>ページが見つかりません</h3><p class="muted" style="font-size:14px">' + esc(msg || "リンクが古いか、入力に誤りがあります。") + '</p><a class="btn ghost" href="#home">HOME へ戻る</a></div></div></section>';
  }


  /* ---------------- ROULETTE ---------------- */
  /* lanes a hero can be rolled for: lanes it was actually played in within the most recent RL_RECENT recorded matches.
     A lane counts only if it is the hero's most-played lane there, or was played at least RL_MIN_GAMES times and RL_MIN_SHARE of its plays (keeps one-off odd picks out). */
  var LANE_ORDER = ["EXP", "JUNGLE", "MID", "GOLD", "ROAM"];
  var RL_RECENT = 1000, RL_MIN_SHARE = 0.15, RL_MIN_GAMES = 2, RL_LANES = null;
  function rlBuild() {
    var ms = (window.VEIL_MATCHES || []).map(function (m, i) { return { m: m, i: i }; })
      .sort(function (a, b) { return a.m.date < b.m.date ? 1 : a.m.date > b.m.date ? -1 : b.i - a.i; })
      .slice(0, RL_RECENT), cnt = {};
    ms.forEach(function (x) {
      [x.m.ally, x.m.enemy].forEach(function (team) {
        Object.keys(team || {}).forEach(function (L) { var id = team[L]; if (!id) return; cnt[id] = cnt[id] || {}; cnt[id][L] = (cnt[id][L] || 0) + 1; });
      });
    });
    RL_LANES = {};
    Object.keys(cnt).forEach(function (id) {
      var c = cnt[id], tot = 0, max = 0;
      Object.keys(c).forEach(function (L) { tot += c[L]; if (c[L] > max) max = c[L]; });
      RL_LANES[id] = LANE_ORDER.filter(function (L) { return c[L] && (c[L] === max || (c[L] >= RL_MIN_GAMES && c[L] / tot >= RL_MIN_SHARE)); });
    });
    RL_LANES._n = ms.length;
  }
  function rlLanes(c) { if (!RL_LANES) rlBuild(); return RL_LANES[c.id] || []; }
  var RL_KEY = "veil-roulette-exclude";
  function rlEx() { try { return JSON.parse(localStorage.getItem(RL_KEY) || "[]"); } catch (e) { return S.rlEx || []; } }
  function rlSetEx(a) { S.rlEx = a; try { localStorage.setItem(RL_KEY, JSON.stringify(a)); } catch (e) {} }
  function rlPool() {
    var ex = rlEx(), f = S.rl;
    return D.champions.filter(function (c) {
      if (ex.indexOf(c.id) >= 0) return false;
      if (f.cls !== "ALL" && c.cls !== f.cls && c.sub !== f.cls) return false;
      if (f.lane !== "ALL" && rlLanes(c).indexOf(f.lane) < 0) return false;
      return true;
    });
  }
  function rlCell(c) {
    return '<div class="rl-cell">' + portrait(c) + '<span class="rl-names"><b class="serif">' + esc(c.name) + '</b><span class="mono muted">' + esc(c.en) + "</span></span></div>";
  }
  function rlReelIdle() {
    var pool = rlPool();
    if (!pool.length) return '<div class="rl-strip"><div class="rl-cell rl-empty"><span class="muted">候補がいません</span></div></div>';
    var a = []; for (var i = 0; i < 3; i++) a.push(pool[Math.floor(Math.random() * pool.length)]);
    return '<div class="rl-strip">' + a.map(rlCell).join("") + "</div>";
  }
  function rlCount() {
    var n = rlPool().length;
    document.querySelectorAll("[data-rl-count]").forEach(function (el) { el.textContent = n; });
    var b = document.getElementById("rl-spin"); if (b) b.disabled = !n || S.rl.spinning;
    return n;
  }
  function rlExList() {
    var ex = rlEx();
    if (!ex.length) return '<p class="muted" style="font-size:13px">外しているヒーローはいません。結果に出たヒーローを「候補から外す」で外せます。</p>';
    return '<div class="rl-exlist">' + ex.map(function (id) { var c = CH[id]; if (!c) return ""; return '<button type="button" class="chip" data-action="rl-unex" data-id="' + id + '" aria-label="' + esc(c.name) + ' を候補に戻す">' + esc(c.name) + ' <span aria-hidden="true">×</span></button>'; }).join("") +
      '</div><button type="button" class="linkbtn mono" data-action="rl-unex-all">全員を候補に戻す</button>';
  }
  function rlResult(c, lane) {
    if (!c) return "";
    var ls = rlLanes(c), cls = window.VEIL_CLS_JP || {};
    return '<div class="rl-result rise" style="--rgb:' + c.rgb + '"><span class="eyebrow mono gold">TODAY\'S PICK</span>' +
      '<div class="rl-res-main">' + portrait(c) + '<div><h2 class="serif">' + esc(c.name) + '</h2><span class="mono muted">' + esc(c.en) + "</span></div></div>" +
      (lane ? '<p class="rl-lane"><span class="mono muted">LANE</span><b class="serif">' + laneLabel(lane) + "</b></p>" : "") +
      '<dl class="rl-facts"><div><dt>クラス</dt><dd>' + esc(cls[c.cls] || c.cls) + (c.sub ? " / " + esc(cls[c.sub] || c.sub) : "") + '</dd></div><div><dt>直近の記録で使われたレーン</dt><dd>' + (ls.length ? ls.map(laneLabel).join("・") : '<span class="muted">記録なし</span>') + "</dd></div></dl>" +
      '<div class="rl-actions"><a class="btn primary" href="#champion-' + c.id + '">詳細を見る' + IC.arrow + '</a>' +
      '<button class="btn ghost" type="button" data-action="rl-spin">もう一回</button>' +
      '<button class="btn ghost" type="button" data-action="rl-ex" data-id="' + c.id + '">候補から外す</button></div></div>';
  }
  function viewRoulette() {
    var f = S.rl, cls = window.VEIL_CLS_JP || {};
    return '<section class="phead">' + atmo({ h: 260, seed: 47 }) + '<div class="wrap">' + crumbs([["HOME", "#home"], ["CHAMPIONS", "#champions"], ["ROULETTE"]]) +
      '<div class="phead-row"><div style="display:flex;flex-direction:column;gap:14px"><h1 class="rise">ROULETTE</h1><p class="jp rise d1">使うヒーローに迷ったら、運命に任せる。</p></div>' +
      '<div style="display:flex;align-items:baseline;gap:12px"><span class="serif gold num" style="font-size:64px;line-height:1" data-rl-count>' + rlPool().length + '</span><span class="mono muted">体が候補</span></div></div></div></section>' +
      '<section class="section tight" style="padding-top:40px"><div class="wrap rl-layout">' +
      '<div class="rl-side"><div class="filters"><div class="fgroups" style="flex-direction:column;gap:20px">' +
      '<div class="fgroup" role="group" aria-label="レーンで絞る"><span class="mono gold" style="font-size:10px">LANE</span>' + chips("rl-lane", [["ALL", "ALL"]].concat(LANE_ORDER.map(function (L) { return [L, L]; })), f.lane) + "</div>" +
      '<div class="fgroup" role="group" aria-label="クラスで絞る"><span class="mono gold" style="font-size:10px">CLASS</span>' + chips("rl-cls", [["ALL", "ALL"]].concat(Object.keys(cls).map(function (k) { return [k, cls[k]]; })), f.cls) + "</div>" +
      '<label class="rl-toggle"><input type="checkbox" data-action="rl-lanetoo"' + (f.laneToo ? " checked" : "") + '><span>レーンが ALL のとき、レーンも一緒に決める</span></label>' +
      '</div></div>' +
      '<div class="rl-exbox"><span class="mono gold" style="font-size:10px">EXCLUDED · 候補から外しているヒーロー</span><div id="rl-ex">' + rlExList() + "</div></div>" +
      '<p class="sample-note">レーンは、直近に登録された' + RL_RECENT + '試合(今は' + (rlLanes(D.champions[0]), RL_LANES._n) + '試合)で、そのヒーローが実際に使われたレーンだけです。一番多く使われたレーン以外は、' + RL_MIN_GAMES + '回以上かつそのヒーローの記録の' + Math.round(RL_MIN_SHARE * 100) + '%以上使われたときだけ入れます。たまたま1回だけ使われたようなレーンは出ません。直近の記録がないヒーローは、レーンを選ぶと候補から外れます。外したヒーローはこのブラウザに保存されます。</p></div>' +
      '<div class="rl-stage"><div class="rl-reel" aria-hidden="true"><span class="rl-mark l"></span><span class="rl-mark r"></span><div id="rl-strip-wrap">' + rlReelIdle() + "</div></div>" +
      '<button id="rl-spin" class="btn primary rl-spin" type="button" data-action="rl-spin"' + (rlPool().length ? "" : " disabled") + '>ルーレットを回す' + IC.arrow + "</button>" +
      '<div id="rl-out" aria-live="polite">' + (f.last && CH[f.last.id] ? rlResult(CH[f.last.id], f.last.lane) : "") + "</div></div>" +
      "</div></section>";
  }
  function rlSpin() {
    var pool = rlPool(); if (!pool.length || S.rl.spinning) return;
    var prev = S.rl.last && S.rl.last.id, cand = pool.length > 1 ? pool.filter(function (c) { return c.id !== prev; }) : pool;
    var win = cand[Math.floor(Math.random() * cand.length)];
    var lane = S.rl.lane !== "ALL" ? S.rl.lane : (S.rl.laneToo ? (function (l) { return l[Math.floor(Math.random() * l.length)]; })(rlLanes(win)) : null);
    S.rl.last = { id: win.id, lane: lane };
    var out = document.getElementById("rl-out"), wrap = document.getElementById("rl-strip-wrap");
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!wrap || reduce) { if (wrap) wrap.innerHTML = '<div class="rl-strip">' + rlCell(pool[Math.floor(Math.random() * pool.length)]) + rlCell(win) + rlCell(pool[Math.floor(Math.random() * pool.length)]) + "</div>"; if (out) out.innerHTML = rlResult(win, lane); return; }
    var N = 34, cells = [];
    for (var i = 0; i < N; i++) cells.push(pool[Math.floor(Math.random() * pool.length)]);
    cells.push(win); cells.push(pool[Math.floor(Math.random() * pool.length)]);
    wrap.innerHTML = '<div class="rl-strip spinning">' + cells.map(rlCell).join("") + "</div>";
    var strip = wrap.firstChild, cellH = strip.firstChild.getBoundingClientRect().height;
    var target = (N - 1) * cellH; /* winner sits in the middle row */
    S.rl.spinning = true; rlCount(); if (out) out.innerHTML = "";
    document.querySelector(".rl-reel").classList.remove("landed");
    strip.style.transform = "translateY(0)";
    void strip.offsetHeight;
    strip.style.transition = "transform 3.6s cubic-bezier(.12,.72,.08,1)";
    strip.style.transform = "translateY(" + (-target) + "px)";
    setTimeout(function () {
      S.rl.spinning = false; rlCount();
      var reel = document.querySelector(".rl-reel"); if (reel) reel.classList.add("landed");
      var o = document.getElementById("rl-out"); if (o && S.rl.last && S.rl.last.id === win.id) o.innerHTML = rlResult(win, lane);
      if (o) { var rb = o.getBoundingClientRect(); if (rb.top > window.innerHeight - 120) o.scrollIntoView({ block: "nearest", behavior: "smooth" }); }
    }, 3700);
  }

  /* ---------------- layout ---------------- */
  var NAV = [["home", "HOME"], ["champions", "CHAMPIONS"], ["equipment", "EQUIPMENT"], ["matchup", "MATCHUP LAB"], ["patch", "PATCH &amp; META"], ["lore", "LORE ARCHIVE"]];
  function header(cur) {
    return '<header class="site-header"><div class="wrap"><a class="logo" href="#home">' + LOGO + "<span>VEIL</span></a>" +
      '<nav class="nav" id="main-nav" aria-label="メインナビゲーション">' + NAV.map(function (n) { return '<a href="#' + n[0] + '"' + (cur === n[0] ? ' aria-current="page"' : "") + ">" + n[1] + "</a>"; }).join("") + "</nav>" +
      '<div class="head-tools"><span class="tag demo-pill">DEMO DATA</span><a class="icon-btn' + (cur === "roulette" ? " on" : "") + '" href="#roulette" aria-label="ヒーロールーレット" title="ヒーロールーレット">' + IC.dice + '</a><button class="icon-btn" type="button" data-action="open-search" aria-label="サイト内検索">' + IC.search + '</button><button class="icon-btn menu-btn" type="button" data-action="menu" aria-label="メニューを開く" aria-expanded="false" aria-controls="main-nav">' + IC.menu + "</button></div></div></header>";
  }
  function footer() {
    return '<footer class="site-footer"><div class="wrap top"><div style="display:flex;flex-direction:column;gap:16px"><a class="logo" href="#home">' + LOGO + "<span>VEIL</span></a>" +
      '<p class="disclaimer">本サイトはMoontonとは無関係の非公式ファンサイトです。Mobile Legends: Bang Bang、ヒーロー名、アートワーク等の権利はMoontonに帰属します。掲載中のキャラクター・数値はすべて開発用のサンプル(DEMO)です。</p></div>' +
      '<div class="cols"><div class="col"><span class="mono gold">DATABASE</span><a href="#champions">キャラクター図鑑</a><a href="#roulette">ヒーロールーレット</a><a href="#equipment">装備一覧</a><a href="#matchup">対面攻略</a><a href="#patch">パッチ・メタ</a></div><div class="col"><span class="mono gold">ARCHIVE</span><a href="#lore">世界観</a><a href="#home">HOME</a></div></div></div>' +
      '<div class="wrap bottom"><span class="mono muted">EVERY BATTLE LEAVES A TRACE.</span><span class="mono muted">VEIL · PROTOTYPE v0.2</span></div></footer>';
  }

  /* ---------------- router ---------------- */
  function route() {
    var h = (location.hash || "").replace(/^#/, "") || "home";
    var m;
    if (h === "home") return { nav: "home", html: viewHome() };
    if (h === "champions") return { nav: "champions", html: viewChampions() };
    if (h === "roulette") return { nav: "roulette", html: viewRoulette() };
    if ((m = h.match(/^champion-([a-z]+)$/))) return { nav: "champions", html: viewChampion(m[1]) };
    if (h === "equipment") return { nav: "equipment", html: viewEquipment() };
    if (h === "emblem") return { nav: "equipment", html: viewEmblem(), title: "EMBLEM — VEIL" };
    if (h === "spells") return { nav: "equipment", html: viewSpells(), title: "SPELLS — VEIL" };
    if ((m = h.match(/^item-([a-z]+)$/))) return { nav: "equipment", html: viewItem(m[1]) };
    if (h === "matchup") return { nav: "matchup", html: viewLab() };
    if ((m = h.match(/^matchup-([a-z]+)-([a-z]+)-([a-z]+)$/))) return { nav: "matchup", html: viewMatchup(m[1], m[2], m[3].toUpperCase()) };
    if (h === "lore") return { nav: "lore", html: viewLore() };
    if ((m = h.match(/^lore-([a-z-]+)$/))) return { nav: "lore", html: viewLore(m[1]), focus: "ev-" + m[1] };
    if (h === "patch") return { nav: "patch", html: viewPatch() };
    return { nav: "", html: viewNotFound() };
  }
  var app = document.getElementById("app");
  function render(keepScroll) {
    var r = route();
    app.innerHTML = header(r.nav) + '<main id="view" tabindex="-1">' + r.html + "</main>" + footer();
    if (r.focus) { var el = document.getElementById(r.focus); if (el) setTimeout(function () { el.scrollIntoView({ block: "center" }); }, 60); }
    else if (!keepScroll) window.scrollTo(0, 0);
    var titles = { roulette: "ROULETTE — VEIL", home: "VEIL", champions: "CHAMPIONS — VEIL", equipment: "EQUIPMENT — VEIL", matchup: "MATCHUP LAB — VEIL", lore: "LORE ARCHIVE — VEIL", patch: "PATCH & META — VEIL" };
    document.title = r.title || titles[r.nav] || "VEIL";
  }
  function go(hash) { if (location.hash === hash) render(); else location.hash = hash; }

  /* ---------------- events ---------------- */
  document.addEventListener("click", function (ev) {
    var t = ev.target.closest("[data-action]");
    if (!t) { var a = ev.target.closest('a[href^="#"]'); if (a) { var nav = document.getElementById("main-nav"); if (nav) nav.classList.remove("open"); } return; }
    var act = t.getAttribute("data-action");
    if (act === "artnext") { var aid = t.getAttribute("data-id"), pn = artPool(CH[aid]).length; S.artSel = S.artSel || {}; S.artSel[aid] = ((S.artSel[aid] || 0) + 1) % pn;
      var A2 = artOf(CH[aid]), pos2 = A2.pos || "50% 30%";
      document.querySelectorAll(".dbg img, .dbody-art").forEach(function (im) { im.src = A2.img; im.style.objectPosition = pos2; });
      var cr = document.querySelector(".dbg-credit"); if (cr) cr.textContent = (A2.name ? A2.name + " · " : "") + (A2.credit || "© MOONTON");
      t.textContent = "SKIN " + (A2.i + 1) + " / " + A2.n + " ↻"; return; }
    if (act === "rl-spin") { if (!document.getElementById("rl-strip-wrap")) return; rlSpin(); return; }
    if (act === "rl-ex") { var ex = rlEx(), xid = t.getAttribute("data-id"); if (ex.indexOf(xid) < 0) ex.push(xid); rlSetEx(ex); S.rl.last = null; document.getElementById("rl-out").innerHTML = '<p class="muted rl-note">' + esc(CH[xid].name) + ' を候補から外しました。</p>'; document.getElementById("rl-ex").innerHTML = rlExList(); rlCount(); return; }
    if (act === "rl-unex") { rlSetEx(rlEx().filter(function (x) { return x !== t.getAttribute("data-id"); })); document.getElementById("rl-ex").innerHTML = rlExList(); rlCount(); return; }
    if (act === "rl-unex-all") { rlSetEx([]); document.getElementById("rl-ex").innerHTML = rlExList(); rlCount(); return; }
    if (act === "rl-lanetoo") { S.rl.laneToo = t.checked; return; }
    if (act === "skip") { ev.preventDefault(); var mv = document.getElementById("view"); if (mv) mv.focus(); return; }
    if (act === "filter") {
      var g = t.getAttribute("data-group"), v = t.getAttribute("data-value");
      if (g === "rl-lane" || g === "rl-cls") { S.rl[g === "rl-lane" ? "lane" : "cls"] = v; document.querySelectorAll('[data-group="' + g + '"]').forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-value") === v)); }); if (!S.rl.spinning) document.getElementById("rl-strip-wrap").innerHTML = rlReelIdle(); rlCount(); return; }
      if (g === "icat") { S.itf.cat = v; document.querySelectorAll('[data-group="' + g + '"]').forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-value") === v)); }); document.getElementById("item-grid").innerHTML = itemGrid(); return; }
      if (g === "meta-role") { S.meta.role = v; document.querySelectorAll('[data-group="meta-role"]').forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-value") === v)); }); document.getElementById("meta-table").innerHTML = metaTable(); return; }
      S.cf[g] = v;
      document.querySelectorAll('[data-group="' + g + '"]').forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-value") === v)); });
      document.getElementById("champ-grid").innerHTML = champGrid();
    } else if (act === "reset-items") {
      S.itf = { q: "", cat: "ALL", sort: (S.itf || {}).sort || "price" }; render(true);
    } else if (act === "reset-filters") {
      S.cf = { q: "", role: "ALL", diff: "ALL", attr: "ALL", sort: S.cf.sort }; render(true);
    } else if (act === "sort") {
      var k = t.getAttribute("data-key"); if (S.meta.key === k) S.meta.dir *= -1; else { S.meta.key = k; S.meta.dir = k === "name" ? 1 : -1; }
      document.getElementById("meta-table").innerHTML = metaTable();
    } else if (act === "unseal") {
      S.secrets[t.getAttribute("data-i")] = true; render(true);
    } else if (act === "lab-from") {
      var id = t.getAttribute("data-id"), c = CH[id];
      var reg = Object.keys(D.matchups).filter(function (k) { return k.indexOf(id + "|") === 0; })[0];
      S.lab.you = id; S.lab.lane = curRole(c); var stv = ((window.VEIL_STATS || {})[id] || { vs: {} }).vs, opp = Object.keys(stv).filter(function (k) { return k.split("|")[1] === S.lab.lane; }).sort(function (a, b) { return stv[b].games - stv[a].games; })[0];
      S.lab.enemy = opp ? opp.split("|")[0] : (D.champions.filter(function (o) { return o.id !== id; })[0] || {}).id;
      go("#matchup");
    } else if (act === "emb") {
      var eid = t.getAttribute("data-id"); S.emb = S.emb || {}; S.emb[eid] = t.getAttribute("data-value");
      var eb = document.getElementById("emb-box"); if (eb) eb.innerHTML = embBox(CH[eid]);
    } else if (act === "herorole") {
      var hid = t.getAttribute("data-id"), hc = CH[hid]; S.heroRole = S.heroRole || {}; S.heroRole[hid] = t.getAttribute("data-value");
      document.querySelectorAll('[data-action="herorole"]').forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-value") === S.heroRole[hid])); });
      var rf = document.getElementById("role-facts"); if (rf) rf.innerHTML = roleFacts(hc);
      var rsy = document.getElementById("role-syn"); if (rsy) rsy.innerHTML = roleSynergy(hc);
      var sbx = document.getElementById("stats-box"); if (sbx) sbx.innerHTML = statsBox(hc);
    } else if (act === "statrank" || act === "statperiod") {
      var cid = t.getAttribute("data-id"), val = t.getAttribute("data-value");
      if (act === "statrank") { S.statRank = S.statRank || {}; S.statRank[cid] = val; }
      else { S.statPeriod = S.statPeriod || {}; S.statPeriod[cid] = Number(val); }
      var sb = document.getElementById("stats-box"); if (sb) sb.innerHTML = statsBox(CH[cid]);
    } else if (act === "buildvar") {
      S.buildVar = S.buildVar || {}; S.buildVar[t.getAttribute("data-id")] = t.getAttribute("data-value");
      var bb = document.getElementById("build-box"); if (bb) bb.innerHTML = buildBox(CH[t.getAttribute("data-id")]);
    } else if (act === "video") {
      var v = t.querySelector("video"); if (v) { if (v.paused) { var pr = v.play(); if (pr && pr.catch) pr.catch(function () {}); t.classList.add("on"); } else { v.pause(); t.classList.remove("on"); } }
    } else if (act === "tab") {
      selectTab(t.getAttribute("data-target"), false);
    } else if (act === "menu") {
      var n = document.getElementById("main-nav"); var open = n.classList.toggle("open"); t.setAttribute("aria-expanded", String(open));
    } else if (act === "open-search") { openSearch(); }
    else if (act === "close-search") { closeSearch(); }
  });
  document.addEventListener("input", function (ev) {
    var t = ev.target;
    if (t.getAttribute("data-input") === "cf-q") { S.cf.q = t.value; document.getElementById("champ-grid").innerHTML = champGrid(); }
    if (t.getAttribute("data-input") === "it-q") { S.itf.q = t.value; document.getElementById("item-grid").innerHTML = itemGrid(); }
    if (t.id === "search-input") runSearch(t.value);
  });
  document.addEventListener("change", function (ev) {
    var t = ev.target, b = t.getAttribute("data-bind");
    if (b === "cf-sort") { S.cf.sort = t.value; document.getElementById("champ-grid").innerHTML = champGrid(); }
    if (b === "it-sort") { S.itf.sort = t.value; document.getElementById("item-grid").innerHTML = itemGrid(); }
    if (b === "q-you" || b === "l-you") S.lab.you = t.value;
    if (b === "q-enemy" || b === "l-enemy") S.lab.enemy = t.value;
    if (b === "q-lane" || b === "l-lane") S.lab.lane = t.value;
  });
  document.addEventListener("submit", function (ev) {
    var f = ev.target.getAttribute("data-form"); if (!f) return;
    ev.preventDefault();
    var p = f === "quick" ? "q-" : "l-";
    S.lab.you = document.getElementById(p + "you").value; S.lab.enemy = document.getElementById(p + "enemy").value; S.lab.lane = document.getElementById(p + "lane").value;
    go(muHash(S.lab.you, S.lab.enemy, S.lab.lane));
  });


  function selectTab(id, focus) {
    S.dtab = id;
    document.querySelectorAll(".dtab").forEach(function (b) {
      var on = b.getAttribute("data-target") === id;
      b.setAttribute("aria-selected", String(on)); b.setAttribute("tabindex", on ? "0" : "-1");
      if (on) { b.scrollIntoView({ block: "nearest", inline: "nearest" }); if (focus) b.focus(); }
    });
    document.querySelectorAll('[role="tabpanel"]').forEach(function (p) { p.hidden = p.id !== id; });
    var bar = document.querySelector(".dtabs");
    if (bar) { var stuck = bar.getBoundingClientRect().top <= 73; if (stuck) { var y = bar.parentNode.getBoundingClientRect().top + window.scrollY - 72; window.scrollTo(0, y); } }
  }
  document.addEventListener("keydown", function (e) {
    var t = e.target; if (!t.classList || !t.classList.contains("dtab")) return;
    var tabs = Array.prototype.slice.call(document.querySelectorAll(".dtab")), i = tabs.indexOf(t), n = -1;
    if (e.key === "ArrowRight") n = (i + 1) % tabs.length; else if (e.key === "ArrowLeft") n = (i - 1 + tabs.length) % tabs.length; else if (e.key === "Home") n = 0; else if (e.key === "End") n = tabs.length - 1;
    if (n >= 0) { e.preventDefault(); selectTab(tabs.at(n).getAttribute("data-target"), true); }
  });
  document.addEventListener("mouseover", function (e) {
    var b = e.target.closest && e.target.closest(".vclip video") ? e.target.closest(".vclip") : (e.target.closest && e.target.closest("button.vclip"));
    if (b && !b.classList.contains("on")) { var v = b.querySelector("video"); var pr = v.play(); if (pr && pr.catch) pr.catch(function () {}); b.classList.add("on", "hov"); }
  });
  document.addEventListener("mouseout", function (e) {
    var b = e.target.closest && e.target.closest("button.vclip");
    if (b && b.classList.contains("hov") && !b.contains(e.relatedTarget)) { b.querySelector("video").pause(); b.classList.remove("on", "hov"); }
  });
  /* ---------------- search dialog ---------------- */
  var dlg = document.getElementById("search");
  var INDEX = [];
  D.champions.forEach(function (c) { INDEX.push({ t: c.name, s: c.title + " · " + laneLabel(c.role), h: "#champion-" + c.id, k: "CHAMPION", c: c, q: (c.name + c.title + c.role + c.desc).toLowerCase() }); });
  Object.keys(D.matchups).forEach(function (k) { var p = k.split("|"); INDEX.push({ t: CH[p[0]].name + " vs " + CH[p[1]].name, s: laneLabel(p[2]) + " · " + D.matchups[k].key, h: muHash(p[0], p[1], p[2]), k: "MATCHUP", c: CH[p[0]], q: (CH[p[0]].name + CH[p[1]].name + "vs対面" + D.matchups[k].key).toLowerCase() }); });
  Object.keys(G.items).forEach(function (id) { var it = G.items[id]; INDEX.push({ t: it.name, s: catLabel(it) + " · " + it.tag + " · " + it.stats.join(" "), h: "#item-" + id, k: "ITEM", q: (it.name + it.tag + it.passive).toLowerCase() }); });
  G.talents.forEach(function (tr) { tr.list.forEach(function (t) { INDEX.push({ t: t.name, s: "天賦 " + tr.label + " · " + (t.sub || t.desc), h: "#emblem", k: "TALENT", q: (t.name + (t.sub || "") + t.desc).toLowerCase() }); }); });
  G.spells.forEach(function (sp) { INDEX.push({ t: sp.name, s: "バトルスキル · " + sp.tag + " · CD " + sp.cd + "秒", h: "#spells", k: "SPELL", q: (sp.name + sp.tag + sp.desc).toLowerCase() }); });
  if (D.lore) D.lore.events.forEach(function (e) { INDEX.push({ t: e.name, s: e.era, h: "#lore-" + e.id, k: "LORE", q: (e.name + e.text).toLowerCase() }); });
  if (D.lore) D.lore.nations.forEach(function (n) { INDEX.push({ t: n.name, s: "国家", h: "#lore", k: "LORE", q: (n.name + n.text).toLowerCase() }); });
  [["パッチ・メタ", "#patch"], ["Tier List", "#patch"], ["対面攻略", "#matchup"]].forEach(function (p) { INDEX.push({ t: p[0], s: "ページ", h: p[1], k: "PAGE", q: p[0].toLowerCase() }); });
  function runSearch(q) {
    q = q.trim().toLowerCase();
    var res = q ? INDEX.filter(function (i) { return i.q.indexOf(q) >= 0 || i.t.toLowerCase().indexOf(q) >= 0; }).slice(0, 12) : INDEX.filter(function (i) { return i.k === "MATCHUP"; });
    var box = document.getElementById("search-results");
    box.innerHTML = res.length ? res.map(function (i) {
      return '<a href="' + i.h + '" data-action="close-search">' + (i.c ? portrait(i.c, true) : '<span class="portrait sm" style="color:var(--gold)">' + LOGO + "</span>") + '<span style="display:flex;flex-direction:column;flex:1;min-width:0"><span class="serif" style="font-size:19px">' + esc(i.t) + '</span><span class="muted" style="font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(i.s) + '</span></span><span class="mono gold" style="font-size:10px">' + i.k + "</span></a>";
    }).join("") : '<div class="empty" style="border:0;padding:40px 20px"><h3>見つかりませんでした</h3><p class="muted" style="font-size:13px">キャラクター名(例:Ilsyra)や、事件の名前で探してください。</p></div>';
  }
  function openSearch() { dlg.classList.add("open"); var i = document.getElementById("search-input"); i.value = ""; runSearch(""); setTimeout(function () { i.focus(); }, 30); }
  function closeSearch() { dlg.classList.remove("open"); }
  dlg.addEventListener("click", function (e) { if (e.target === dlg) closeSearch(); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && dlg.classList.contains("open")) closeSearch();
    if (e.key === "/" && !dlg.classList.contains("open") && !/input|select|textarea/i.test(document.activeElement.tagName)) { e.preventDefault(); openSearch(); }
  });

  /* ---------------- boot ---------------- */
  var tp0 = topPairs(1)[0]; if (tp0) S.lab = { you: tp0.y, enemy: tp0.e, lane: tp0.lane };
  window.addEventListener("hashchange", function () { closeSearch(); S.artSel = {}; render(); });
  render();
  var curtain = document.getElementById("curtain");
  function lift() { curtain.classList.add("done"); }
  setTimeout(lift, 700);
  window.VEIL_TEST = { route: route, filteredChamps: filteredChamps, S: S };
})();
