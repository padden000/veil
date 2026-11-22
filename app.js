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
      '<div class="plx" style="--d:.15"><div style="position:absolute;inset:0;background:radial-gradient(ellipse 55% 60% at ' + (opts.lx || 70) + '% 25%, rgba(185,154,104,.15), transparent 70%), radial-gradient(ellipse 45% 55% at 5% 100%, rgba(113,32,42,.38), transparent 70%), radial-gradient(ellipse 80% 60% at 50% 0%, rgba(101,113,125,.12), transparent 70%)"></div></div>' +
      '<div class="plx" style="--d:.25"><div class="rays"></div></div>' +
      (opts.far === false ? "" : '<div class="plx" style="--d:.35"><svg class="ruins" viewBox="0 0 1440 460" preserveAspectRatio="xMidYMax slice" style="height:' + Math.round(h * 1.3) + 'px;opacity:.9"><path fill="#141418" fill-rule="evenodd" d="' + ruins(1440, 460, 150, 6, opts.seed || 7, 230) + '"/></svg></div>') +
      '<div class="plx" style="--d:.55"><div class="fog" style="bottom:40px;height:' + Math.round(h * .8) + 'px;background:radial-gradient(ellipse 40% 50% at 30% 60%, rgba(133,131,138,.16), transparent 70%), radial-gradient(ellipse 35% 45% at 75% 50%, rgba(133,131,138,.12), transparent 70%)"></div></div>' +
      '<div class="plx" style="--d:.8"><svg class="ruins" viewBox="0 0 1440 300" preserveAspectRatio="xMidYMax slice" style="height:' + Math.round(h * .8) + 'px"><path fill="#0B0B0D" fill-rule="evenodd" d="' + ruins(1440, 300, 120, 9, (opts.seed || 7) + 4, 120) + '"/></svg></div>' +
      '<div class="plx" style="--d:1"><div class="fog b" style="bottom:-40px;height:' + Math.round(h * .5) + 'px;background:radial-gradient(ellipse 50% 60% at 50% 60%, rgba(133,131,138,.14), transparent 70%)"></div></div>' +
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
    if (window.VEIL_TOP_PAIRS) return window.VEIL_TOP_PAIRS.filter(function (p) { return CH[p.y] && CH[p.e]; }).slice(0, n);
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
    return '<section class="hero" aria-label="メインビジュアル">' + atmo({ h: 420, far: false, lx: 68 }).replace('<div class="atmo" aria-hidden="true">', '<div class="atmo" aria-hidden="true"><div class="plx" style="--d:.3"><div class="hero-art"><img src="kagura-skin.png" alt=""></div></div><div style="position:absolute;inset:0;background:linear-gradient(90deg, rgba(9,9,11,.82) 0%, rgba(9,9,11,.5) 40%, rgba(9,9,11,0) 70%)"></div>') +
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

      (function () { var ad = adSlot("home-interlude", "wide"); return ad ? '<section class="band ad-band"><div class="wrap">' + ad + "</div></section>" : ""; })() +

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
      heroProsCons(c) + "</div>" +
      '<div class="ov-syn" id="role-syn">' + roleSynergy(c) + "</div></div>" +

      '<div class="block" ' + P("sec-skills") + '><h2>SKILLS <small>スキル</small></h2><div>' + skillSlots + "</div></div>" +

      '<div class="block" ' + P("sec-build") + '><h2>BUILD <small>ビルド</small></h2>' + prep("おすすめ・直近の人気・フル火力・バランス・フル防具のビルドを、ここに表示します。") +
      '<div class="loadout"><div id="emb-box" class="embwrap">' + embBox(c) + '</div><div class="item"><b>SPELL · バトルスキル</b><span class="muted" style="font-size:13px">このヒーローのおすすめはデータ待ちです</span><a class="link" href="#spells" style="padding:0">バトルスキルの一覧を見る' + IC.arrow + '</a></div></div></div>' +

      '<div class="block" ' + P("sec-matchups") + '><h2>MATCHUPS <small>' + laneLabel(c.role) + ' での対戦成績</small></h2><div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:24px">' +
      '<div style="display:flex;flex-direction:column;gap:12px"><span class="mono gold" style="font-size:10px">勝ち越している相手</span>' + muList(c.strong) + "</div>" +
      '<div style="display:flex;flex-direction:column;gap:12px"><span class="mono" style="font-size:10px;color:var(--redtext)">負け越している相手</span>' + muList(c.weak) + "</div></div>" +
      '<p class="muted" style="font-size:12px">同じレーンで当たった相手との記録です。試合数が少ないため、相性の目安として見てください。</p></div>' +

      '<div class="block" ' + P("sec-stats") + '><h2>STATISTICS <small>統計</small></h2><div id="stats-box" style="display:flex;flex-direction:column;gap:18px">' + statsBox(c) + "</div></div>" +

      '<div class="block" ' + P("sec-guide") + '><h2>PLAYBOOK <small>立ち回り</small></h2>' + heroPlaybook(c) + "</div>" +

      '<div class="block" ' + P("sec-skins") + '><h2>SKINS <small>スキン</small></h2>' + skins + "</div>" +

      '<div class="block" ' + P("sec-faq") + '><h2>FAQ <small>よくある質問</small></h2><div class="faq">' + faq + "</div></div>" +

      adSlot("champion-data", "box") +

      heroByline(c) + "</div>" +

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
  /* the user's own games with this hero: the hero they marked as themselves in that match (MATCH LOG),
     or, for matches with no mark, the ally in their usual lane (see MY PAGE) */
  function myHeroRec(id) {
    if (dbOn() && AUTH.user && !S.myMatches) loadMyMatches();
    var out = { setup: meSetUp(), all: { games: 0, wins: 0 }, month: {}, day: {} };
    meList().forEach(function (m) {
      var ml = meMyLane(m); if (!ml || m.ally[ml.lane] !== id) return;
      var mo = m.date.slice(0, 7); out.all.games++; if (m.win) out.all.wins++;
      out.month[mo] = out.month[mo] || { games: 0, wins: 0 }; out.month[mo].games++; if (m.win) out.month[mo].wins++;
      out.day[m.date] = out.day[m.date] || { games: 0, wins: 0 }; out.day[m.date].games++; if (m.win) out.day[m.date].wins++;
    });
    return out;
  }
  var MY_COLOR = "#6E9BD1";

  /* ---------------- scrolling charts (hero page · MY PAGE) ----------------
     One strip with every day (or month) on it, like a stock chart: drag or swipe sideways to go back in time.
     bars = games (volume), dots = that day's / month's win rate, gold line = the spec's line
     (ma: 7-day average · cum: running total from the start · point: the month's own rate), blue = your own games.
     A view registers a spec function by id with schartBox(); render() mounts every chart on the page. */
  var SCH = {}, DAY_MA = 7, DAY_THIN = 3;
  var DAY_ZOOM = [["1M", "1か月", 30], ["3M", "3か月", 90], ["ALL", "全期間", 0]];
  function dayData(id) { var h = DBC.h && DBC.h[id]; return h && h.day ? h.day : null; }
  function dIso(d) { return d.getUTCFullYear() + "-" + ("0" + (d.getUTCMonth() + 1)).slice(-2) + "-" + ("0" + d.getUTCDate()).slice(-2); }
  function jstToday() { return dIso(new Date(Date.now() + 9 * 3600e3)); }
  function schKeys(unit, a, b) {
    var out = [], d = new Date((unit === "month" ? a + "-01" : a) + "T00:00:00Z"), e = new Date((unit === "month" ? b + "-01" : b) + "T00:00:00Z");
    for (var n = 0; d <= e && n < 4000; n++) { out.push(unit === "month" ? dIso(d).slice(0, 7) : dIso(d)); if (unit === "month") d.setUTCMonth(d.getUTCMonth() + 1); else d.setUTCDate(d.getUTCDate() + 1); }
    return out;
  }
  function schartBox(cid, specFn) { SCH[cid] = specFn; return '<div class="dchart schart" data-cid="' + cid + '">' + schartInner(cid) + "</div>"; }
  function schartInner(cid) {
    var sp = SCH[cid] && SCH[cid]();
    if (!sp) return "";
    if (sp.loading) return '<div class="slot" style="height:120px"><span class="muted" style="font-size:13px">' + sp.loading + "</span></div>";
    var head = (sp.pick || "") + (!sp.rows.length ? "" : '<div class="dchart-head"><div class="legend">' + sp.legend.map(function (l) { return '<span><i class="me-key" style="' + l[1] + '"></i>' + l[0] + "</span>"; }).join("") + "</div>" +
      (sp.zooms ? '<div class="fgroup" role="group" aria-label="表示する期間">' + sp.zooms.map(function (o) { return '<button type="button" class="chip" data-action="szoom" data-cid="' + cid + '" data-z="' + o[0] + '" aria-pressed="' + (schZoom(cid, sp) === o[0]) + '">' + o[1] + "</button>"; }).join("") + "</div>" : "") + "</div>");
    if (!sp.rows.length) return head + '<div class="slot" style="height:120px"><span class="muted" style="font-size:13px">' + (sp.empty || "記録はまだありません。") + "</span></div>";
    return head + '<div class="dchart-frame"><div class="dchart-y" aria-hidden="true"></div><div class="dchart-scroll" tabindex="0" aria-label="' + esc(sp.label) + '。左右にスクロールできます"></div><div class="dchart-tip" hidden></div></div>' +
      (sp.note ? '<p class="muted dchart-note">' + sp.note + "</p>" : "");
  }
  function schZoom(cid, sp) { S.schZoom = S.schZoom || {}; return S.schZoom[cid] || sp.defZoom || (sp.zooms ? sp.zooms[0][0] : ""); }
  function schRedraw(cid) { var b = document.querySelector('.schart[data-cid="' + cid + '"]'); if (b) { b.innerHTML = schartInner(cid); mountChart(b, false); } }
  function mountCharts(keepPos) { document.querySelectorAll(".schart").forEach(function (b) { mountChart(b, keepPos); }); }
  function mountChart(box, keepPos) {
    var cid = box.getAttribute("data-cid"), sp = SCH[cid] && SCH[cid]();
    var sc = box.querySelector(".dchart-scroll"), yax = box.querySelector(".dchart-y"), tip = box.querySelector(".dchart-tip");
    if (!sp || sp.loading || !sp.rows.length || !sc) return;
    /* a hidden tab has no width yet: draw when it gets one, and again when the width changes */
    if (!sc._ro && window.ResizeObserver) { sc._ro = new ResizeObserver(function () { if (sc.clientWidth && sc.clientWidth !== sc._w) mountChart(box, true); }); sc._ro.observe(sc); }
    if (!sc.clientWidth) return;
    sc._w = sc.clientWidth;
    var prevRight = keepPos && sc.scrollWidth > sc.clientWidth ? sc.scrollWidth - sc.scrollLeft - sc.clientWidth : 0;
    var month = sp.unit === "month", by = {}; sp.rows.forEach(function (r) { by[r.k] = r; });
    var keys = schKeys(sp.unit, sp.start, sp.end), my = sp.my || {}, cg = 0, cw = 0;
    var pts = keys.map(function (k, i) {
      var r = by[k], g = r ? r.g : 0, w = r ? r.w : 0, lg = 0, lw = 0;
      if (sp.line === "ma") { for (var j = Math.max(0, i - DAY_MA + 1); j <= i; j++) { var q = by[keys[j]]; if (q) { lg += q.g; lw += q.w; } } }
      else if (sp.line === "cum") { cg += g; cw += w; lg = cg; lw = cw; }
      else { lg = g; lw = w; }
      return { k: k, g: g, w: w, lg: lg, lw: lw, my: my[k] || null };
    });
    var view = sc.clientWidth, z = schZoom(cid, sp);
    var cnt = sp.zooms ? ((sp.zooms.filter(function (o) { return o[0] === z; })[0] || sp.zooms[0])[2] || pts.length) : Math.min(pts.length, sp.span ? sp.span[view < 560 ? 0 : 1] : pts.length);   /* span: [phone, wide] */
    var T = 18, PH = 150, VB = 46, VT = T + PH + 22, AX = VT + VB + 22, H = AX + 6;
    var dw = Math.max(view / Math.max(cnt, 1), 2), W = Math.max(view, Math.ceil(dw * pts.length));
    if (pts.length * dw < view) dw = view / pts.length;
    var X = function (i) { return (i + .5) * dw; }, Y = function (v) { return T + (100 - v) / 100 * PH; };
    var maxG = Math.max.apply(null, pts.map(function (p) { return p.g; }).concat([1]));
    var s = "";
    [0, 50, 100].forEach(function (v) { s += '<line x1="0" x2="' + W + '" y1="' + Y(v) + '" y2="' + Y(v) + '" stroke="' + (v === 50 ? "#65717D" : "#202026") + '"' + (v === 50 ? ' stroke-dasharray="2 4"' : "") + "/>"; });
    s += '<line x1="0" x2="' + W + '" y1="' + (VT + VB) + '" y2="' + (VT + VB) + '" stroke="#202026"/>';
    /* axis: months (and the year in January) for month charts; month starts and Mondays for day charts */
    pts.forEach(function (p, i) {
      if (month) {
        var mo = Number(p.k.slice(5, 7));
        s += '<text x="' + X(i) + '" y="' + (AX - 2) + '" text-anchor="middle" fill="' + (mo === 1 ? "#E8E5DF" : "#B4B1AA") + '" font-size="11">' + (mo === 1 || i === 0 ? p.k.slice(0, 4) + "." : "") + mo + "月</text>";
        return;
      }
      var dt0 = new Date(p.k + "T00:00:00Z"), dd = dt0.getUTCDate(), left = new Date(Date.UTC(dt0.getUTCFullYear(), dt0.getUTCMonth() + 1, 0)).getUTCDate() - dd;
      if (dd === 1) s += '<line x1="' + (i * dw) + '" x2="' + (i * dw) + '" y1="' + T + '" y2="' + (VT + VB) + '" stroke="#26262C"/><text x="' + (i * dw + 4) + '" y="' + (AX - 2) + '" fill="#B4B1AA" font-size="11">' + Number(p.k.slice(5, 7)) + "月</text>";
      else if (dt0.getUTCDay() === 1 && dw >= 5 && dd > 3 && left > 1) s += '<text x="' + X(i) + '" y="' + (AX - 2) + '" text-anchor="middle" fill="#65636A" font-size="10">' + dd + "</text>";
    });
    var bw = Math.max(1, Math.min(dw * .62, month ? 26 : 14));
    pts.forEach(function (p, i) { if (p.g) { var h = Math.max(2, p.g / maxG * VB); s += '<rect x="' + (X(i) - bw / 2).toFixed(1) + '" y="' + (VT + VB - h).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + h.toFixed(1) + '" fill="#3A4048"/>'; } });
    /* the gold line; for month charts empty months are bridged with a faint dashed segment */
    var line = "", bridge = "", pen = false, lastI = -1;
    pts.forEach(function (p, i) {
      if (!p.lg) { pen = false; return; }
      var x = X(i).toFixed(1), y = Y(p.lw / p.lg * 100).toFixed(1);
      if (!pen && lastI >= 0 && sp.line === "point") bridge += "M" + X(lastI).toFixed(1) + " " + Y(pts[lastI].lw / pts[lastI].lg * 100).toFixed(1) + "L" + x + " " + y;
      line += (pen ? "L" : "M") + x + " " + y; pen = true; lastI = i;
    });
    if (bridge) s += '<path d="' + bridge + '" fill="none" stroke="#B99A68" stroke-opacity=".45" stroke-width="1.5" stroke-dasharray="3 5"/>';
    s += '<path d="' + line + '" fill="none" stroke="#B99A68" stroke-width="2" stroke-linejoin="round"/>';
    /* your own line on month charts */
    if (month && sp.my) {
      var ml = "", mpen = false;
      pts.forEach(function (p, i) { if (!p.my) { mpen = false; return; } ml += (mpen ? "L" : "M") + X(i).toFixed(1) + " " + Y(p.my.wins / p.my.games * 100).toFixed(1); mpen = true; });
      s += '<path d="' + ml + '" fill="none" stroke="' + MY_COLOR + '" stroke-width="2" stroke-dasharray="6 4"/>';
    }
    var r0 = month ? 4 : Math.max(1.6, Math.min(dw * .22, 3.6)), thin = month ? 5 : DAY_THIN;
    pts.forEach(function (p, i) {
      var x = X(i), wr = p.g ? p.w / p.g * 100 : null, mwr = p.my ? p.my.wins / p.my.games * 100 : null, myAbove = mwr != null && wr != null && mwr > wr;
      if (p.g) s += '<circle cx="' + x.toFixed(1) + '" cy="' + Y(wr).toFixed(1) + '" r="' + r0 + '" fill="' + (month ? "#B99A68" : "#E8E5DF") + '"' + (month ? ' stroke="#111114" stroke-width="2"' : "") + ' opacity="' + (p.g < thin ? (month ? ".5" : ".25") : (month ? "1" : ".7")) + '"/>';
      if (month && p.g && dw >= 46) s += '<text x="' + x.toFixed(1) + '" y="' + (Y(wr) + (myAbove ? 18 : -10)).toFixed(1) + '" text-anchor="middle" fill="#E8E5DF" font-size="11">' + Math.round(wr) + "% (" + p.g + ")</text>";
      if (p.my) {
        var a = month ? 9 : Math.max(4, r0 * 2.2), my2 = Y(mwr);
        s += '<rect x="' + (x - a / 2).toFixed(1) + '" y="' + (my2 - a / 2).toFixed(1) + '" width="' + a.toFixed(1) + '" height="' + a.toFixed(1) + '" fill="' + MY_COLOR + '" stroke="#111114" stroke-width="1.5"/>';
        if (month && dw >= 46) s += '<text x="' + x.toFixed(1) + '" y="' + (Math.abs(mwr - wr) < 0.5 ? Y(wr) + 18 : my2 + (myAbove ? -10 : 18)).toFixed(1) + '" text-anchor="middle" fill="' + MY_COLOR + '" font-size="11">' + (Math.abs(mwr - wr) < 0.5 ? "あなたも " : "") + Math.round(mwr) + "% (" + p.my.games + ")</text>";
      }
    });
    s += '<line class="dchart-cross" x1="0" x2="0" y1="' + T + '" y2="' + (VT + VB) + '" stroke="#B99A68" stroke-opacity=".5" visibility="hidden"/>';
    sc.innerHTML = '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(sp.label) + '">' + s + "</svg>";
    yax.innerHTML = [100, 50, 0].map(function (v) { return '<span style="top:' + (Y(v) - 7) + 'px">' + v + "%</span>"; }).join("") + '<span style="top:' + (VT - 4) + 'px">' + maxG + "試合</span>";
    sc.scrollLeft = keepPos ? sc.scrollWidth - sc.clientWidth - prevRight : sc.scrollWidth;
    var cross = sc.querySelector(".dchart-cross");
    function show(clientX) {
      var rect = sc.getBoundingClientRect(), x = clientX - rect.left + sc.scrollLeft, i = Math.max(0, Math.min(pts.length - 1, Math.floor(x / dw))), p = pts[i];
      cross.setAttribute("x1", X(i)); cross.setAttribute("x2", X(i)); cross.setAttribute("visibility", "visible");
      var head = month ? p.k.slice(0, 4) + "年" + Number(p.k.slice(5)) + "月" : p.k.replace(/-/g, ".") + " (" + "日月火水木金土".charAt(new Date(p.k + "T00:00:00Z").getUTCDay()) + ")";
      tip.innerHTML = '<b class="num">' + head + "</b>" +
        (p.g ? "<span>" + p.g + "試合 " + p.w + "勝 · 勝率 " + pct(p.w / p.g * 100) + "</span>" : '<span class="muted">試合なし</span>') +
        (sp.line !== "point" && p.lg ? '<span class="gold">' + sp.lineName + " " + pct(p.lw / p.lg * 100) + " (" + p.lg + "試合)</span>" : "") +
        (p.my ? '<span style="color:' + MY_COLOR + '">あなた ' + p.my.games + "試合 " + p.my.wins + "勝 · " + pct(p.my.wins / p.my.games * 100) + "</span>" : "");
      tip.hidden = false;
      var left = X(i) - sc.scrollLeft + sc.offsetLeft, tw = tip.offsetWidth, fw = box.querySelector(".dchart-frame").clientWidth;
      tip.style.left = Math.max(4, Math.min(fw - tw - 4, left + 12 + tw > fw ? left - tw - 12 : left + 12)) + "px";
    }
    function hide() { cross.setAttribute("visibility", "hidden"); tip.hidden = true; }
    var drag = null;
    sc.onpointerdown = function (e) { if (e.pointerType === "mouse") { drag = { x: e.clientX, s: sc.scrollLeft, moved: false }; sc.setPointerCapture(e.pointerId); } else show(e.clientX); };
    sc.onpointermove = function (e) {
      if (drag) { var dx = e.clientX - drag.x; if (Math.abs(dx) > 3) drag.moved = true; sc.scrollLeft = drag.s - dx; sc.classList.add("grabbing"); hide(); return; }
      if (e.pointerType === "mouse") show(e.clientX);
    };
    sc.onpointerup = function (e) { if (drag && !drag.moved) show(e.clientX); drag = null; sc.classList.remove("grabbing"); };
    sc.onpointerleave = function (e) { if (!drag && e.pointerType === "mouse") hide(); };
  }
  var SCH_NOTE = "左右にドラッグ(スマホはスワイプ)で過去へ。カーソルを当てるかタップすると、その日の数字が出ます。", SCH_NOTE_M = "左右にドラッグ(スマホはスワイプ)で前の月へ。カーソルを当てるかタップすると、その月の数字が出ます。";
  /* chart specs */
  function heroMonthSpec(c, ST, MY) {
    var ks = Object.keys(ST.month).sort(), now = jstToday().slice(0, 7);
    return { unit: "month", start: ks[0], end: ks[ks.length - 1] > now ? ks[ks.length - 1] : now, rows: ks.map(function (k) { return { k: k, g: ST.month[k].games, w: ST.month[k].wins }; }),
      my: MY.all.games ? MY.month : null, line: "point", span: [4, 8], label: "月ごとの勝率の推移",
      legend: [["全体(両チーム)", "background:#B99A68;border-radius:50%"]].concat(MY.all.games ? [["あなた(点線)", "background:" + MY_COLOR]] : []).concat([["試合数", "background:#3A4048"]]),
      note: "数字は「勝率(試合数)」。全体は5試合未満の月を薄くしています。記録のない月は細い点線でつないでいます。" + SCH_NOTE_M };
  }
  function heroDaySpec(c, MY) {
    var rows = dayData(c.id);
    if (!rows) return { loading: "日ごとの記録を読み込んでいます…" };
    return { unit: "day", start: rows.length ? rows[0].day : "", end: jstToday(), rows: rows.map(function (r) { return { k: r.day, g: r.games, w: r.wins }; }),
      my: MY.all.games ? MY.day : null, line: "ma", lineName: DAY_MA + "日平均", zooms: DAY_ZOOM, defZoom: "3M", label: "日ごとの勝率と試合数", empty: "日ごとの記録はまだありません。",
      legend: [[DAY_MA + "日平均", "background:#B99A68;border-radius:50%"], ["その日の勝率", "background:#E8E5DF;border-radius:50%;opacity:.7"], ["試合数", "background:#3A4048"]].concat(MY.all.games ? [["あなた", "background:" + MY_COLOR]] : []),
      note: SCH_NOTE + DAY_THIN + "試合未満の日は点を薄くしています。" };
  }
  function statsBox(c) {
    var ST = (window.VEIL_STATS || {})[c.id];
    if (!ST || !ST.all.games) return '<p class="muted" style="font-size:14px">まだ記録した試合に登場していません。</p>';
    var months = Object.keys(ST.month).sort(), md = function (m) { return Number(m.slice(5, 7)) + "月"; };
    var MY = myHeroRec(c.id), mine = MY.all.games > 0;
    var myNote = dbOn() && !AUTH.user ? '<p class="me-note">ログインすると、あなたの成績もこのグラフに重ねて表示できます。<button class="chip" type="button" data-action="login" style="min-height:30px">Discordでログイン</button></p>'
      : !MY.setup ? '<p class="me-note">あなたの成績も重ねて表示できます。<a href="#me">マイページ</a>の「記録」タブで試合ごとに自分のヒーローを選ぶか、「英雄」タブで「いつものレーン」を選んでください。</p>'
      : !mine ? '<p class="me-note">あなたが ' + esc(c.name) + ' を使った記録はまだありません。<a href="#me">マイページで設定を見る</a></p>'
      : '<p class="me-note"><i class="me-key" style="background:' + MY_COLOR + '"></i>あなた: ' + MY.all.games + "試合 " + MY.all.wins + "勝 · 勝率 " + pct(MY.all.wins / MY.all.games * 100) + " — 全体 " + pct(ST.all.wins / ST.all.games * 100) + (MY.all.games >= ME_MIN ? "より " + mePt(MY.all.wins / MY.all.games * 100 - ST.all.wins / ST.all.games * 100) : '<span class="tag dim me-thin">データ不足</span>') + "</p>";
    var laneRows = D.roles.map(function (r) { var x = ST.lane[r.id]; return x ? "<tr><td>" + r.label + '</td><td class="num">' + x.games + '</td><td class="num">' + pct(x.wins / x.games * 100) + "</td><td>" + (c.sheetLanes && c.sheetLanes[r.id] ? c.sheetLanes[r.id] : "—") + "</td></tr>" : ""; }).join("");
    var rankRows = Object.keys(ST.rank).map(function (k) { var x = ST.rank[k]; return "<tr><td>" + esc(k) + '</td><td class="num">' + x.games + '</td><td class="num">' + pct(x.wins / x.games * 100) + "</td></tr>"; }).join("");
    return '<p class="sample-note"><span class="badge">VEIL集計</span>記録した ' + (window.VEIL_MATCH_INFO || {}).count + " 試合のうち、" + c.games + " 試合分の数字です。</p>" +
      '<h3 class="subh" style="margin:0">月ごとの勝率</h3>' + myNote + schartBox("hero-month", function () { return heroMonthSpec(c, ST, MY); }) +
      (dbOn() ? '<h3 class="subh">日ごとの勝率</h3>' + schartBox("hero-day", function () { return heroDaySpec(c, myHeroRec(c.id)); }) : "") +
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
      '<div id="gt-item-' + id + '" class="gt-box" style="display:flex;flex-direction:column;gap:48px">' + (it.stats.length ? '<div class="block"><h2>STATS <small>上がる能力</small></h2><ul class="istats big">' + it.stats.map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ul></div>" : "") +
      '<div class="block"><h2>EFFECT <small>効果</small></h2>' + (it.passive ? '<p class="prose">' + esc(it.passive) + "</p>" : '<p class="muted">能力値が上がるだけで、特別な効果はありません。</p>') + (it.cut ? '<p class="muted" style="font-size:12px">ゲーム画面で説明が途中までしか表示されていなかったため、続きは準備中です。</p>' : "") +
      '<div class="gt-foot">' + gtNote(it) + gtBtn("item", id) + "</div></div></div>" +
      '<div class="block"><h2>USED BY <small>この装備を使うキャラ</small></h2>' + (users.length ? '<div class="side-list">' + users.map(function (u) {
        return '<a href="#champion-' + u.c.id + '">' + portrait(u.c, true) + '<span class="serif" style="font-size:20px;flex:1">' + esc(u.c.name) + "</span></a>"; }).join("") + "</div>" : '<div class="slot"><span class="muted">ヒーローごとのビルドが入ると、ここにこの装備を使うヒーローが並びます。</span></div>') + "</div>" + gearSource() + "</div>" +
      '<aside class="daside"><div class="block"><h2 style="font-size:26px">SIMILAR <small>' + (it.price != null ? "近い価格の" : "同じ種類の") + esc(CAT[c0]) + '装備</small></h2><div class="side-list">' + same.map(function (k) { return '<a href="#item-' + k + '">' + itemIcon(k, 44) + '<span class="mincho" style="font-size:16px;flex:1">' + esc(G.items[k].name) + '</span><span class="mono muted num" style="font-size:11px">' + (G.items[k].price != null ? G.items[k].price.toLocaleString() : "") + "</span></a>"; }).join("") + "</div></div></aside></div></section>";
  }
  function talentCard(t) {
    return '<article class="tcard" id="tal-' + t.id + '">' + gicon("icons/t-" + t.id + ".webp", 56) + '<div class="gt-box" id="gt-talent-' + t.id + '" style="display:flex;flex-direction:column;gap:6px;min-width:0"><h3 class="mincho">' + esc(t.name) + "</h3>" + (t.sub ? '<span class="gold" style="font-size:13px">' + esc(t.sub) + "</span>" : "") +
      '<p style="font-size:14px;line-height:1.8">' + esc(t.desc) + "</p>" + (t.extra ? '<p class="muted" style="font-size:12px;line-height:1.7">' + esc(t.extra) + (t.cut ? "…" : "") + "</p>" : "") + '<div class="gt-foot">' + gtNote(t) + gtBtn("talent", t.id) + "</div></div></article>";
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
        return '<article class="tcard" id="spell-' + s.id + '">' + gicon("icons/s-" + s.id + ".webp", 64) + '<div class="gt-box" id="gt-spell-' + s.id + '" style="display:flex;flex-direction:column;gap:6px;min-width:0"><div style="display:flex;align-items:baseline;gap:12px;flex-wrap:wrap"><h3 class="mincho">' + esc(s.name) + '</h3><span class="mono gold" style="font-size:11px">CD ' + s.cd + '秒</span></div><span class="tag dim" style="align-self:flex-start">' + esc(s.tag) + "</span>" +
          '<p style="font-size:14px;line-height:1.8">' + esc(s.desc) + (s.cut ? "…" : "") + '</p><div class="gt-foot">' + gtNote(s) + gtBtn("spell", s.id) + "</div></div></article>"; }).join("") + "</div>" + gearSource() + "</div></section>";
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
    return '<div><span class="mono muted" style="font-size:10px">TIER</span>' + tierCell(c, r) + "</div>" +
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
      "<div>" + secHead("01", "PATCH", "パッチノート") + '<div id="pt-box">' + patchListBox() + "</div></div>" +
      "<div>" + secHead("02", "TIER LIST", "ロール別Tier List") + '<div id="tl-box">' + tierListBox() + "</div></div>" +
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
    var RLx = window.VEIL_RECENT_LANES || { lanes: {}, n: 0 }, cnt = RLx.lanes || {};
    RL_LANES = {};
    Object.keys(cnt).forEach(function (id) {
      var c = cnt[id], tot = 0, max = 0;
      Object.keys(c).forEach(function (L) { tot += c[L]; if (c[L] > max) max = c[L]; });
      RL_LANES[id] = LANE_ORDER.filter(function (L) { return c[L] && (c[L] === max || (c[L] >= RL_MIN_GAMES && c[L] / tot >= RL_MIN_SHARE)); });
    });
    RL_LANES._n = RLx.n || 0;
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

  /* ---------------- MY PAGE ---------------- */
  /* The sheet's matches are the user's own games: "ally" is always the user's team.
     The sheet does not say which ally was the user, so "my heroes" come from the lane the user picks as their usual lane (kept in this browser). */
  var ME_LANE_KEY = "veil-my-lane", ME_MIN = 3, ME_TREND_SKIP = 10;
  function meLane() { var v = S.meLane; try { v = localStorage.getItem(ME_LANE_KEY) || v; } catch (e) {} return v && LANE_ORDER.indexOf(v) >= 0 ? v : "NONE"; }
  var ME_PICK_KEY = "veil-my-picks", ME_PJ = { Solo: "ソロ", Duo: "デュオ", Trio: "トリオ", "5-stack": "5人" };
  /* picks: { matchIndex: lane } — which ally the user was, per match. Sample: kept in this browser until login exists. */
  /* the matches My Page counts: from the DB when it is connected (your own approved matches), otherwise the sheet.
     Each match carries a key k: the sheet row index, or "d<id>" for a DB match. */
  function meList() {
    if (dbOn()) return S.myMatches || [];
    return (window.VEIL_MATCHES || []).map(function (m, i) { m.k = i; return m; });
  }
  function mePickOf(m) { if (dbOn()) return m.me && m.ally[m.me] ? m.me : null; var p = mePicks()[m.k]; return p && m.ally[p] ? p : null; }
  function mePicks() { if (!S.mePicks) { try { S.mePicks = JSON.parse(localStorage.getItem(ME_PICK_KEY) || "{}") || {}; } catch (e) { S.mePicks = {}; } } return S.mePicks; }
  function meSavePicks(o) { S.mePicks = o; try { localStorage.setItem(ME_PICK_KEY, JSON.stringify(o)); } catch (e) {} }
  function mePickCount() { return meList().filter(mePickOf).length; }
  function meMyLane(m) { var p = mePickOf(m); if (p) return { lane: p, src: "pick" }; var l = meLane(); return l !== "NONE" && m.ally[l] ? { lane: l, src: "lane" } : null; }
  function meSetUp() { return mePickCount() > 0 || meLane() !== "NONE"; }
  function meSetLane(v) { S.meLane = v; try { if (v === "NONE") localStorage.removeItem(ME_LANE_KEY); else localStorage.setItem(ME_LANE_KEY, v); } catch (e) {} }
  function meRec(list) { var w = list.filter(function (m) { return m.win; }).length; return { games: list.length, wins: w, wr: list.length ? w / list.length * 100 : null }; }
  function mePt(d) { return d == null ? "—" : '<span class="me-diff ' + (d >= 0 ? "up" : "down") + '">' + (d >= 0 ? "+" : "−") + Math.abs(d).toFixed(1) + "pt</span>"; }
  function meBar(wr) { return '<span class="me-bar" aria-hidden="true"><i style="width:' + Math.round(wr || 0) + "%;background:" + (wr >= 50 ? "var(--gold)" : "var(--steel)") + '"></i><b></b></span>'; }
  function meDur(sec) { return sec == null ? "—" : Math.floor(sec / 60) + ":" + ("0" + Math.round(sec % 60)).slice(-2); }
  function meThin(n) { return n < ME_MIN ? ' <span class="tag dim me-thin">データ不足</span>' : ""; }
  function meHero(c) { return '<a href="#champion-' + c.id + '" class="me-hero">' + portrait(c, true) + '<span style="display:flex;flex-direction:column;min-width:0"><span class="mincho" style="font-size:15px">' + esc(c.name) + '</span><span class="mono muted" style="font-size:10px">' + esc(c.en) + "</span></span></a>"; }
  function meTile(label, big, sub) { return '<div class="me-tile"><span class="mono gold" style="font-size:10px">' + label + '</span><span class="serif num me-big">' + big + '</span><span class="muted" style="font-size:12px">' + (sub || "") + "</span></div>"; }
  function meStreaks(M) {
    var best = { w: 0, l: 0 }, run = 0, last = null;
    M.forEach(function (m) { if (m.win === last) run++; else { run = 1; last = m.win; } if (m.win) best.w = Math.max(best.w, run); else best.l = Math.max(best.l, run); });
    return { cur: run, curWin: last, bestW: best.w, bestL: best.l };
  }
  /* TREND on MY PAGE: your win rate by month, and day by day through one season (running total from its first game) */
  function meTrend(M) {
    if (!M.length) return "";
    var byMo = {}, seas = {};
    M.forEach(function (m) {
      var k = m.date.slice(0, 7); (byMo[k] = byMo[k] || { k: k, g: 0, w: 0 }).g++; if (m.win) byMo[k].w++;
      var s = m.season || "—"; (seas[s] = seas[s] || []).push(m);
    });
    var mks = Object.keys(byMo).sort(), now = jstToday();
    var sl = Object.keys(seas).sort(function (a, b) { return seas[a][0].date < seas[b][0].date ? -1 : seas[a][0].date > seas[b][0].date ? 1 : 0; });
    function monthSpec() {
      return { unit: "month", start: mks[0], end: mks[mks.length - 1] > now.slice(0, 7) ? mks[mks.length - 1] : now.slice(0, 7), rows: mks.map(function (k) { return byMo[k]; }),
        line: "point", span: [4, 8], label: "あなたの月ごとの勝率",
        legend: [["月の勝率", "background:#B99A68;border-radius:50%"], ["試合数", "background:#3A4048"]],
        note: "数字は「勝率(試合数)」。5試合未満の月は薄くしています。記録のない月は細い点線でつないでいます。" + SCH_NOTE_M };
    }
    function seasonSpec() {
      var cur = sl.indexOf(S.meSeason) >= 0 ? S.meSeason : sl[sl.length - 1], list = seas[cur], byD = {};
      list.forEach(function (m) { (byD[m.date] = byD[m.date] || { k: m.date, g: 0, w: 0 }).g++; if (m.win) byD[m.date].w++; });
      var dks = Object.keys(byD).sort(), last = dks[dks.length - 1], latest = cur === sl[sl.length - 1];
      return { unit: "day", start: dks[0], end: latest && now > last ? now : last, rows: dks.map(function (k) { return byD[k]; }),
        line: "cum", lineName: "シーズン累計", zooms: [["1M", "1か月", 30], ["ALL", "シーズン全体", 0]], defZoom: "ALL", label: (cur === "—" ? "シーズン未設定" : cur) + " の日ごとの勝率",
        pick: sl.length > 1 || sl[0] !== "—" ? '<div class="fgroup" role="group" aria-label="シーズンを選ぶ">' + sl.map(function (s) { return '<button type="button" class="chip" data-action="mseason" data-s="' + esc(s) + '" aria-pressed="' + (s === cur) + '">' + (s === "—" ? "シーズン未設定" : esc(s)) + "</button>"; }).join("") + "</div>" : "",
        legend: [["シーズン累計の勝率", "background:#B99A68;border-radius:50%"], ["その日の勝率", "background:#E8E5DF;border-radius:50%;opacity:.7"], ["試合数", "background:#3A4048"]],
        note: "金の線は、そのシーズンの最初の試合からの累計勝率です。" + SCH_NOTE };
    }
    return '<h3 class="subh" style="margin:0 0 12px">月ごとの勝率</h3>' + schartBox("me-month", monthSpec) +
      '<h3 class="subh" style="margin:28px 0 12px">シーズンごとの推移(日ごと)</h3>' + schartBox("me-season", seasonSpec);
  }
  function meTable(head, rows) { return '<div class="table-box"><table class="data me-table"><thead><tr>' + head.map(function (h) { return "<th>" + h + "</th>"; }).join("") + "</tr></thead><tbody>" + rows.join("") + "</tbody></table></div>"; }
  function meGroupRows(groups, all) {
    return groups.filter(function (g) { return g.r.games; }).map(function (g) {
      return "<tr><td>" + g.label + meThin(g.r.games) + '</td><td class="num">' + g.r.games + '</td><td class="num">' + g.r.wins + "-" + (g.r.games - g.r.wins) + '</td><td><span class="me-wr"><span class="num">' + pct(g.r.wr) + "</span>" + meBar(g.r.wr) + '</span></td><td class="num">' + (g.r.games < ME_MIN ? '<span class="muted">—</span>' : mePt(g.r.wr - all.wr)) + "</td></tr>";
    });
  }
  function meHeroes() {
    var lane = meLane(), M = meList(), all = meRec(M), picked = mePickCount();
    var pick = '<div class="fgroup" role="group" aria-label="いつものレーン"><span class="mono gold" style="font-size:10px">いつものレーン</span>' + chips("me-lane", [["NONE", "使わない"]].concat(LANE_ORDER.map(function (L) { return [L, L]; })), lane) + "</div>" +
      '<p class="muted" style="font-size:12px;margin-top:-8px">「記録」タブで自分のヒーローを選んでいない試合だけ、いつものレーンの味方を自分として数えます。</p>';
    if (!meSetUp()) return pick + '<div class="empty" style="padding:44px 24px"><span class="tag dim">まだ数えられません</span><h3>自分が使ったヒーローを教えてください</h3><p class="muted" style="font-size:14px;max-width:580px">シートには自分がどのヒーローを使ったかの列がありません。「記録」タブで試合ごとに自分のヒーローを選ぶか、上でいつものレーンを選んでください。</p><button class="btn ghost" type="button" data-action="tab" data-target="me-log">記録タブを開く' + IC.arrow + "</button></div>";
    var by = {}, lanesOf = {}, counted = 0;
    M.forEach(function (m) { var ml = meMyLane(m); if (!ml) return; var id = m.ally[ml.lane]; if (!id || !CH[id]) return; counted++; (by[id] = by[id] || []).push(m); lanesOf[id] = lanesOf[id] || {}; lanesOf[id][ml.lane] = (lanesOf[id][ml.lane] || 0) + 1; });
    var topLane = function (id) { var o = lanesOf[id]; return Object.keys(o).sort(function (a, b) { return o[b] - o[a]; })[0]; };
    var list = Object.keys(by).map(function (id) { return { c: CH[id], r: meRec(by[id]), lane: topLane(id) }; }).sort(function (a, b) { return b.r.games - a.r.games || b.r.wr - a.r.wr; });
    var best = list.filter(function (x) { return x.r.games >= ME_MIN; }).sort(function (a, b) { return b.r.wr - a.r.wr || b.r.games - a.r.games; }).slice(0, 3);
    var cards = best.length ? '<div class="me-best">' + best.map(function (x, i) {
      return '<a class="card me-bcard" href="#champion-' + x.c.id + '"><span class="mono gold" style="font-size:10px">0' + (i + 1) + " · 得意ヒーロー</span>" + '<div style="display:flex;align-items:center;gap:14px">' + portrait(x.c) + '<span style="display:flex;flex-direction:column"><span class="mincho" style="font-size:19px">' + esc(x.c.name) + '</span><span class="mono muted" style="font-size:10px">' + esc(x.c.en) + " · " + x.lane + "</span></span></div>" +
        '<div class="me-bnums"><span><span class="serif num" style="font-size:30px">' + pct(x.r.wr) + '</span><span class="muted" style="font-size:12px">' + x.r.games + "試合 " + x.r.wins + "勝</span></span><span class=\"muted\" style=\"font-size:12px;text-align:right\">いつもより<br>" + mePt(x.r.wr - all.wr) + "</span></div></a>";
    }).join("") + "</div>" : '<p class="muted" style="font-size:13px">' + ME_MIN + "試合以上使ったヒーローがまだいないので、得意ヒーローは出せません。</p>";
    var rows = list.map(function (x) {
      return "<tr><td>" + meHero(x.c) + '</td><td class="mono muted" style="font-size:11px">' + x.lane + '</td><td class="num">' + x.r.games + meThin(x.r.games) + '</td><td><span class="me-wr"><span class="num">' + pct(x.r.wr) + "</span>" + meBar(x.r.wr) + '</span></td><td class="num">' + (x.r.games < ME_MIN ? '<span class="muted">—</span>' : mePt(x.r.wr - all.wr)) + "</td></tr>";
    });
    var src = picked ? "「記録」タブで自分を選んだ " + picked + " 試合" + (lane !== "NONE" ? "と、残りの試合のうち " + lane + " の味方" : "") : lane + " の味方ヒーロー";
    return pick + '<p class="muted" style="font-size:13px">' + src + "を、あなたが使ったヒーローとして数えています(" + counted + "試合 · " + list.length + "体)。「いつもとの差」は、あなたの全体の勝率(" + pct(all.wr) + ")との差です。</p>" +
      cards + '<h3 class="subh">使ったヒーロー</h3>' + meTable(["ヒーロー", "レーン", "試合数", "あなたの勝率", "いつもとの差"], rows);
  }
  function meLogRow(m) {
    var p = mePickOf(m), i = m.k, no = dbOn() ? m.id : m.k + 1;
    var team = function (side) {
      var own = side === "ally";
      return '<div class="mlog-team ' + side + '"' + (own ? ' role="group" aria-label="味方 · 自分のヒーローを選ぶ"' : ' aria-label="敵"') + ">" + LANE_ORDER.map(function (L) {
        var c = CH[m[side][L]]; if (!c) return '<span class="mlog-h none"><span class="portrait sm"></span><span class="mono">' + L + "</span></span>";
        var its = m.items && m.items[side + ":" + L], on = own && p === L, inner = portrait(c, true) + '<span class="mono">' + L + "</span>" + (its && its.length ? '<span class="rv-items">' + its.map(tinyItem).join("") + "</span>" : "");
        return own ? '<button type="button" class="mlog-h' + (on ? " on" : "") + '" data-action="me-pick" data-k="' + i + '" data-lane="' + L + '" aria-pressed="' + on + '" title="' + esc(c.name) + " (" + L + ")" + (on ? " · 選択を外す" : " · 自分にする") + '">' + inner + (on ? "<b>YOU</b>" : "") + "</button>"
          : '<span class="mlog-h" title="' + esc(c.name) + " (" + L + ')">' + inner + "</span>";
      }).join("") + "</div>";
    };
    return '<li class="mlog-row' + (p ? " picked" : "") + '" id="mlog-' + i + '"><div class="mlog-info"><span class="mono muted" style="font-size:10px">No.' + no + '</span><span class="num">' + m.date.replace(/-/g, ".") + '</span><span><span class="mlog-res ' + (m.win ? "w" : "l") + '">' + (m.win ? "WIN" : "LOSE") + '</span> <span class="muted" style="font-size:12px">' + (ME_PJ[m.party] || esc(m.party)) + " · " + meDur(m.dur) + "</span></span></div>" +
      team("ally") + '<span class="mono muted mlog-vs">VS</span>' + team("enemy") + "</li>";
  }
  function meLogList() {
    var only = S.meLogOnly === "todo", list = meList().slice().reverse().filter(function (m) { return !only || !mePickOf(m); });
    if (!list.length) return '<div class="empty" style="padding:44px 24px"><span class="tag">COMPLETE</span><h3>すべての試合で自分を選びました</h3></div>';
    return '<ol class="mlog">' + list.map(meLogRow).join("") + "</ol>";
  }
  function meLogHead() {
    var n = meList().length, k = mePickCount(), mv = meMovable();
    return '<div class="mlog-head"><div style="display:flex;flex-direction:column;gap:8px"><span class="mono gold" style="font-size:10px">自分を選んだ試合</span><span><span class="serif num" style="font-size:34px">' + k + '</span><span class="muted"> / ' + n + ' 試合</span></span><span class="mlog-prog"><i style="width:' + (n ? k / n * 100 : 0).toFixed(1) + '%"></i></span></div>' +
      '<div class="fgroup" role="group" aria-label="表示する試合">' + chips("me-log", [["all", "すべて"], ["todo", "未選択だけ"]], S.meLogOnly || "all") + (k && !dbOn() ? '<button class="chip" type="button" data-action="me-unpick-all">選択をすべて外す</button>' : "") + "</div></div>" +
      (mv.length ? '<div class="sample-note" style="margin-top:16px"><span class="badge">移行</span><span>このブラウザで前に選んだ ' + mv.length + ' 試合ぶんの「自分」を、アカウントに移せます。</span> <button class="chip on-gold" type="button" data-action="me-move-picks">アカウントに移す</button></div>' : "");
  }
  function meSig(m) { return m.date + ":" + LANE_ORDER.map(function (L) { return m.ally[L]; }).concat(LANE_ORDER.map(function (L) { return m.enemy[L]; })).sort().join(","); }
  function meMovable() {
    if (!dbOn() || !S.myMatches) return [];
    var P = mePicks(), SM = window.VEIL_MATCHES || [], bySig = {};
    S.myMatches.forEach(function (m) { bySig[meSig(m)] = m; });
    return Object.keys(P).map(function (i) { var sm = SM[i], lane = P[i]; if (!sm || !sm.ally[lane]) return null; var dm = bySig[meSig(sm)];
      return dm && !dm.me && dm.ally[lane] === sm.ally[lane] ? { m: dm, lane: lane } : null; }).filter(Boolean);
  }
  function meLog() {
    return '<p class="sample-note"><span class="badge">' + (dbOn() ? "記録" : "見本") + '</span>味方5体のうち、自分が使ったヒーローをクリックしてください。もう一度押すと外れます。' + (dbOn() ? "選んだ内容はアカウントに保存されます。" : "選んだ内容はこのブラウザだけに保存されます。") + "</p>" +
      '<div id="mlog-head">' + meLogHead() + '</div><div id="mlog-list">' + meLogList() + "</div>";
  }
  function meSides(M, all) {
    var ally = {}, enemy = {};
    M.forEach(function (m) {
      Object.keys(m.ally).forEach(function (L) { var id = m.ally[L]; if (id && CH[id]) (ally[id] = ally[id] || []).push(m); });
      Object.keys(m.enemy).forEach(function (L) { var id = m.enemy[L]; if (id && CH[id]) (enemy[id] = enemy[id] || []).push(m); });
    });
    function top(map, dir) {
      return Object.keys(map).map(function (id) { return { c: CH[id], r: meRec(map[id]) }; }).filter(function (x) { return x.r.games >= ME_MIN; })
        .sort(function (a, b) { return dir * (b.r.wr - a.r.wr) || b.r.games - a.r.games; }).slice(0, 5)
        .map(function (x) { return "<tr><td>" + meHero(x.c) + '</td><td class="num">' + x.r.games + '</td><td><span class="me-wr"><span class="num">' + pct(x.r.wr) + "</span>" + meBar(x.r.wr) + '</span></td><td class="num">' + mePt(x.r.wr - all.wr) + "</td></tr>"; });
    }
    var head = ["ヒーロー", "試合数", "あなたの勝率", "いつもとの差"];
    return '<p class="muted" style="font-size:13px">' + ME_MIN + "試合以上いっしょになったヒーローだけを出しています。「いつもとの差」は、あなたの全体の勝率(" + pct(all.wr) + ")との差です。</p>" +
      '<div class="me-two"><div><h3 class="subh" style="margin:0 0 12px">味方にいると勝ちやすい</h3>' + meTable(head, top(ally, 1)) + "</div>" +
      '<div><h3 class="subh" style="margin:0 0 12px">敵にいると負けやすい</h3>' + meTable(head, top(enemy, -1)) + "</div></div>";
  }
  var ME_TABS = [["me-overview", "戦績", "RECORD"], ["me-heroes-tab", "英雄", "HEROES"], ["me-cond", "戦況", "FIELD"], ["me-sides", "盟友と宿敵", "BONDS"], ["me-log", "記録", "LOG"]];
  function viewMe() {
    if (dbOn() && (!AUTH.ready || !AUTH.user || !S.myMatches)) {
      if (AUTH.user && !S.myMatches) loadMyMatches();
      var gate = acctGate() || '<div class="empty"><span class="tag dim">LOADING</span><h3>あなたの試合を読み込んでいます…</h3></div>';
      return acctHead("MY RECORD", "あなたの戦いの記録。", "MY PAGE") + '<section class="section tight"><div class="wrap">' + gate + "</div></section>";
    }
    var M = meList();
    if (!M.length) return acctHead("MY RECORD", "あなたの戦いの記録。", "MY PAGE") + '<section class="section tight"><div class="wrap"><div class="empty"><span class="tag dim">NO DATA</span><h3>まだ承認された試合がありません</h3>' + (dbOn() ? '<p class="muted" style="font-size:14px">試合を登録して承認されると、ここに勝率や得意ヒーローが出ます。</p><a class="btn primary" href="#submit">試合を登録する' + IC.arrow + "</a>" : "") + "</div></div></section>";
    var all = meRec(M), st = meStreaks(M), last10 = meRec(M.slice(-10));
    var durW = M.filter(function (m) { return m.win && m.dur; }), durL = M.filter(function (m) { return !m.win && m.dur; });
    var avgD = function (l) { return l.length ? l.reduce(function (a, m) { return a + m.dur; }, 0) / l.length : null; };
    var parties = ["Solo", "Duo", "Trio", "5-stack"], PJ = { Solo: "ソロ", Duo: "デュオ(2人)", Trio: "トリオ(3人)", "5-stack": "5人パーティ" };
    var partyRows = meGroupRows(parties.map(function (p) { return { label: PJ[p], r: meRec(M.filter(function (m) { return m.party === p; })) }; }), all);
    var buckets = [["12分未満", 0, 720], ["12〜15分", 720, 900], ["15〜18分", 900, 1080], ["18分以上", 1080, 1e9]];
    var durRows = meGroupRows(buckets.map(function (b) { return { label: b[0], r: meRec(M.filter(function (m) { return m.dur != null && m.dur >= b[1] && m.dur < b[2]; })) }; }), all);
    var MI = { from: M[0].date, to: M[M.length - 1].date };
    var cur = ME_TABS.some(function (t) { return t[0] === S.metab; }) ? S.metab : ME_TABS[0][0];
    var MP = function (id) { return 'role="tabpanel" id="' + id + '" aria-labelledby="tab-' + id + '"' + (id === cur ? "" : " hidden"); };
    return '<section class="phead">' + atmo({ h: 260, seed: 53 }) + '<div class="wrap">' + crumbs([["HOME", "#home"], ["MY PAGE"]]) +
      '<div class="phead-row"><div style="display:flex;flex-direction:column;gap:14px"><h1 class="rise">MY RECORD</h1><p class="jp rise d1">あなたの戦いの記録。</p></div>' +
      '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px"><span class="serif gold num" style="font-size:64px;line-height:1">' + all.wr.toFixed(1) + '<span style="font-size:26px">%</span></span><span class="mono muted">勝率 · ' + all.games + "試合 · 平均より " + mePt(all.wr - 50) + "</span></div></div></div></section>" +
      '<section class="section tight" style="padding-top:0"><nav class="dtabs" aria-label="マイページの項目"><div class="wrap" role="tablist" aria-label="マイページ">' +
      ME_TABS.map(function (t) { var on = cur === t[0]; return '<button type="button" class="dtab dtab2" role="tab" id="tab-' + t[0] + '" aria-controls="' + t[0] + '" aria-selected="' + on + '" tabindex="' + (on ? 0 : -1) + '" data-action="tab" data-target="' + t[0] + '"><span class="mono">' + t[2] + "</span>" + t[1] + "</button>"; }).join("") + "</div></nav>" +
      '<div class="wrap" style="display:flex;flex-direction:column;gap:40px;padding-top:36px">' +
      '<p class="sample-note"><span class="badge">VEIL集計</span>' + (dbOn() ? "あなたが登録して承認された " + all.games + " 試合" : "シートに記録した " + all.games + " 試合") + "(" + (MI.from || "").replace(/-/g, ".") + " 〜 " + (MI.to || "").replace(/-/g, ".") + ")を集計しています。" + (dbOn() ? "承認待ちの試合は入っていません。" : "ログインと試合登録ができたら、登録した試合もここに加わります。") + "</p>" +
      '<div ' + MP("me-overview") + ' style="display:flex;flex-direction:column;gap:72px"><div>' + secHead("01", "OVERVIEW", "全体の成績") + '<div class="me-tiles">' +
        meTile("WIN RATE · 勝率", pct(all.wr), all.wins + "勝 " + (all.games - all.wins) + "敗") +
        meTile("VS AVERAGE · 平均との差", mePt(all.wr - 50), "平均は50%(全員の勝ちと負けは同じ数)") +
        meTile("LAST 10 · 直近10試合", pct(last10.wr), last10.wins + "勝 " + (last10.games - last10.wins) + "敗") +
        meTile("STREAK · 今の流れ", st.cur + (st.curWin ? "連勝" : "連敗"), "最長 " + st.bestW + "連勝 / " + st.bestL + "連敗") +
        meTile("TIME · 平均試合時間", meDur(avgD(M.filter(function (m) { return m.dur; }))), "勝ち " + meDur(avgD(durW)) + " / 負け " + meDur(avgD(durL))) +
      "</div></div>" +
      "<div>" + secHead("02", "TREND", "勝率の推移") + meTrend(M) + "</div></div>" +
      "<div " + MP("me-heroes-tab") + ">" + secHead("03", "MY HEROES", "あなたのヒーロー") + '<div id="me-heroes" style="display:flex;flex-direction:column;gap:20px">' + meHeroes() + "</div></div>" +
      "<div " + MP("me-cond") + ">" + secHead("04", "CONDITIONS", "条件ごとの成績") + '<p class="muted" style="font-size:13px;margin-bottom:16px">「全体との差」は、あなたの全体の勝率(' + pct(all.wr) + ")との差です。" + ME_MIN + "試合未満の行は「データ不足」として差を出していません。</p>" +
        '<div class="me-two"><div><h3 class="subh" style="margin:0 0 12px">パーティ人数</h3>' + meTable(["人数", "試合数", "勝-敗", "勝率", "全体との差"], partyRows) + "</div>" +
        '<div><h3 class="subh" style="margin:0 0 12px">試合時間</h3>' + meTable(["試合時間", "試合数", "勝-敗", "勝率", "全体との差"], durRows) + "</div></div></div>" +
      "<div " + MP("me-sides") + ">" + secHead("05", "ALLIES &amp; ENEMIES", "味方と敵のヒーロー") + meSides(M, all) + "</div>" +
      "<div " + MP("me-log") + ">" + secHead("06", "MATCH LOG", "試合ごとの記録") + '<div style="display:flex;flex-direction:column;gap:24px">' + meLog() + "</div></div>" +
      "</div></section>";
  }

  /* ---------------- written content: ヒーロー解説 · TIER · パッチ (read by everyone, written by 運営 / 管理者) ---------------- */
  var CT = { notes: {}, tiers: {}, patches: [], ready: false, missing: false };
  function loadContent() {
    if (!SB) return;
    Promise.all([
      SB.from("hero_notes").select("hero,strengths,weaknesses,playbook,editor_name,updated_at"),
      SB.from("hero_tiers").select("hero,lane,tier,editor_name,updated_at"),
      SB.from("patch_notes").select("id,version,released_on,title,body,changes,editor_name,updated_at").order("released_on", { ascending: false }).order("id", { ascending: false }),
      SB.from("gear_texts").select("kind,id,field,body,editor_name,updated_at")
    ]).then(function (x) {
      CT.gearMissing = !!x[3].error; if (!x[3].error) applyGearTexts(x[3].data || []);
      if (x[0].error || x[1].error || x[2].error) { CT.missing = true; CT.ready = true; return; }
      CT.notes = {}; (x[0].data || []).forEach(function (n) { CT.notes[n.hero] = n; });
      CT.tiers = {}; (x[1].data || []).forEach(function (r) { CT.tiers[r.hero + "|" + r.lane] = r; });
      CT.patches = x[2].data || []; CT.ready = true;
      var h = (location.hash || "").replace(/^#/, "");
      if (/^champion-/.test(h) || h === "patch" || /^item-/.test(h) || h === "equipment" || h === "emblem" || h === "spells") softRender();
    }).catch(function () { CT.missing = true; CT.ready = true; });
  }
  /* plain text → paragraphs; lines starting with ・ or - become a list */
  function fmtText(s) {
    return String(s || "").trim().split(/\n\s*\n/).map(function (blk) {
      var lines = blk.split("\n");
      if (lines.every(function (l) { return /^\s*[-・*]\s?/.test(l); })) return '<ul class="fmt-list">' + lines.map(function (l) { return "<li>" + esc(l.replace(/^\s*[-・*]\s?/, "")) + "</li>"; }).join("") + "</ul>";
      return "<p>" + lines.map(esc).join("<br>") + "</p>";
    }).join("");
  }
  function noteOf(id) { return CT.notes[id] || null; }
  function editBtn(f, id, label) { return canManage() && !CT.missing ? '<button class="chip hn-edit" type="button" data-action="hn-edit" data-f="' + f + '" data-hero="' + id + '">' + (label || "編集") + "</button>" : ""; }
  function heroProsCons(c) {
    var n = noteOf(c.id) || {};
    return '<div class="ov-pc" id="hn-pc">' + editBtn("pc", c.id) + '<div><span class="mono gold" style="font-size:10px">長所</span>' + (n.strengths ? '<div class="fmt" style="font-size:13px">' + fmtText(n.strengths) + "</div>" : '<p class="muted" style="font-size:13px">準備中</p>') + "</div>" +
      '<div><span class="mono" style="font-size:10px;color:var(--redtext)">短所</span>' + (n.weaknesses ? '<div class="fmt" style="font-size:13px">' + fmtText(n.weaknesses) + "</div>" : '<p class="muted" style="font-size:13px">準備中</p>') + "</div></div>";
  }
  function heroPlaybook(c) {
    var n = noteOf(c.id) || {};
    return '<div id="hn-pb">' + (n.playbook ? '<div class="fmt">' + fmtText(n.playbook) + "</div>"
      : '<div class="slot" style="min-height:120px"><span class="mono muted" style="font-size:10px">準備中</span><span class="muted" style="font-size:13px">基本の立ち回り・レーン戦・集団戦・よくあるミスを、ここに書きます。</span></div>') +
      (canManage() && !CT.missing ? '<div style="margin-top:12px">' + editBtn("pb", c.id, n.playbook ? "立ち回りを編集" : "立ち回りを書く") + "</div>" : "") + "</div>";
  }
  function heroByline(c) {
    var n = noteOf(c.id), A = window.VEIL_EXTRA.author;
    var name = n && n.editor_name ? n.editor_name : A.name, sub = n && n.editor_name ? "最終更新 " + String(n.updated_at).slice(0, 10).replace(/-/g, ".") : A.note;
    return '<div class="byline"><span class="portrait sm" style="color:var(--gold)">' + LOGO + '</span><div style="display:flex;flex-direction:column;gap:2px"><span class="mono muted" style="font-size:10px">執筆・監修</span><span class="mincho" style="font-size:16px">' + esc(name) + '</span><span class="muted" style="font-size:12px">' + esc(sub) + "</span></div></div>";
  }
  function heroNoteEditor(f, id) {
    var n = noteOf(id) || {}, ta = function (k, label, rows, max) { return '<label class="sub-field hn-field"><span class="mono">' + label + '</span><textarea data-k="' + k + '" rows="' + rows + '" maxlength="' + max + '">' + esc(n[k] || "") + "</textarea></label>"; };
    return '<div class="hn-editor" data-f="' + f + '" data-hero="' + id + '">' + (f === "pc" ? ta("strengths", "長所", 4, 1500) + ta("weaknesses", "短所", 4, 1500) : ta("playbook", "立ち回り", 12, 8000)) +
      '<p class="muted" style="font-size:12px">空行で段落が分かれます。行の頭に「・」か「-」を付けると箇条書きになります。保存すると全員に公開され、作業の記録に残ります。</p>' +
      '<div class="sub-actions"><button class="chip on-gold" type="button" data-action="hn-save">保存する</button><button class="chip" type="button" data-action="hn-cancel">やめる</button><span class="sub-msg" role="status" aria-live="polite"></span></div></div>';
  }
  function heroNoteSave(btn) {
    var ed = btn.closest(".hn-editor"), id = ed.getAttribute("data-hero"), payload = {}, msg = ed.querySelector(".sub-msg");
    ed.querySelectorAll("textarea").forEach(function (x) { payload[x.getAttribute("data-k")] = x.value.replace(/\s+$/, ""); });
    btn.disabled = true; msg.className = "sub-msg"; msg.textContent = "保存しています…";
    SB.rpc("save_hero_note", { hero: id, payload: payload }).then(function (res) {
      btn.disabled = false;
      if (res.error) { msg.className = "sub-msg bad"; msg.textContent = dbErr(res.error); return; }
      var n = CT.notes[id] = Object.assign(CT.notes[id] || { hero: id, strengths: "", weaknesses: "", playbook: "" }, payload, { editor_name: AUTH.name || (CT.notes[id] || {}).editor_name || "", updated_at: new Date().toISOString() });
      render(true);
    });
  }

  /* TIER: a 運営's setting for the hero in that lane, otherwise worked out from the record:
     heroes with at least TIER_MIN games in the lane, ranked by win rate pulled toward 50% (wins+5)/(games+10):
     top 10% S, next 20% A, next 40% B, next 20% C, the rest D (needs 5 heroes in the lane) */
  var TIER_MIN = 10, TIERS = ["S", "A", "B", "C", "D"];
  function autoTiers(lane) {
    var ST = window.VEIL_STATS || {}, list = [];
    Object.keys(ST).forEach(function (id) { var x = ST[id].lane && ST[id].lane[lane]; if (x && x.games >= TIER_MIN && CH[id]) list.push({ id: id, s: (x.wins + 5) / (x.games + 10) }); });
    if (list.length < 5) return {};
    list.sort(function (a, b) { return b.s - a.s; });
    var out = {}; list.forEach(function (x, i) { var q = i / list.length; out[x.id] = q < .1 ? "S" : q < .3 ? "A" : q < .7 ? "B" : q < .9 ? "C" : "D"; });
    return out;
  }
  function tierOf(id, lane) {
    var m = CT.tiers[id + "|" + lane]; if (m) return { tier: m.tier, src: "manual", by: m.editor_name };
    var a = autoTiers(lane)[id]; return a ? { tier: a, src: "auto" } : null;
  }
  function tierBadge(t, big) { return t ? '<span class="tier-b tier-' + t.tier + (big ? " big" : "") + '" title="' + (t.src === "manual" ? "運営が設定" + (t.by ? "(" + esc(t.by) + ")" : "") : "記録から自動で決めたTIER") + '">' + t.tier + "</span>" : ""; }
  function tierCell(c, lane) {
    var t = tierOf(c.id, lane), man = CT.tiers[c.id + "|" + lane];
    var view = t ? tierBadge(t, true) + '<span class="mono muted" style="font-size:9px">' + (t.src === "manual" ? "運営が設定" : "自動") + "</span>" : '<span class="tag dim">データ待ち</span>';
    if (!canManage() || CT.missing) return view;
    return '<span class="tier-cell">' + view + '<label class="sr" for="hn-tier">' + esc(c.name) + "(" + lane + ")のTIER</label><select id=\"hn-tier\" class=\"hn-tier\" data-hero=\"" + c.id + '" data-lane="' + lane + '"><option value="">自動</option>' + TIERS.map(function (k) { return '<option value="' + k + '"' + (man && man.tier === k ? " selected" : "") + ">" + k + "</option>"; }).join("") + "</select></span>";
  }
  function tierSave(sel) {
    var id = sel.getAttribute("data-hero"), lane = sel.getAttribute("data-lane"), v = sel.value || null; sel.disabled = true;
    SB.rpc("set_hero_tier", { hero: id, lane: lane, tier: v }).then(function (res) {
      sel.disabled = false;
      if (res.error) { var e = document.createElement("span"); e.className = "sub-msg bad"; e.textContent = dbErr(res.error); sel.parentNode.appendChild(e); return; }
      if (v) CT.tiers[id + "|" + lane] = { hero: id, lane: lane, tier: v, editor_name: AUTH.name || "" }; else delete CT.tiers[id + "|" + lane];
      render(true);
    });
  }
  function tierListBox() {
    var lane = S.tierLane || "EXP", groups = {}, any = false;
    TIERS.forEach(function (k) { groups[k] = []; });
    D.champions.forEach(function (c) { var t = tierOf(c.id, lane); if (t) { groups[t.tier].push({ c: c, t: t }); any = true; } });
    return '<div class="fgroup" role="group" aria-label="レーン" style="margin-bottom:18px">' + D.roles.map(function (r) { return '<button type="button" class="chip" data-action="tl-lane" data-l="' + r.id + '" aria-pressed="' + (r.id === lane) + '">' + esc(r.label) + "</button>"; }).join("") + "</div>" +
      (!any ? '<div class="empty" style="padding:48px 28px"><span class="tag dim">データ待ち</span><h3>このレーンはまだTIERを決められません</h3><p class="muted" style="font-size:14px">そのレーンで' + TIER_MIN + "試合以上のヒーローが5体集まると、勝率から自動で出します。" + (canManage() ? "運営はヒーローのページで手動で決めることもできます。" : "") + "</p></div>"
      : '<div class="tierlist">' + TIERS.map(function (k) {
        return '<div class="tl-row"><span class="tier-b tier-' + k + ' big">' + k + '</span><div class="tl-heroes">' + (groups[k].length ? groups[k].map(function (x) { return '<a class="tl-h" href="#champion-' + x.c.id + '" title="' + esc(x.c.name) + (x.t.src === "manual" ? "(運営が設定)" : "") + '">' + portrait(x.c, true) + '<span class="mincho">' + esc(x.c.name) + "</span>" + (x.t.src === "manual" ? '<i class="tl-man" aria-label="運営が設定">運営</i>' : "") + "</a>"; }).join("") : '<span class="muted" style="font-size:12px">—</span>') + "</div></div>";
      }).join("") + "</div>" + '<p class="muted" style="font-size:12px;margin-top:12px">自動のTIERは、そのレーンで' + TIER_MIN + "試合以上のヒーローを、勝率(試合数が少ないほど50%に寄せた値)の順に S 10% / A 20% / B 40% / C 20% / D 10% に分けています。「運営」の印は運営が決めたものです。</p>");
  }

  /* PATCH */
  var PK = { buff: ["強化", "up"], nerf: ["弱体化", "down"], adjust: ["調整", "adj"], "new": ["新ヒーロー", "new"] };
  function patchListBox() {
    var head = canManage() && !CT.missing ? '<div style="margin-bottom:20px"><button class="chip on-gold" type="button" data-action="pt-new">パッチを追加する</button></div><div id="pt-new-box"></div>' : "";
    if (CT.missing || !CT.patches.length) return head + '<div class="empty" style="padding:48px 28px"><span class="tag dim">準備中</span><h3>パッチ情報は準備中です</h3><p class="muted" style="font-size:14px">強化・弱体化の内容を、パッチごとにここへまとめます。</p></div>';
    return head + '<div class="patches">' + CT.patches.map(patchCard).join("") + "</div>";
  }
  function patchCard(p) {
    var groups = {}; (p.changes || []).forEach(function (x) { (groups[x.kind] = groups[x.kind] || []).push(x); });
    return '<article class="patch" id="pt-' + p.id + '"><header class="patch-head"><span class="tag">' + esc(p.version) + '</span><span class="mono muted num">' + esc(String(p.released_on).replace(/-/g, ".")) + "</span>" +
      (canManage() ? '<span class="rv-btns" style="margin-left:auto"><button class="chip" type="button" data-action="pt-edit" data-id="' + p.id + '">編集</button><button class="chip" type="button" data-action="pt-del" data-id="' + p.id + '">削除</button></span>' : "") + (p.title ? '<h3 class="mincho">' + esc(p.title) + "</h3>" : "") + "</header>" +
      (p.body ? '<div class="fmt">' + fmtText(p.body) + "</div>" : "") +
      Object.keys(PK).filter(function (k) { return groups[k]; }).map(function (k) {
        return '<div class="patch-group"><span class="mono pk-' + PK[k][1] + '" style="font-size:10px">' + PK[k][0] + '</span><ul class="patch-ch">' + groups[k].map(function (x) { var c = CH[x.hero]; return "<li>" + (c ? '<a href="#champion-' + c.id + '" class="patch-h">' + portrait(c, true) + '<span class="mincho">' + esc(c.name) + "</span></a>" : esc(x.hero)) + (x.text ? '<span class="patch-t">' + esc(x.text) + "</span>" : "") + "</li>"; }).join("") + "</ul></div>";
      }).join("") + (p.editor_name ? '<p class="mono muted" style="font-size:10px">編集: ' + esc(p.editor_name) + "</p>" : "") + "</article>";
  }
  function patchForm(p) {
    p = p || { version: "", released_on: new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10), title: "", body: "", changes: [] };
    return '<form class="patch-form" data-form="patch" data-id="' + (p.id || "") + '">' + heroDatalist() +
      '<div class="patch-row"><label class="sub-field"><span class="mono">バージョン</span><input name="version" maxlength="20" required placeholder="例: 1.9.42" value="' + esc(p.version) + '"></label>' +
      '<label class="sub-field"><span class="mono">日付</span><input type="date" name="released_on" required value="' + esc(p.released_on) + '"></label>' +
      '<label class="sub-field" style="flex:1 1 260px"><span class="mono">見出し</span><input name="title" maxlength="80" placeholder="例: アーロット強化、新ヒーロー追加" value="' + esc(p.title) + '"></label></div>' +
      '<label class="sub-field"><span class="mono">本文</span><textarea name="body" rows="6" maxlength="8000" placeholder="全体の変更やメタへの影響など">' + esc(p.body) + "</textarea></label>" +
      '<div class="sub-field"><span class="mono">ヒーローごとの変更</span><div class="pt-changes">' + (p.changes || []).map(changeRow).join("") + '</div><button class="chip" type="button" data-action="pt-add-ch" style="align-self:flex-start">変更を1行足す</button></div>' +
      '<div class="sub-actions"><button class="chip on-gold" type="submit">保存する</button><button class="chip" type="button" data-action="pt-cancel">やめる</button><span class="sub-msg" role="status" aria-live="polite"></span></div></form>';
  }
  function changeRow(x) {
    x = x || { hero: "", kind: "buff", text: "" }; var c = CH[x.hero];
    return '<div class="pt-ch"><input class="pt-hero" list="hero-names" data-hero-input aria-label="ヒーロー" placeholder="ヒーロー名" value="' + esc(c ? c.name + " (" + c.en + ")" : "") + '">' +
      '<select class="pt-kind" aria-label="種類">' + Object.keys(PK).map(function (k) { return '<option value="' + k + '"' + (x.kind === k ? " selected" : "") + ">" + PK[k][0] + "</option>"; }).join("") + "</select>" +
      '<input class="pt-text" maxlength="300" aria-label="内容" placeholder="例: 2のダメージ 300→340" value="' + esc(x.text || "") + '"><button class="chip" type="button" data-action="pt-rm-ch" aria-label="この行を消す">×</button></div>';
  }
  function patchSave(form) {
    var id = form.getAttribute("data-id") ? Number(form.getAttribute("data-id")) : null, msg = form.querySelector(".sub-msg"), errs = [];
    var payload = { version: form.version.value.trim(), released_on: form.released_on.value, title: form.title.value.trim(), body: form.body.value.replace(/\s+$/, ""), changes: [] };
    if (!payload.version) errs.push("バージョンを入れてください"); if (!payload.released_on) errs.push("日付を入れてください");
    form.querySelectorAll(".pt-ch").forEach(function (r, i) {
      var hv = r.querySelector(".pt-hero").value, h = heroFromInput(hv), tx = r.querySelector(".pt-text").value.trim();
      if (!hv && !tx) return;
      if (!h) { errs.push((i + 1) + "行目のヒーローが見つかりません"); return; }
      payload.changes.push({ hero: h, kind: r.querySelector(".pt-kind").value, text: tx });
    });
    if (errs.length) { msg.className = "sub-msg bad"; msg.innerHTML = errs.map(esc).join("<br>"); return; }
    var btn = form.querySelector('[type="submit"]'); btn.disabled = true; msg.className = "sub-msg"; msg.textContent = "保存しています…";
    SB.rpc("save_patch", { id: id, payload: payload }).then(function (res) {
      btn.disabled = false;
      if (res.error) { msg.className = "sub-msg bad"; msg.textContent = dbErr(res.error); return; }
      S.ptEditing = null; loadContent();
    });
  }

  /* ---- 装備・天賦・スペルの説明文: 運営 / 管理者 の書き換え (元の文は gear.js、書き換えた分は gear_texts) ---- */
  var GT_FIELDS = { item: [["passive", "EFFECT(効果)", 6], ["stats", "STATS(上がる能力・1行に1つ)", 4]], talent: [["desc", "説明", 3], ["extra", "補足", 3]], spell: [["desc", "説明", 5]] };
  var GT_ORIG = {};
  function gearObj(kind, id) {
    if (kind === "item") return G.items[id] || null;
    if (kind === "spell") return G.spells.filter(function (s) { return s.id === id; })[0] || null;
    var f = null; G.talents.forEach(function (tr) { tr.list.forEach(function (x) { if (x.id === id) f = x; }); }); return f;
  }
  function gtVal(o, field) { return field === "stats" ? (o.stats || []).join("\n") : o[field] || ""; }
  /* put the 運営's texts onto the gear data (the first time, keep the original so it can come back) */
  function applyGearTexts(rows) {
    Object.keys(GT_ORIG).forEach(function (k) { var a = k.split("|"), o = gearObj(a[0], a[1]); if (o) { o[a[2]] = GT_ORIG[k].v; o.cut = GT_ORIG[k].cut; delete o.edited; } });
    (rows || []).forEach(function (r) {
      var o = gearObj(r.kind, r.id); if (!o) return;
      var k = r.kind + "|" + r.id + "|" + r.field;
      if (!(k in GT_ORIG)) GT_ORIG[k] = { v: o[r.field], cut: o.cut };
      o[r.field] = r.field === "stats" ? r.body.split("\n").map(function (s) { return s.trim(); }).filter(Boolean) : r.body;
      if (r.field === "passive" || r.field === "desc" || r.field === "extra") o.cut = false;
      o.edited = { by: r.editor_name, at: r.updated_at };
    });
  }
  function gtOrig(kind, id, field) { var k = kind + "|" + id + "|" + field, o = gearObj(kind, id); return k in GT_ORIG ? (field === "stats" ? (GT_ORIG[k].v || []).join("\n") : GT_ORIG[k].v || "") : o ? gtVal(o, field) : ""; }
  function gtBtn(kind, id) { return canManage() && !CT.gearMissing ? '<button class="chip gt-edit" type="button" data-action="gt-edit" data-kind="' + kind + '" data-id="' + id + '">文を直す</button>' : ""; }
  function gtNote(o) { return o && o.edited ? '<span class="mono muted" style="font-size:10px">運営が修正' + (o.edited.by ? "(" + esc(o.edited.by) + ")" : "") + "</span>" : ""; }
  function gtEditor(kind, id) {
    var o = gearObj(kind, id); if (!o) return "";
    return '<div class="hn-editor gt-editor" data-kind="' + kind + '" data-id="' + id + '">' + GT_FIELDS[kind].map(function (f) {
      var changed = gtOrig(kind, id, f[0]) !== gtVal(o, f[0]);
      return '<label class="sub-field hn-field"><span class="mono">' + f[1] + (changed ? ' <span class="gold">· 修正中</span>' : "") + '</span><textarea data-f="' + f[0] + '" rows="' + f[2] + '" maxlength="3000">' + esc(gtVal(o, f[0])) + "</textarea></label>" +
        (changed ? '<details class="rv-diff"><summary>元の文を見る</summary><p class="muted" style="font-size:12px;white-space:pre-wrap">' + (esc(gtOrig(kind, id, f[0])) || "(なし)") + "</p></details>" : "");
    }).join("") +
      '<p class="muted" style="font-size:12px">元の文はゲーム画面から書き写したものです。直した文は全員に公開され、作業の記録に残ります。空にして保存すると元の文に戻ります。</p>' +
      '<div class="sub-actions"><button class="chip on-gold" type="button" data-action="gt-save">保存する</button><button class="chip" type="button" data-action="gt-reset">元の文に戻す</button><button class="chip" type="button" data-action="gt-cancel">やめる</button><span class="sub-msg" role="status" aria-live="polite"></span></div></div>';
  }
  function gtSave(btn, reset) {
    var ed = btn.closest(".gt-editor"), kind = ed.getAttribute("data-kind"), id = ed.getAttribute("data-id"), msg = ed.querySelector(".sub-msg"), calls = [];
    ed.querySelectorAll("textarea").forEach(function (x) {
      var f = x.getAttribute("data-f"), v = reset ? "" : x.value.replace(/\s+$/, ""), orig = gtOrig(kind, id, f), cur = gtVal(gearObj(kind, id), f);
      if (!reset && v === orig) v = "";                      /* the same as the original: keep no copy */
      if ((v || orig) === cur) return;                        /* nothing changed */
      calls.push(SB.rpc("save_gear_text", { kind: kind, id: id, field: f, body: v || null }));
    });
    if (!calls.length) { render(true); return; }
    btn.disabled = true; msg.className = "sub-msg"; msg.textContent = "保存しています…";
    Promise.all(calls).then(function (rs) {
      var bad = rs.filter(function (r) { return r.error; })[0];
      if (bad) { btn.disabled = false; msg.className = "sub-msg bad"; msg.textContent = dbErr(bad.error); return; }
      loadContent();
    });
  }

  /* ---------------- ACCOUNT · SUBMIT · REVIEW (Supabase) ----------------
     Login is Discord through Supabase Auth: the site never sees or stores a password.
     All writes go through database functions (submit_match, review_match, set_role …) that check the user's role. */
  var CFG = window.VEIL_CONFIG || {}, SB = null;
  var AUTH = { ready: false, user: null, role: null, name: "", avatar: "" };
  var RANKS = ["Warrior", "Elite", "Master", "Grandmaster", "Epic", "Legend", "Mythic", "Mythical Honor", "Mythical Glory", "Mythical Immortal"];
  var PARTIES = [["Solo", "ソロ"], ["Duo", "デュオ(2人)"], ["Trio", "トリオ(3人)"], ["5-stack", "5人パーティ"]];
  var ROLE_JP = { member: "一般", trusted: "信頼ユーザー", manager: "運営", admin: "管理者" };
  var ROLE_LOW = ["member", "trusted"];   /* the roles a manager (運営) may give or take */
  var STATUS_JP = { pending: "承認待ち", approved: "承認済み", rejected: "却下" };
  try {
    if (CFG.supabaseUrl && CFG.supabaseKey && window.supabase && window.supabase.createClient)
      SB = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey, { auth: { flowType: "pkce", detectSessionInUrl: true, persistSession: true, autoRefreshToken: true } });
  } catch (e) { SB = null; }
  function dbOn() { return !!SB; }

  /* ---- statistics from the DB: small pre-counted views, cached in this browser until the DB refreshes them ---- */
  var DB_CACHE_KEY = "veil-db-v1", DBC = { at: null, g: null, h: {}, loading: {} };
  function dbCacheSave() {
    try { localStorage.setItem(DB_CACHE_KEY, JSON.stringify({ at: DBC.at, g: DBC.g, h: DBC.h })); }
    catch (e) { try { localStorage.setItem(DB_CACHE_KEY, JSON.stringify({ at: DBC.at, g: DBC.g, h: {} })); } catch (e2) {} }
  }
  function dbCacheLoad() {
    try {
      var c = JSON.parse(localStorage.getItem(DB_CACHE_KEY) || "null");
      if (!c || !c.g) return false;
      DBC = { at: c.at, g: c.g, h: c.h || {}, loading: {} };
      window.VEIL_APPLY(c.g);
      Object.keys(DBC.h).forEach(function (id) { window.VEIL_APPLY_HERO(id, DBC.h[id].vs, DBC.h[id].mates); });
      RL_LANES = null; return true;
    } catch (e) { return false; }
  }
  /* PostgREST hands out at most 1000 rows per request, so read in pages */
  function fetchAll(table, cols, order, eq) {
    var out = [], size = 1000;
    function page(from) {
      var q = SB.from(table).select(cols); order.forEach(function (c) { q = q.order(c); });
      if (eq) Object.keys(eq).forEach(function (k) { q = q.eq(k, eq[k]); });
      return q.range(from, from + size - 1).then(function (r) {
        if (r.error) throw r.error;
        out = out.concat(r.data || []);
        return (r.data || []).length === size ? page(from + size) : out;
      });
    }
    return page(0);
  }
  var NO_SOFT = { submit: 1, review: 1, account: 1 };
  function softRender() { var h = (location.hash || "").replace(/^#/, "") || "home"; if (!NO_SOFT[h]) render(true); }
  function dbStats() {
    if (!SB) return;
    SB.from("stats_summary").select("matches,first_on,last_on,ranks,recent_n,refreshed_at").limit(1).then(function (r) {
      if (r.error || !r.data || !r.data[0]) return;
      var sm = r.data[0];
      if (DBC.g && DBC.at === sm.refreshed_at) return;          /* nothing new since the cached copy */
      return Promise.all([
        fetchAll("stats_hero", "hero,lane,rank,month,games,wins", ["hero", "lane", "rank", "month"]),
        fetchAll("stats_recent_lanes", "hero,lane,games", ["hero", "lane"]),
        fetchAll("stats_top_pairs", "hero,lane,opp,games,wins", ["games"])
      ]).then(function (x) {
        DBC = { at: sm.refreshed_at, g: { summary: sm, hero: x[0], recent: x[1], pairs: x[2].sort(function (a, b) { return b.games - a.games || b.wins / b.games - a.wins / a.games; }) }, h: {}, loading: {} };
        window.VEIL_APPLY(DBC.g); RL_LANES = null; dbCacheSave(); softRender(); routeHeroes().forEach(ensureHero);
      });
    }).catch(function () {});
  }
  /* matchups and teammates of one hero, loaded when a page needs them */
  function ensureHero(id) {
    if (!SB || !DBC.g || !id || !CH[id] || (DBC.h[id] && DBC.h[id].day) || DBC.loading[id]) return;
    DBC.loading[id] = 1;
    Promise.all([
      fetchAll("stats_vs", "lane,opp,games,wins", ["lane", "opp"], { hero: id }),
      fetchAll("stats_mates", "lane,mate,games,wins", ["lane", "mate"], { hero: id }),
      fetchAll("stats_hero_day", "day,games,wins", ["day"], { hero: id }).catch(function () { return []; })   /* stats_day.sql not run yet */
    ]).then(function (x) {
      DBC.h[id] = { vs: x[0], mates: x[1], day: x[2] }; delete DBC.loading[id];
      window.VEIL_APPLY_HERO(id, x[0], x[1]); dbCacheSave();
      if (routeHeroes().indexOf(id) >= 0) softRender();
    }).catch(function () { delete DBC.loading[id]; });
  }
  function routeHeroes() {
    var h = (location.hash || "").replace(/^#/, ""), m;
    if ((m = h.match(/^champion-([a-z]+)$/))) return [m[1]];
    if ((m = h.match(/^matchup-([a-z]+)-([a-z]+)-([a-z]+)$/))) return [m[1], m[2]];
    if (h === "matchup") return [S.lab && S.lab.you].filter(Boolean);
    return [];
  }
  /* the logged-in user's own matches, for My Page (approved only) */
  function loadMyMatches() {
    if (!SB || !AUTH.user || S.myLoading) return;
    S.myLoading = true;
    SB.rpc("my_matches", { lim: 1000 }).then(function (res) {
      S.myLoading = false;
      if (res.error) { S.myMatches = []; return; }
      S.myMatches = (res.data || []).filter(function (r) { return r.status === "approved"; }).map(function (r) {
        var m = { id: r.id, k: "d" + r.id, date: String(r.played_on), season: r.season || "", rank: r.rank, party: r.party, win: r.win, dur: r.duration_sec, ally: {}, enemy: {}, me: r.my_lane || null };
        Object.keys(r.picks || {}).forEach(function (k) { var a = k.split(":"); if (m[a[0]]) m[a[0]][a[1]] = r.picks[k]; });
        (r.detail || []).forEach(function (d) { if (d.items && d.items.length) (m.items = m.items || {})[d.side + ":" + d.lane] = d.items; });
        return m;
      }).sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id; });
      var h = (location.hash || "").replace(/^#/, "");
      if (h === "me" || /^champion-/.test(h)) softRender();
      /* account page: add the most-played heroes to the icon choices without redrawing the page */
      var ap = document.querySelector(".acct-av");
      if (h === "account" && ap && S.myMatches.length) { var tmp = document.createElement("div"); tmp.innerHTML = avatarPicker(); ap.replaceWith(tmp.firstChild); }
    });
  }
  function canReview() { return AUTH.role === "manager" || AUTH.role === "admin"; }
  function canManage() { return AUTH.role === "manager" || AUTH.role === "admin"; }
  function userName(u) { var m = (u && u.user_metadata) || {}; return m.full_name || m.name || (m.custom_claims && m.custom_claims.global_name) || m.user_name || "プレイヤー"; }
  function dbErr(e) { var m = (e && (e.message || e.error_description)) || String(e || ""); return /Failed to fetch|NetworkError/i.test(m) ? "サーバーにつながりませんでした。通信を確かめて、もう一度試してください。" : m; }
  function setUser(session) {
    var u = session && session.user;
    if (!u) { AUTH.user = null; AUTH.role = null; AUTH.name = ""; AUTH.avatar = ""; S.myMatches = null; return Promise.resolve(); }
    if (!AUTH.user || AUTH.user.id !== u.id) { S.myMatches = null; AUTH.avatar = ""; }
    AUTH.user = u; AUTH.name = userName(u);
    return Promise.all([
      SB.rpc("my_role").then(function (r) { AUTH.role = r.error ? null : r.data; }),
      /* the icon choice ('' = Discord icon); an older database without the column just keeps the Discord icon */
      Promise.resolve().then(function () { return SB.from("profiles").select("avatar").eq("id", u.id).limit(1); }).then(function (r) { AUTH.avatar = (!r.error && r.data && r.data[0] && r.data[0].avatar) || ""; }, function () {})
    ]);
  }
  if (SB) {
    /* PKCE: Discord sends the user back with ?code=…; supabase-js trades it for a session, then the address is cleaned */
    SB.auth.getSession().then(function (r) { return setUser(r.data && r.data.session); }).then(function () {
      AUTH.ready = true;
      if (AUTH.user && /^#(me|champion-)/.test(location.hash)) loadMyMatches();
      if (/[?&]code=/.test(location.search) || /[?&]error=/.test(location.search)) {
        var back = ""; try { back = sessionStorage.getItem("veil-return") || ""; sessionStorage.removeItem("veil-return"); } catch (e) {}
        history.replaceState(null, "", location.pathname + (back || location.hash || "#home"));
      }
      render(true);
    });
    SB.auth.onAuthStateChange(function (ev, session) {
      if (ev === "SIGNED_IN" || ev === "SIGNED_OUT" || ev === "USER_UPDATED") setUser(session).then(function () { if (AUTH.ready) render(true); });
    });
  }
  function login() {
    if (!SB) return;
    try { sessionStorage.setItem("veil-return", location.hash || "#home"); } catch (e) {}
    SB.auth.signInWithOAuth({ provider: "discord", options: { redirectTo: location.origin + location.pathname } }).then(function (r) { if (r.error) { S.loginErr = dbErr(r.error); render(true); } });
  }
  function logout() { if (SB) SB.auth.signOut().then(function () { go("#home"); }); }

  var IC_DISCORD = '<svg class="ic" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19.6 5.6A16.7 16.7 0 0 0 15.5 4.3l-.5 1a15.4 15.4 0 0 0-6 0l-.5-1a16.6 16.6 0 0 0-4.1 1.3C1.8 9.5 1.1 13.3 1.4 17a16.8 16.8 0 0 0 5.1 2.6l1.1-1.7a10.8 10.8 0 0 1-1.7-.8l.4-.3a11.9 11.9 0 0 0 11.4 0l.4.3c-.5.3-1.1.6-1.7.8l1.1 1.7a16.7 16.7 0 0 0 5.1-2.6c.4-4.3-.7-8-3-11.4ZM8.5 14.7c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Zm7 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Z"/></svg>';
  /* profile icon: the Discord icon (default), a hero's face, or the first letter of the name.
     choice: '' / 'discord' / 'initial' / 'hero:<id>'. A Discord icon that fails to load falls back to the letter. */
  function discordIcon(u) { var m = (u && u.user_metadata) || {}, v = m.avatar_url || m.picture || ""; return /^https:\/\/cdn\.discordapp\.com\/[\w./?=-]+$/.test(v) ? v : ""; }
  function avatarHtml(choice, discord, name, size) {
    var ini = esc(String(name || "?").trim().slice(0, 1).toUpperCase() || "?"), open = '<span class="avatar' + (size ? " " + size : "") + '" data-ini="' + ini + '" aria-hidden="true">';
    if (choice && choice.indexOf("hero:") === 0) { var c = CH[choice.slice(5)]; if (c) return open + portrait(c, true) + "</span>"; }
    if (choice !== "initial" && discord) return open + '<img src="' + esc(discord) + '" alt="" referrerpolicy="no-referrer" loading="lazy" onerror="this.remove()"></span>';
    return open + "</span>";
  }
  function myAvatar(size) { return avatarHtml(AUTH.avatar, discordIcon(AUTH.user), AUTH.name, size); }
  function accountBtn(cur) {
    if (!SB) return "";
    if (!AUTH.ready) return '<span class="icon-btn acct-btn" aria-hidden="true"></span>';
    if (!AUTH.user) return '<button class="icon-btn acct-btn login" type="button" data-action="login" title="Discordでログイン">' + IC_DISCORD + '<span>LOGIN</span></button>';
    return '<a class="icon-btn acct-btn has-av' + (cur === "account" ? " on" : "") + '" href="#account" title="' + esc(AUTH.name) + ' のアカウント">' + myAvatar() + '<span class="sr">アカウント</span></a>';
  }
  function acctHead(title, jp, crumb) {
    return '<section class="phead">' + atmo({ h: 220, seed: 71 }) + '<div class="wrap">' + crumbs([["HOME", "#home"], [crumb]]) +
      '<div class="phead-row"><div style="display:flex;flex-direction:column;gap:14px"><h1 class="rise">' + title + '</h1><p class="jp rise d1">' + jp + "</p></div></div></div></section>";
  }
  /* shown instead of a page when the database or the login is not there yet */
  function acctGate(needRole) {
    if (!SB) return '<div class="empty"><span class="tag dim">準備中</span><h3>データベースにまだつながっていません</h3><p class="muted" style="font-size:14px;max-width:560px">試合の登録と承認は、Supabaseの準備ができたら使えるようになります。</p></div>';
    if (!AUTH.ready) return '<div class="empty"><span class="tag dim">LOADING</span><h3>ログイン状態を確かめています…</h3></div>';
    if (!AUTH.user) return '<div class="empty"><span class="tag dim">LOGIN</span><h3>Discordでログインしてください</h3><p class="muted" style="font-size:14px;max-width:560px">見るだけならログインはいりません。試合を登録するときだけ、Discordでログインします。パスワードはこのサイトに保存されません。</p><button class="btn primary" type="button" data-action="login">' + IC_DISCORD + "Discordでログイン</button>" + (S.loginErr ? '<p class="sub-msg bad">' + esc(S.loginErr) + "</p>" : "") + "</div>";
    if (needRole && !needRole()) return '<div class="empty"><span class="tag warn">NO ACCESS</span><h3>このページを見る権限がありません</h3><p class="muted" style="font-size:14px">運営か管理者だけが使えるページです。</p></div>';
    return "";
  }

  /* ----- icon picker (account page) ----- */
  function avatarPicker() {
    var cur = AUTH.avatar || "", dc = discordIcon(AUTH.user), opt = function (v, label, html) {
      var on = v === cur || (!v && cur === "discord");
      return '<button class="av-opt' + (on ? " on" : "") + '" type="button" data-action="av-set" data-v="' + esc(v) + '" aria-pressed="' + on + '">' + html + '<span>' + label + "</span></button>";
    };
    /* quick picks: the heroes the user played most (when their matches are loaded), plus the current hero choice */
    var cnt = {};
    (S.myMatches || []).forEach(function (m) { var ml = meMyLane(m); var id = ml && m.ally && m.ally[ml.lane]; if (id && CH[id]) cnt[id] = (cnt[id] || 0) + 1; });
    var top = Object.keys(cnt).sort(function (a, b) { return cnt[b] - cnt[a]; }).slice(0, 6);
    if (cur.indexOf("hero:") === 0 && CH[cur.slice(5)] && top.indexOf(cur.slice(5)) < 0) top.unshift(cur.slice(5));
    return '<div class="acct-av"><div style="display:flex;flex-direction:column;gap:6px"><span class="mono gold" style="font-size:10px">ICON · アイコン</span><span class="muted" style="font-size:13px">ヘッダーやメンバー一覧に出るアイコンです。画像のアップロードはなく、Discordのアイコンかヒーローの顔から選びます。</span></div>' +
      '<div class="av-opts">' + opt("", dc ? "Discordのアイコン" : "Discord(アイコン未設定)", avatarHtml("", dc, AUTH.name)) + opt("initial", "頭文字", avatarHtml("initial", "", AUTH.name)) +
        top.map(function (id) { return opt("hero:" + id, esc(CH[id].name), avatarHtml("hero:" + id, "", AUTH.name)); }).join("") + "</div>" +
      '<div class="av-hero">' + heroDatalist() + '<label class="sr" for="av-hero">顔にするヒーロー</label><input id="av-hero" class="sub-hero" list="hero-names" autocomplete="off" placeholder="ほかのヒーローの顔にする(名前を入力)"><button class="chip" type="button" data-action="av-hero">この顔にする</button></div>' +
      '<span id="av-msg" class="sub-msg" role="status" aria-live="polite"></span></div>';
  }
  function saveAvatar(v) {
    var msg = document.getElementById("av-msg");
    if (msg) { msg.className = "sub-msg"; msg.textContent = "保存しています…"; }
    SB.rpc("set_my_avatar", { choice: v }).then(function (res) {
      if (res.error) {
        if (msg) { msg.className = "sub-msg bad"; msg.textContent = /set_my_avatar|function/i.test(res.error.message || "") ? "データベースの準備がまだです(運営に db/avatar.sql の実行を頼んでください)。" : dbErr(res.error); }
        return;
      }
      AUTH.avatar = res.data || "";
      render(true);
      var m2 = document.getElementById("av-msg"); if (m2) { m2.className = "sub-msg ok"; m2.textContent = "アイコンを変えました。"; }
    });
  }

  /* ----- account page ----- */
  function viewAccount() {
    var g = acctGate();
    if (!g && !S.myMatches) setTimeout(loadMyMatches, 0);
    return acctHead("ACCOUNT", "あなたのアカウント", "ACCOUNT") + '<section class="section tight"><div class="wrap" style="display:flex;flex-direction:column;gap:32px">' + (g ||
      '<div class="acct-card"><span id="acct-av-big">' + myAvatar("big") + '</span><div style="display:flex;flex-direction:column;gap:6px"><span class="mincho" style="font-size:24px">' + esc(AUTH.name) + '</span><span class="mono muted" style="font-size:11px">DISCORD · ' + esc(ROLE_JP[AUTH.role] || "—") + "</span></div></div>" +
      avatarPicker() +
      '<div class="acct-links"><a class="card acct-link" href="#submit"><span class="mono gold" style="font-size:10px">SUBMIT</span><span class="mincho" style="font-size:20px">試合を登録する</span><span class="muted" style="font-size:13px">' + (AUTH.role === "member" ? "登録した試合は、承認されてから集計に入ります。" : "登録した試合は、すぐ集計に入ります(同じ試合がすでにあるときは承認待ち)。") + "</span></a>" +
      (canReview() ? '<a class="card acct-link" href="#review"><span class="mono gold" style="font-size:10px">REVIEW</span><span class="mincho" style="font-size:20px">承認する</span><span class="muted" style="font-size:13px">承認待ちの試合を確認します。' + (AUTH.role === "admin" ? "メンバーの役割もここで変えられます。" : AUTH.role === "manager" ? "一般と信頼ユーザーの切り替えもここでできます。" : "") + "</span></a>" : "") +
      '<a class="card acct-link" href="#me"><span class="mono gold" style="font-size:10px">MY PAGE</span><span class="mincho" style="font-size:20px">マイページ</span><span class="muted" style="font-size:13px">自分の勝率や得意ヒーローを見ます。</span></a></div>' +
      '<div><button class="btn ghost" type="button" data-action="logout">ログアウト</button></div>') + "</div></section>";
  }

  /* ----- submit page ----- */
  var HERO_BY_NAME = null;
  function heroIndex() {
    if (HERO_BY_NAME) return HERO_BY_NAME;
    HERO_BY_NAME = {};
    D.champions.forEach(function (c) { [c.name, c.en, c.name + " (" + c.en + ")", c.id].forEach(function (k) { HERO_BY_NAME[heroKey(k)] = c.id; }); });
    return HERO_BY_NAME;
  }
  function heroKey(v) { return String(v || "").toLowerCase().replace(/\s+/g, "").replace(/[\u3041-\u3096]/g, function (ch) { return String.fromCharCode(ch.charCodeAt(0) + 0x60); }); }
  /* exact name (日本語 / English / "日本語 (English)"), hiragana allowed; otherwise a unique prefix of at least 2 letters */
  function heroFromInput(v) {
    var k = heroKey(v); if (!k) return null;
    var idx = heroIndex(); if (idx[k]) return idx[k];
    if (k.length < 2) return null;
    var hit = D.champions.filter(function (c) { return heroKey(c.name).indexOf(k) === 0 || heroKey(c.en).indexOf(k) === 0; });
    return hit.length === 1 ? hit[0].id : null;
  }
  function heroDatalist() {
    return '<datalist id="hero-names">' + D.champions.slice().sort(function (a, b) { return a.name.localeCompare(b.name, "ja"); }).map(function (c) { return '<option value="' + esc(c.name + " (" + c.en + ")") + '"></option>'; }).join("") + "</datalist>";
  }
  function subRow(side, L) {
    var own = side === "ally", id = "f-" + side + "-" + L;
    return '<div class="sub-row" data-side="' + side + '" data-lane="' + L + '"><span class="mono sub-lane">' + L + '</span><span class="sub-face" id="' + id + '-face"><span class="portrait sm"></span></span>' +
      '<label class="sr" for="' + id + '">' + (own ? "味方" : "敵") + "の" + L + '</label><input id="' + id + '" class="sub-hero" list="hero-names" autocomplete="off" placeholder="ヒーロー名" data-hero-input="' + id + '">' +
      (own ? '<label class="sub-me" title="自分が使ったヒーロー"><input type="radio" name="f-me" value="' + L + '"><span>自分</span></label>' : '<span class="sub-me-pad"></span>') +
      '<span class="sub-kda" role="group" aria-label="' + (own ? "味方" : "敵") + "の" + L + 'のKDA">' + ["K", "D", "A"].map(function (x) { return '<input type="number" inputmode="numeric" min="0" max="99" placeholder="' + x + '" aria-label="' + x + '" data-kda="' + x + '">'; }).join("") + "</span><div class=\"sub-items\" id=\"" + id + "-items\" hidden></div></div>";
  }
  function viewSubmit() {
    S.editId = null;
    var g = acctGate(), today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    var sel = function (id, label, opts, val) { return '<label class="sub-field"><span class="mono">' + label + '</span><select id="' + id + '">' + opts.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (o[0] === val ? " selected" : "") + ">" + esc(o[1]) + "</option>"; }).join("") + "</select></label>"; };
    var last = S.subLast || {};
    return acctHead("SUBMIT", "試合を登録する", "SUBMIT") + '<section class="section tight"><div class="wrap" style="display:flex;flex-direction:column;gap:48px">' + (g ||
      '<form id="sub-form" class="sub-form" novalidate>' + heroDatalist() +
        '<div id="sub-editing" class="sub-editing" hidden></div>' +
        '<div class="rec-box" id="rec-box"><div style="display:flex;flex-direction:column;gap:6px"><span class="mono gold" style="font-size:10px">SCREENSHOT · スクショから読み取る</span>' +
          '<span class="muted" style="font-size:13px">試合結果の画面のスクショを選ぶか、この画面に貼り付ける(Ctrl+V)と、10体・KDA・装備・戦闘番号・試合時間・勝敗を読み取って下に入れます。読み取りはこの端末の中だけで行い、プレイヤー名は読みません。</span></div>' +
          '<label class="btn ghost rec-pick"><input type="file" id="rec-file" accept="image/*" hidden>画像を選ぶ</label><div id="rec-status" class="sub-msg" role="status" aria-live="polite"></div></div>' +
        '<div class="sub-meta">' +
          '<label class="sub-field"><span class="mono">日付</span><input type="date" id="f-date" value="' + (last.date || today) + '" max="' + today + '" required></label>' +
          sel("f-rank", "ランク帯", [["", "—"]].concat(RANKS.map(function (r) { return [r, r]; })), last.rank || "Mythic") +
          '<label class="sub-field"><span class="mono">星の数</span><input type="number" id="f-stars" inputmode="numeric" min="0" max="9999" placeholder="例: 57" value="' + esc(last.stars != null ? String(last.stars) : "") + '"></label>' +
          sel("f-party", "人数", PARTIES, last.party || "Solo") +
          '<label class="sub-field"><span class="mono">試合時間</span><input id="f-dur" placeholder="14:22" inputmode="numeric" pattern="\\d{1,2}:\\d{2}"></label>' +
          '<label class="sub-field"><span class="mono">戦闘番号(結果画面の左下)</span><input id="f-battle" placeholder="例: 761072273980257240" inputmode="numeric" maxlength="40" autocomplete="off"></label>' +
          (canManage() ? '<label class="sub-field"><span class="mono">シーズン(運営・管理者だけ変更できます)</span><input id="f-season" placeholder="例: S43" maxlength="4" value="' + esc(last.season || S.curSeason || "") + '"></label>'
            : '<div class="sub-field"><span class="mono">シーズン</span><span id="f-season-now" class="serif num" style="font-size:22px;min-height:42px;display:flex;align-items:center">' + esc(S.curSeason || "—") + '</span><span class="muted" style="font-size:11px">運営が設定した今のシーズンで登録されます</span></div>') +
        "</div>" +
        '<fieldset class="sub-res"><legend class="mono">結果(自分のチーム)</legend><label><input type="radio" name="f-win" value="1"><span>WIN 勝ち</span></label><label><input type="radio" name="f-win" value="0"><span>LOSE 負け</span></label></fieldset>' +
        '<div class="sub-teams"><div class="sub-team"><h3 class="subh" style="margin:0">味方 <small class="muted">自分を選んで、自分のKDAは必ず入れてください</small></h3>' + LANE_ORDER.map(function (L) { return subRow("ally", L); }).join("") + "</div>" +
        '<div class="sub-team"><h3 class="subh" style="margin:0">敵 <small class="muted">KDAは分かれば</small></h3>' + LANE_ORDER.map(function (L) { return subRow("enemy", L); }).join("") + "</div></div>" +
        '<label class="sub-field wide"><span class="mono">メモ(任意 · 承認する人に伝えたいこと)</span><input id="f-note" maxlength="300"></label>' +
        '<div class="sub-actions"><button class="btn primary" type="submit" id="sub-send">登録する' + IC.arrow + '</button><span id="sub-msg" class="sub-msg" role="status" aria-live="polite"></span></div>' +
      "</form>" +
      "<div>" + secHead("—", "MY SUBMISSIONS", "あなたが登録した試合") + '<div id="my-subs"><p class="muted">読み込み中…</p></div></div>') + "</div></section>";
  }
  function subFace(input) {
    var id = heroFromInput(input.value), face = document.getElementById(input.id + "-face");
    input.classList.toggle("ok", !!id); input.classList.toggle("bad", !!input.value && !id);
    if (face) face.innerHTML = id ? portrait(CH[id], true) : '<span class="portrait sm"></span>';
  }
  function readForm() {
    var f = document.getElementById("sub-form"), out = { ally: {}, enemy: {}, kda: { ally: {}, enemy: {} } }, errs = [], used = {};
    out.played_on = f.querySelector("#f-date").value; out.rank = f.querySelector("#f-rank").value; out.party = f.querySelector("#f-party").value;
    var fs = f.querySelector("#f-season"); out.season = fs ? fs.value.trim().toUpperCase() : ""; out.note = f.querySelector("#f-note").value.trim();
    if (fs && out.season && !/^S\d{1,3}$/.test(out.season)) errs.push("シーズンは S43 のように入れてください");
    var bid = f.querySelector("#f-battle").value.replace(/[^0-9]/g, "");
    if (bid && !/^\d{6,30}$/.test(bid)) errs.push("戦闘番号は、結果画面の左下にある数字をそのまま入れてください"); else if (bid) out.battle_id = bid;
    var st = f.querySelector("#f-stars").value.trim();
    if (st !== "") { if (!/^\d{1,4}$/.test(st)) errs.push("星の数は0〜9999の数字で入れてください"); else out.stars = Number(st); }
    var w = f.querySelector('input[name="f-win"]:checked'); if (!w) errs.push("勝ち・負けを選んでください"); else out.win = w.value === "1";
    var me = f.querySelector('input[name="f-me"]:checked'); if (!me) { if (!S.editStaff) errs.push("味方のうち、自分のヒーローを選んでください"); } else out.my_lane = me.value;
    var dur = f.querySelector("#f-dur").value.trim(), dm = dur.match(/^(\d{1,2})[:：](\d{2})$/);
    if (dur && !dm) errs.push("試合時間は 14:22 のように「分:秒」で入れてください"); else if (dm) out.duration_sec = Number(dm[1]) * 60 + Number(dm[2]);
    if (!out.played_on) errs.push("日付を入れてください");
    f.querySelectorAll(".sub-row").forEach(function (row) {
      var side = row.getAttribute("data-side"), L = row.getAttribute("data-lane"), inp = row.querySelector(".sub-hero"), id = heroFromInput(inp.value);
      if (!id) errs.push((side === "ally" ? "味方" : "敵") + "の " + L + (inp.value ? " のヒーロー名が見つかりません" : " のヒーローが空です"));
      else if (used[id]) errs.push(CH[id].name + " が2回入っています"); else used[id] = 1;
      out[side][L] = id;
      var k = row.querySelectorAll("[data-kda]"), v = [].map.call(k, function (x) { return x.value === "" ? null : Number(x.value); });
      if (v.every(function (x) { return x != null; })) { if (v.some(function (x) { return !(x >= 0 && x <= 99 && Math.floor(x) === x); })) errs.push((side === "ally" ? "味方" : "敵") + "の " + L + " のKDAは0〜99の整数で入れてください"); else out.kda[side][L] = v; }
      else if (v.some(function (x) { return x != null; })) errs.push((side === "ally" ? "味方" : "敵") + "の " + L + " のKDAは3つとも入れるか、空にしてください");
    });
    if (out.my_lane && !out.kda.ally[out.my_lane] && !S.editStaff) errs.push("自分のKDAを入れてください");
    var items = { ally: {}, enemy: {} };
    ["ally", "enemy"].forEach(function (side) { LANE_ORDER.forEach(function (L) {
      var ids = [].map.call(f.querySelectorAll("#f-" + side + "-" + L + "-items select[data-item]"), function (x) { return x.value; }).filter(Boolean);
      if (ids.length) items[side][L] = ids.slice(0, 6);
    }); });
    out.items = items;
    if (!errs.length) recPayload(out);
    return { payload: out, errs: errs };
  }

  /* ---- screenshot reader (recog.js): references come from the DB, cached in this browser ---- */
  var REC_KEY = "veil-rec-refs-v1", REC_READY = null;
  function recRefs() {
    if (REC_READY) return REC_READY;
    if (!SB) return (REC_READY = Promise.resolve());
    REC_READY = SB.from("icon_refs").select("id").order("id", { ascending: false }).limit(1).then(function (r) {
      var top = r.data && r.data[0] ? r.data[0].id : 0, cache = null;
      try { cache = JSON.parse(localStorage.getItem(REC_KEY) || "null"); } catch (e) {}
      if (cache && cache.top === top && cache.refs) return cache.refs;
      /* only the newest few per name (icon_refs_active); an older database without the view gets the whole table */
      return fetchAll("icon_refs_active", "id,kind,label,img", ["id"]).catch(function () { return fetchAll("icon_refs", "id,kind,label,img", ["id"]); }).then(function (refs) {
        try { localStorage.setItem(REC_KEY, JSON.stringify({ top: top, refs: refs })); } catch (e) {}
        return refs;
      });
    }).then(function (refs) { return window.VEIL_RECOG.setRefs(refs || []); }).catch(function () { REC_READY = null; });
    return REC_READY;
  }
  /* item name for any id: finished items, then intermediate / basic items */
  function itemName(id) {
    var G = window.VEIL_GEAR || {}, it = (G.items || {})[id] || (G.parts || {})[id];
    return id === "other" ? "一覧にない装備" : it ? it.name : id;
  }
  function recItemOptions(sel) {
    var G = window.VEIL_GEAR || {}, grp = function (label, map) {
      var ids = Object.keys(map || {}).sort(function (a, b) { return map[a].name.localeCompare(map[b].name, "ja"); });
      return '<optgroup label="' + label + '">' + ids.map(function (id) { return '<option value="' + id + '"' + (id === sel ? " selected" : "") + ">" + esc(map[id].name) + "</option>"; }).join("") + "</optgroup>";
    };
    return '<option value="">—(入れない)</option><option value="other"' + (sel === "other" ? " selected" : "") + ">一覧にない装備</option>" +
      grp("完成装備", G.items) + grp("中間・基本装備", G.parts);
  }
  function readShot(file) {
    if (S.editId) endEdit();
    var st = document.getElementById("rec-status"); if (!st) return;
    if (!window.VEIL_RECOG) { st.className = "sub-msg bad"; st.textContent = "読み取りの準備ができていません。ページを読み込み直してください。"; return; }
    if (!file || !/^image\//.test(file.type)) { st.className = "sub-msg bad"; st.textContent = "画像ファイルを選んでください。"; return; }
    st.className = "sub-msg"; st.textContent = "読み取っています…";
    var url = URL.createObjectURL(file);
    Promise.all([recRefs(), window.VEIL_RECOG.loadImage(url)]).then(function (x) {
      var a = window.VEIL_RECOG.analyze(x[1]); URL.revokeObjectURL(url); recFill(a);
    }).catch(function (e) { st.className = "sub-msg bad"; st.textContent = "読み取れませんでした(" + (e && e.message || "画像を開けません") + ")。"; });
  }
  function recFill(a) {
    var f = document.getElementById("sub-form"), st = document.getElementById("rec-status"); if (!f) return;
    var laneGames = function (id) { var s = (window.VEIL_STATS || {})[id], o = {}; if (s) Object.keys(s.lane).forEach(function (L) { o[L] = s.lane[L].games; }); return o; };
    var map = {}, known = 0, kdaOk = 0;
    ["ally", "enemy"].forEach(function (side) {
      var rows = a.rows.filter(function (r) { return r.side === side; }).sort(function (x, y) { return x.row - y.row; });
      var ids = rows.map(function (r) { return r.hero.label && CH[r.hero.label] ? r.hero.label : null; });
      var lanes = window.VEIL_RECOG.lanes(ids, rows.map(function (r) { return r.mark; }), function (id) { return CH[id]; }, laneGames);
      rows.forEach(function (r, i) {
        var L = lanes[i], id = "f-" + side + "-" + L; r.lane = L; map[side + ":" + L] = r;
        var inp = document.getElementById(id); if (!inp) return;
        inp.value = ids[i] ? CH[ids[i]].name + " (" + CH[ids[i]].en + ")" : ""; subFace(inp); if (ids[i]) known++;
        var ks = inp.closest(".sub-row").querySelectorAll("[data-kda]");
        if (r.kda.every(function (k) { return k.sure; })) { r.kda.forEach(function (k, j) { ks[j].value = String(Number(k.text)); }); kdaOk++; }
        else r.kda.forEach(function (k, j) { ks[j].value = k.sure ? String(Number(k.text)) : ""; });
        var box = document.getElementById(id + "-items");
        box.innerHTML = '<span class="rec-face" title="画面の顔"><img src="' + r.face + '" alt="画面の顔"></span>' + (r.mark ? '<span class="tag dim" style="font-size:9px">' + (r.mark === "JUNGLE" ? "ハントのマーク" : "足のマーク") + "</span>" : "") +
          r.items.map(function (it, k) { return '<label class="rec-item"><img src="' + it.img + '" alt=""><span class="sr">' + (side === "ally" ? "味方" : "敵") + " " + L + " の装備" + (k + 1) + '</span><select data-item="' + k + '">' + recItemOptions(it.id || "") + "</select></label>"; }).join("");
        box.hidden = false;
      });
    });
    var me = a.meRow != null ? a.rows.filter(function (r) { return r.side === "ally" && r.row === a.meRow; })[0] : null;
    f.querySelectorAll('input[name="f-me"]').forEach(function (x) { x.checked = !!me && x.value === me.lane; });
    f.querySelectorAll('input[name="f-win"]').forEach(function (x) { x.checked = x.value === (a.win.value ? "1" : "0"); });
    if (a.time.sure && a.time.text.length >= 3) { var tt = a.time.text; f.querySelector("#f-dur").value = tt.slice(0, tt.length - 2) + ":" + tt.slice(-2); }
    if (a.battle.sure) f.querySelector("#f-battle").value = a.battle.text;
    S.rec = { a: a, map: map };
    var notes = [];
    notes.push("ヒーロー " + known + "/10 体、KDA " + kdaOk + "/10 人ぶんを読み取りました。");
    if (known < 10) notes.push("空いている欄は、下の「画面の顔」を見てヒーロー名を入れてください(入れた名前は、次からの読み取りに使われます)。");
    notes.push("レーンは靴のマークとヒーローの種類から決めています。違っていたら直してください。");
    if (!a.battle.sure) notes.push("戦闘番号は読み取れませんでした。");
    if (!a.layoutOk) notes.push("この画面サイズはまだ慣れていないので、位置がずれているかもしれません。");
    st.className = "sub-msg ok"; st.innerHTML = notes.map(esc).join("<br>");
  }
  /* what the submitter confirmed becomes new references: only the crops the reader got wrong or could not read */
  function recPayload(out) {
    var R0 = S.rec; if (!R0) return;
    var icons = [], items = { ally: {}, enemy: {} }, push = function (kind, label, img) { if (icons.length < 120 && img) icons.push({ kind: kind, label: String(label), img: img }); };
    ["ally", "enemy"].forEach(function (side) {
      LANE_ORDER.forEach(function (L) {
        var r = R0.map[side + ":" + L]; if (!r) return;
        var hero = out[side][L]; if (hero && r.hero.label !== hero) push("hero", hero, r.face);
        var ids = [];
        document.querySelectorAll("#f-" + side + "-" + L + "-items select[data-item]").forEach(function (sel) {
          var it = r.items[Number(sel.getAttribute("data-item"))]; if (!sel.value) return;
          ids.push(sel.value); if (it && it.id !== sel.value) push("item", sel.value, it.img);
        });
        r.items.forEach(function (it) { if (it.badge && it.badge.lane && it.badge.lane !== L) push("badge", "none", it.badge.img); });
        var kv = (out.kda[side] || {})[L];
        if (kv) r.kda.forEach(function (cell, j) { var t = String(kv[j]); if (cell.glyphs.length !== t.length) return; cell.glyphs.forEach(function (g, n) { if (g.label !== t[n]) push("kda", t[n], g.img); }); });
      });
    });
    var a = R0.a;
    if (out.battle_id && a.battle.glyphs.length === out.battle_id.length) a.battle.glyphs.forEach(function (g, n) { if (g.label !== out.battle_id[n]) push("bid", out.battle_id[n], g.img); });
    if (out.duration_sec != null) {
      var tt = Math.floor(out.duration_sec / 60) + ("0" + out.duration_sec % 60).slice(-2);
      while (tt.length < a.time.glyphs.length) tt = "0" + tt;
      if (a.time.glyphs.length === tt.length) a.time.glyphs.forEach(function (g, n) { if (g.label !== tt[n]) push("time", tt[n], g.img); });
    }
    if (icons.length) out.icons = icons;
  }
  /* ---- editing a match you sent, within an hour ---- */
  function editLeft(created) { return Math.max(1, Math.ceil((new Date(created).getTime() + 3600e3 - Date.now()) / 60000)); }
  function itemLine(side, L, ids) {
    var row = []; for (var k = 0; k < 6; k++) row.push(ids[k] || "");
    return row.map(function (id, k) { var src = itemSrc(id); return '<label class="rec-item"><img class="rec-cur" src="' + esc(src) + '" alt=""' + (src ? "" : " hidden") + '><span class="sr">' + (side === "ally" ? "味方" : "敵") + " " + L + " の装備" + (k + 1) + '</span><select data-item="' + k + '">' + recItemOptions(id) + "</select></label>"; }).join("");
  }
  function startEdit(id, given, staff) {
    var m = given || (S.mySubs || []).filter(function (x) { return String(x.id) === String(id); })[0], f = document.getElementById("sub-form");
    if (!m || !f) return;
    S.editId = m.id; S.editStaff = !!staff; S.rec = null;
    var set = function (sel, v) { var e = f.querySelector(sel); if (e) e.value = v == null ? "" : v; };
    set("#f-date", m.played_on); set("#f-rank", m.rank || ""); set("#f-stars", m.stars); set("#f-party", m.party || "Solo"); set("#f-battle", m.battle_id); set("#f-note", m.note);
    set("#f-dur", m.duration_sec != null ? Math.floor(m.duration_sec / 60) + ":" + ("0" + m.duration_sec % 60).slice(-2) : "");
    set("#f-season", m.season);
    f.querySelectorAll('input[name="f-win"]').forEach(function (x) { x.checked = x.value === (m.win ? "1" : "0"); });
    f.querySelectorAll('input[name="f-me"]').forEach(function (x) { x.checked = x.value === m.my_lane; });
    var picks = m.detail || [];
    f.querySelectorAll(".sub-row").forEach(function (row) {
      var side = row.getAttribute("data-side"), L = row.getAttribute("data-lane"), p = picks.filter(function (x) { return x.side === side && x.lane === L; })[0] || {};
      if (!p.hero && m.picks) p.hero = m.picks[side + ":" + L];
      var inp = row.querySelector(".sub-hero"); inp.value = p.hero && CH[p.hero] ? CH[p.hero].name + " (" + CH[p.hero].en + ")" : ""; subFace(inp);
      var ks = row.querySelectorAll("[data-kda]"), kv = [p.k, p.d, p.a]; if (!p.k && p.k !== 0 && p.me) kv = [m.k, m.d, m.a];
      ks.forEach(function (x, j) { x.value = kv[j] == null ? "" : kv[j]; });
      var box = document.getElementById("f-" + side + "-" + L + "-items"); box.innerHTML = itemLine(side, L, p.items || []); box.hidden = false;
    });
    var bn = document.getElementById("sub-editing");
    bn.innerHTML = staff ? '<span><b>運営として No.' + m.id + "</b>(登録: " + esc(m.submitter || "?") + ")を直しています。登録した人と承認の状態(" + esc(STATUS_JP[m.status] || m.status) + ')はそのままです。直したら「更新する」を押してください。変更は作業の記録に残ります。</span><button class="chip" type="button" data-action="sub-edit-cancel" style="min-height:32px">やめる</button>'
      : '<span><b>No.' + m.id + "</b> を編集中です(あと" + editLeft(m.created_at) + '分)。直したら「更新する」を押してください。' + (AUTH.role === "member" && m.status === "approved" ? "一般の人が直した試合は、もう一度承認待ちになります。" : "") + '</span><button class="chip" type="button" data-action="sub-edit-cancel" style="min-height:32px">やめる</button>';
    bn.hidden = false;
    var b = document.getElementById("sub-send"); if (b) b.innerHTML = "更新する" + IC.arrow;
    var st = document.getElementById("rec-status"); if (st) st.textContent = "";
    document.getElementById("sub-msg").textContent = "";
    f.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function endEdit() {
    S.editId = null; S.editStaff = false; S.staffEdit = null;
    var bn = document.getElementById("sub-editing"); if (bn) { bn.hidden = true; bn.innerHTML = ""; }
    var b = document.getElementById("sub-send"); if (b) b.innerHTML = "登録する" + IC.arrow;
  }
  function sendForm() {
    var r = readForm(), msg = document.getElementById("sub-msg"), btn = document.getElementById("sub-send");
    if (r.errs.length) { msg.className = "sub-msg bad"; msg.innerHTML = r.errs.slice(0, 4).map(esc).join("<br>") + (r.errs.length > 4 ? "<br>ほか " + (r.errs.length - 4) + " 件" : ""); return; }
    btn.disabled = true; msg.className = "sub-msg"; msg.textContent = "送信中…";
    var editing = S.editId, staffing = S.editStaff;
    (editing ? SB.rpc(staffing ? "staff_update_match" : "update_match", { match_id: editing, payload: r.payload }) : SB.rpc("submit_match", { payload: r.payload })).then(function (res) {
      btn.disabled = false;
      if (res.error) { msg.className = "sub-msg bad"; msg.textContent = /update_match/.test(res.error.message || "") ? "データベースの準備がまだです(db/edit_match.sql の実行が必要です)。" : dbErr(res.error); return; }
      var d = res.data || {};
      if (editing) endEdit();
      S.subLast = { date: r.payload.played_on, rank: r.payload.rank, party: r.payload.party, season: r.payload.season, stars: r.payload.stars };
      S.myMatches = null;   /* My Page reloads your matches next time */
      if (S.rec && res.data) REC_READY = null;   /* new references may arrive once approved */
      S.rec = null; document.querySelectorAll(".sub-items").forEach(function (b) { b.hidden = true; b.innerHTML = ""; });
      var rs = document.getElementById("rec-status"); if (rs) rs.textContent = "";
      msg.className = "sub-msg ok";
      if (staffing) { msg.className = "sub-msg ok"; msg.innerHTML = "No." + d.id + ' を直しました。集計には15分ほどで反映されます。<a href="#review">承認の画面に戻る</a>'; }
      else msg.textContent = editing ? "No." + d.id + " を直しました。" + (d.status === "approved" ? "集計には15分ほどで反映されます。" : "承認されると集計に入ります。") : d.status === "approved" ? "登録しました(No." + d.id + ")。集計には15分ほどで反映されます。" : "登録しました(No." + d.id + ")。承認されると集計に入ります。" + (d.dup_of ? "同じ試合(No." + d.dup_of + ")がすでにあるので、運営が確認します。" : "");
      var f = document.getElementById("sub-form");
      f.querySelectorAll(".sub-hero, [data-kda], #f-note, #f-dur, #f-battle").forEach(function (x) { x.value = ""; if (x.classList.contains("sub-hero")) subFace(x); });
      f.querySelectorAll('input[name="f-win"], input[name="f-me"]').forEach(function (x) { x.checked = false; });
      loadMySubs();
    });
  }
  function teamFaces(picks, side, opts) {
    opts = opts || {};
    return '<div class="rv-team ' + side + '">' + LANE_ORDER.map(function (L) {
      var p = picks.filter(function (x) { return x.side === side && x.lane === L; })[0] || {}, c = CH[p.hero];
      return '<span class="rv-h' + (p.me ? " me" : "") + '" title="' + esc((c ? c.name : p.hero || "?") + " (" + L + ")") + '">' + (c ? portrait(c, true) : '<span class="portrait sm"></span>') + '<span class="mono">' + L + "</span>" +
        (p.k != null ? '<span class="num rv-kda">' + p.k + "/" + p.d + "/" + p.a + "</span>" : "") + (p.me ? "<b>" + (opts.meLabel || "YOU") + "</b>" : "") +
        (p.items && p.items.length ? '<span class="rv-items">' + p.items.map(tinyItem).join("") + "</span>" : "") + "</span>";
    }).join("") + "</div>";
  }
  /* a small item icon with its name on hover; "other" (not in the list) is an empty ring */
  function itemSrc(id) { var G = window.VEIL_GEAR || {}, it = (G.items || {})[id] || (G.parts || {})[id]; return it ? (it.icon || "icons/i-" + id + ".webp") : ""; }
  function tinyItem(id) {
    var src = itemSrc(id);
    return src ? '<img class="ti" src="' + esc(src) + '" alt="' + esc(itemName(id)) + '" title="' + esc(itemName(id)) + '" loading="lazy">' : '<span class="ti none" title="' + esc(itemName(id)) + '"></span>';
  }
  function loadSeason(done) {
    if (!SB) return;
    SB.rpc("current_season").then(function (r) { if (!r.error && r.data) { S.curSeason = r.data; if (done) done(r.data); } });
  }
  function loadMySubs() {
    if (S.staffEdit && canManage()) {   /* 運営 opened 「直す」 on the approval page */
      var se = S.staffEdit; S.staffEdit = null;
      startEdit(se.id, se, true);
      var sf = document.getElementById("sub-editing"); if (sf) sf.scrollIntoView({ block: "center" });
    }
    loadSeason(function (v) {
      var n = document.getElementById("f-season-now"); if (n) n.textContent = v;
      var e = document.getElementById("f-season"); if (e && !e.value) e.value = v;
      var rs = document.getElementById("rv-season"); if (rs && !rs.value) rs.value = v;
    });
    var box = document.getElementById("my-subs"); if (!box || !SB) return;
    SB.rpc("my_matches", { lim: 200 }).then(function (res) {
      if (!document.getElementById("my-subs")) return;
      if (res.error) { box.innerHTML = '<p class="sub-msg bad">' + esc(dbErr(res.error)) + "</p>"; return; }
      var rows = res.data || [];
      S.mySubs = rows;
      if (!rows.length) { box.innerHTML = '<p class="muted" style="font-size:14px">まだ登録した試合はありません。</p>'; return; }
      box.innerHTML = '<ol class="mlog">' + rows.map(function (m) {
        var picks = m.detail ? m.detail : Object.keys(m.picks || {}).map(function (k) { var a = k.split(":"); var me = a[0] === "ally" && a[1] === m.my_lane; return { side: a[0], lane: a[1], hero: m.picks[k], me: me, k: me ? m.k : null, d: me ? m.d : null, a: me ? m.a : null }; });
        return '<li class="mlog-row sub-mine"><div class="mlog-info"><span class="mono muted" style="font-size:10px">No.' + m.id + (m.season ? " · " + esc(m.season) : "") + (m.stars != null ? " · ★" + m.stars : "") + '</span><span class="num">' + esc(String(m.played_on).replace(/-/g, ".")) + '</span><span><span class="mlog-res ' + (m.win ? "w" : "l") + '">' + (m.win ? "WIN" : "LOSE") + '</span> <span class="tag ' + (m.status === "approved" ? "" : m.status === "rejected" ? "warn" : "dim") + '" style="font-size:9px;padding:2px 6px">' + STATUS_JP[m.status] + "</span></span>" +
          (m.reject_reason ? '<span class="muted" style="font-size:12px">理由: ' + esc(m.reject_reason) + "</span>" : "") +
          '<span class="sub-btns">' + (m.editable ? '<button class="chip on-gold" type="button" data-action="sub-edit" data-id="' + m.id + '" style="min-height:32px">編集する <small class="muted">あと' + editLeft(m.created_at) + "分</small></button>" : "") +
          (m.status !== "approved" ? '<button class="chip" type="button" data-action="sub-withdraw" data-id="' + m.id + '" style="min-height:32px">取り下げる</button>' : "") + "</span></div>" +
          teamFaces(picks, "ally") + '<span class="mono muted mlog-vs">VS</span>' + teamFaces(picks, "enemy") + "</li>";
      }).join("") + "</ol>";
    });
  }

  /* ----- review page (運営・管理者) + roles ----- */
  function viewReview() {
    var g = acctGate(canReview);
    return acctHead("REVIEW", "承認と運営の作業", "REVIEW") + '<section class="section tight"><div class="wrap" style="display:flex;flex-direction:column;gap:72px">' + (g ||
      (canManage() ? "<div>" + secHead("00", "SEASON", "今のシーズン") + '<p class="muted" style="font-size:13px;margin-bottom:16px">新しく登録される試合は、このシーズンで記録されます。一般の人や信頼ユーザーは変えられません。シーズンが変わったらここを更新してください。</p>' +
        '<div class="sub-actions"><label class="sr" for="rv-season">今のシーズン</label><input id="rv-season" class="rv-why" style="max-width:160px" maxlength="4" placeholder="例: S43" value="' + esc(S.curSeason || "") + '"><button class="chip on-gold" type="button" data-action="rv-season">保存する</button><span id="rv-season-msg" class="sub-msg" role="status" aria-live="polite"></span></div></div>' : "") +
      "<div>" + secHead("01", "PENDING", "承認待ち") + '<p class="muted" style="font-size:13px;margin-bottom:16px">内容が正しければ承認してください。承認した試合は15分ほどで集計に入ります。<br><span class="tag warn rv-flag">要確認</span> が付いた試合は、運営・管理者の <b>2人</b> が同じ判断をしたときに決まります(登録した本人は投票できません)。管理者は1人で確定することもできます。</p>' +
        '<div class="rv-bulk" id="rv-bulk" hidden><label class="rv-check"><input type="checkbox" id="rv-all"> すべて選ぶ</label><span id="rv-count" class="mono muted">0件を選択中</span>' +
        '<button class="chip on-gold" type="button" data-action="rv-bulk-ok">選んだ試合を承認</button><input id="rv-bulk-why" class="rv-why" maxlength="200" placeholder="却下の理由(任意)"><button class="chip" type="button" data-action="rv-bulk-ng">選んだ試合を却下</button><span id="rv-bulk-msg" class="sub-msg" role="status" aria-live="polite"></span></div>' +
        '<div id="rv-list"><p class="muted">読み込み中…</p></div></div>' +
      "<div>" + secHead("02", "APPROVED", "承認済みの試合") + '<p class="muted" style="font-size:13px;margin-bottom:16px">承認したあとで間違いに気づいたら、ここで直すか取り消してください。直しても登録した人と承認の状態は変わりません。取り消すと、承認待ちに戻すか却下にできます(却下は30日後に消えます)。</p>' +
        '<form class="rv-search" data-form="rv-search" role="search"><label class="sr" for="rv-q">承認済みの試合を探す</label><input id="rv-q" class="rv-why" placeholder="No.・戦闘番号・登録した人の名前" value="' + esc(S.rvQ || "") + '"><button class="chip" type="submit">探す</button></form>' +
        '<div id="rv-approved"><p class="muted">読み込み中…</p></div></div>' +
      (canManage() ? "<div>" + secHead("03", "MEMBERS", "メンバーと役割") + '<p class="muted" style="font-size:13px;margin-bottom:16px">一般 = 承認が必要 / 信頼ユーザー = すぐ集計に入る(要確認の試合は除く) / 運営 = 承認と、一般・信頼ユーザーの切り替えができる / 管理者 = すべて' + (AUTH.role === "manager" ? "<br>運営が変えられるのは、一般と信頼ユーザーのあいだだけです。" : "") +
        '<br><b>登録停止</b> = ログインして見ることはできるが、試合を登録できない。<b>統計から外す</b> = 試合は残したまま、勝率などの集計に入れない(様子見に)。</p><div id="rv-members"><p class="muted">読み込み中…</p></div></div>' : "") +
      "<div>" + secHead("04", "LOG", "作業の記録") + '<p class="muted" style="font-size:13px;margin-bottom:16px">運営・管理者がしたことの記録です(1年分)。修正したものは「変更点」を開くと前後が見られます。</p>' +
        '<div class="fgroup" role="group" aria-label="記録の種類">' + LOG_KINDS.map(function (k) { return '<button type="button" class="chip" data-action="rv-logf" data-k="' + k[0] + '" aria-pressed="' + ((S.logKind || "all") === k[0]) + '">' + k[1] + "</button>"; }).join("") + "</div>" +
        '<div id="rv-log" class="rv-log"><p class="muted">読み込み中…</p></div><button class="chip" type="button" data-action="rv-log-more" id="rv-log-more" hidden style="margin-top:16px">もっと見る</button></div>') + "</div></section>";
  }
  var FLAG_JP = { dup: "同じ試合がもうある", kda: "KDAが極端", short: "5分未満の試合", old: "60日以上前の試合", burst: "1時間に20件超の登録" };
  var LOG_KINDS = [["all", "すべて", null], ["review", "承認・却下・投票", ["approve", "reject", "vote_ok", "vote_ng"]], ["fix", "修正・取り消し", ["edit", "unapprove"]],
    ["member", "メンバー", ["role", "ban", "unban", "exclude", "include"]], ["content", "シーズン・記事", ["season", "hero_note", "tier", "patch_add", "patch_edit", "patch_delete", "gear_text"]]];
  function flagTags(f) { return (f || []).map(function (k) { return '<span class="tag warn rv-flag">要確認 · ' + esc(FLAG_JP[k] || k) + "</span>"; }).join(""); }
  function voteLine(m) {
    if (!m.flags || !m.flags.length) return "";
    var v = m.votes || [], ya = v.filter(function (x) { return x.approve; }), na = v.filter(function (x) { return !x.approve; });
    return '<span class="rv-votes">票: 承認 <b class="num">' + ya.length + "</b> / 却下 <b class=\"num\">" + na.length + "</b> (2票で決まります)" +
      (v.length ? " — " + v.map(function (x) { return esc(x.name || "?") + (x.approve ? " 承認" : " 却下") + (x.me ? "(あなた)" : ""); }).join("、") : "") + "</span>";
  }
  function rvBtns(m) {
    var fl = m.flags && m.flags.length, mine = fl && m.mine, my = (m.votes || []).filter(function (x) { return x.me; })[0];
    if (mine) return '<span class="rv-btns"><span class="muted" style="font-size:12px">自分が登録した要確認の試合には投票できません</span>' + (AUTH.role === "admin" ? rvForce(m.id) : "") + "</span>";
    return '<span class="rv-btns"><button class="chip on-gold" type="button" data-action="rv-ok" data-id="' + m.id + '">' + (fl ? "承認に投票" : "承認") + '</button><button class="chip" type="button" data-action="rv-ng" data-id="' + m.id + '">' + (fl ? "却下に投票" : "却下") + "</button>" +
      (my ? '<span class="muted" style="font-size:12px">あなたは「' + (my.approve ? "承認" : "却下") + "」に投票済み(変えられます)</span>" : "") + (fl && AUTH.role === "admin" ? rvForce(m.id) : "") + "</span>";
  }
  function rvForce(id) { return '<span class="rv-force"><span class="mono muted" style="font-size:9px">管理者として確定</span><button class="chip" type="button" data-action="rv-force-ok" data-id="' + id + '">承認</button><button class="chip" type="button" data-action="rv-force-ng" data-id="' + id + '">却下</button></span>'; }
  function rvInfo(m, extra) {
    return '<span class="mono muted" style="font-size:10px">No.' + m.id + " · " + esc(m.submitter || "?") + (m.submitter_role ? "(" + esc(ROLE_JP[m.submitter_role] || "") + ")" : "") + '</span><span class="num">' + esc(String(m.played_on).replace(/-/g, ".")) + '</span><span><span class="mlog-res ' + (m.win ? "w" : "l") + '">' + (m.win ? "WIN" : "LOSE") + '</span> <span class="muted" style="font-size:12px">' + esc(m.season || "") + " " + esc(m.rank || "—") + (m.stars != null ? " ★" + m.stars : "") + " · " + esc((PARTIES.filter(function (p) { return p[0] === m.party; })[0] || ["", m.party || "—"])[1]) + " · " + meDur(m.duration_sec) + "</span></span>" +
      (m.battle_id ? '<span class="mono muted" style="font-size:10px">戦闘番号 ' + esc(m.battle_id) + "</span>" : "") + (extra || "") + (m.note ? '<span class="muted" style="font-size:12px">メモ: ' + esc(m.note) + "</span>" : "");
  }
  function loadReview() {
    loadSeason(function (v) { var rs = document.getElementById("rv-season"); if (rs && !rs.value) rs.value = v; });
    loadPending(); loadApproved(); loadMembers(); S.logBefore = null; loadLog(true);
  }
  function loadPending() {
    var box = document.getElementById("rv-list"); if (!box || !SB) return;
    SB.rpc("pending_matches", { lim: 100 }).then(function (res) {
      if (!document.getElementById("rv-list")) return;
      var bulk = document.getElementById("rv-bulk");
      if (res.error) { box.innerHTML = '<p class="sub-msg bad">' + esc(/manage\.sql|flags|votes/.test(res.error.message || "") ? "データベースの準備がまだです(db/manage.sql の実行が必要です)。" : dbErr(res.error)) + "</p>"; return; }
      var rows = res.data || [];
      bulk.hidden = !rows.length; rvCount();
      if (!rows.length) { box.innerHTML = '<div class="empty" style="padding:44px 24px"><span class="tag">CLEAR</span><h3>承認待ちの試合はありません</h3></div>'; return; }
      box.innerHTML = '<ol class="mlog">' + rows.map(function (m) {
        var fl = m.flags && m.flags.length;
        return '<li class="mlog-row rv-row' + (fl ? " rv-flagged" : "") + '" id="rv-' + m.id + '"><div class="mlog-info">' + (fl && m.mine ? "" : '<label class="rv-check"><input type="checkbox" class="rv-sel" value="' + m.id + '"><span class="sr">No.' + m.id + " を選ぶ</span></label>") +
          rvInfo(m, (m.dup_of ? '<span class="tag warn" style="font-size:9px;padding:2px 6px;align-self:flex-start">No.' + m.dup_of + (m.battle_id ? " と戦闘番号か内容が同じ</span>" : " と同じ試合かも</span>") : "") + (fl ? '<span class="rv-flags">' + flagTags(m.flags) + "</span>" + voteLine(m) : "")) +
          rvBtns(m) + "</div>" +
          teamFaces(m.picks || [], "ally", { meLabel: "SENDER" }) + '<span class="mono muted mlog-vs">VS</span>' + teamFaces(m.picks || [], "enemy") + rvIcons(m.icons) + "</li>";
      }).join("") + "</ol>";
    });
  }
  function fmtDT(s) { var d = new Date(s); return isNaN(d) ? String(s) : d.getFullYear() + "." + ("0" + (d.getMonth() + 1)).slice(-2) + "." + ("0" + d.getDate()).slice(-2) + " " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2); }
  function rvSelected() { return [].map.call(document.querySelectorAll(".rv-sel:checked"), function (x) { return Number(x.value); }); }
  function rvCount() { var c = document.getElementById("rv-count"); if (c) c.textContent = rvSelected().length + "件を選択中"; }
  function reviewBulk(ok, btn) {
    var ids = rvSelected(), msg = document.getElementById("rv-bulk-msg");
    if (!ids.length) { msg.className = "sub-msg bad"; msg.textContent = "試合を選んでください"; return; }
    var why = ok ? null : (document.getElementById("rv-bulk-why").value.trim() || "内容が正しくないため");
    btn.disabled = true; msg.className = "sub-msg"; msg.textContent = ids.length + "件を処理しています…";
    SB.rpc("review_matches", { ids: ids, approve: ok, reason: why }).then(function (res) {
      btn.disabled = false;
      if (res.error) { msg.className = "sub-msg bad"; msg.textContent = dbErr(res.error); return; }
      var d = res.data || {}, parts = [];
      if (d.approved) parts.push("承認 " + d.approved + "件"); if (d.rejected) parts.push("却下 " + d.rejected + "件"); if (d.voted) parts.push("要確認に投票 " + d.voted + "件");
      if (d.skipped) parts.push("処理済み " + d.skipped + "件"); if (d.failed) parts.push("できなかったもの " + d.failed + "件(自分の要確認の試合など)");
      msg.className = "sub-msg ok"; msg.textContent = parts.join(" · ") || "変わった試合はありません";
      var all = document.getElementById("rv-all"); if (all) all.checked = false;
      loadPending(); S.logBefore = null; loadLog(true);
    });
  }

  /* ---- approved matches: correct or take back ---- */
  function loadApproved() {
    var box = document.getElementById("rv-approved"); if (!box || !SB) return;
    SB.rpc("staff_matches", { q: S.rvQ || "", lim: 30 }).then(function (res) {
      if (!document.getElementById("rv-approved")) return;
      if (res.error) { box.innerHTML = '<p class="sub-msg bad">' + esc(/staff_matches/.test(res.error.message || "") ? "データベースの準備がまだです(db/manage.sql の実行が必要です)。" : dbErr(res.error)) + "</p>"; return; }
      var rows = res.data || [];
      if (!rows.length) { box.innerHTML = '<p class="muted" style="font-size:14px">' + (S.rvQ ? "「" + esc(S.rvQ) + "」に当てはまる承認済みの試合はありません。" : "承認済みの試合はまだありません。") + "</p>"; return; }
      box.innerHTML = '<p class="muted" style="font-size:12px;margin-bottom:10px">' + (S.rvQ ? "「" + esc(S.rvQ) + "」の検索結果" : "最近承認した順に30件") + '</p><ol class="mlog">' + rows.map(function (m) {
        var extra = '<span class="mono muted" style="font-size:10px">承認: ' + esc(m.reviewer || "—") + (m.reviewed_at ? " · " + esc(fmtDT(m.reviewed_at)) : "") + "</span>" +
          (m.updated_at ? '<span class="tag dim" style="font-size:9px;padding:2px 6px;align-self:flex-start">運営が修正済み</span>' : "") + (m.flags && m.flags.length ? '<span class="rv-flags">' + flagTags(m.flags) + "</span>" : "");
        return '<li class="mlog-row rv-row" id="ra-' + m.id + '"><div class="mlog-info">' + rvInfo(m, extra) +
          '<span class="rv-btns"><button class="chip on-gold" type="button" data-action="rv-edit" data-id="' + m.id + '">直す</button><button class="chip" type="button" data-action="rv-undo" data-id="' + m.id + '">取り消す</button></span></div>' +
          teamFaces(m.picks || [], "ally", { meLabel: "SENDER" }) + '<span class="mono muted mlog-vs">VS</span>' + teamFaces(m.picks || [], "enemy") + "</li>";
      }).join("") + "</ol>";
    });
  }
  function undoAsk(id) {
    var row = document.getElementById("ra-" + id); if (!row) return;
    row.querySelector(".rv-btns").innerHTML = '<label class="sr" for="ra-to-' + id + '">戻し先</label><select id="ra-to-' + id + '" class="rv-role"><option value="pending">承認待ちに戻す</option><option value="rejected">却下にする</option></select>' +
      '<label class="sr" for="ra-why-' + id + '">理由</label><input id="ra-why-' + id + '" class="rv-why" maxlength="200" placeholder="理由(却下なら登録した人に見えます)">' +
      '<button class="chip" type="button" data-action="rv-undo-go" data-id="' + id + '">取り消す</button><button class="chip" type="button" data-action="rv-undo-cancel" data-id="' + id + '">やめる</button>';
  }
  function undoGo(id, btn) {
    var to = document.getElementById("ra-to-" + id).value, why = document.getElementById("ra-why-" + id).value.trim();
    btn.disabled = true;
    SB.rpc("unapprove_match", { match_id: Number(id), to_status: to, reason: why || null }).then(function (res) {
      var row = document.getElementById("ra-" + id); btn.disabled = false;
      if (res.error) { var em = document.createElement("span"); em.className = "sub-msg bad"; em.textContent = dbErr(res.error); row.querySelector(".mlog-info").appendChild(em); return; }
      row.classList.add("rv-done"); row.querySelector(".rv-btns").innerHTML = '<span class="tag warn">' + (to === "pending" ? "承認待ちに戻しました" : "却下にしました") + "</span>";
      loadPending(); S.logBefore = null; loadLog(true);
    });
  }
  function staffEdit(id, btn) {
    btn.disabled = true;
    SB.rpc("staff_match", { match_id: Number(id) }).then(function (res) {
      btn.disabled = false;
      if (res.error) { var em = document.createElement("span"); em.className = "sub-msg bad"; em.textContent = dbErr(res.error); btn.parentNode.appendChild(em); return; }
      S.staffEdit = res.data; go("#submit");
    });
  }

  /* ---- members: roles, 登録停止, 統計から外す ---- */
  function loadMembers() {
    var mb = document.getElementById("rv-members"); if (!mb || !SB) return;
    SB.rpc("list_profiles").then(function (res) {
      if (!document.getElementById("rv-members")) return;
      if (res.error) { mb.innerHTML = '<p class="sub-msg bad">' + esc(dbErr(res.error)) + "</p>"; return; }
      S.members = (res.data || []).slice().reverse();   /* newest first */
      var f = S.memF || "all";
      mb.innerHTML = '<div class="mem-tools"><label class="sr" for="mem-q">名前で探す</label><input id="mem-q" class="rv-why" type="search" placeholder="名前で探す" autocomplete="off" value="' + esc(S.memQ || "") + '">' +
        '<div class="fgroup" role="group" aria-label="役割で絞り込む">' + MEM_F.map(function (o) { return '<button type="button" class="chip" data-action="mem-f" data-f="' + o[0] + '" aria-pressed="' + (f === o[0]) + '">' + o[1] + "</button>"; }).join("") + "</div></div>" +
        '<p class="mono muted" id="mem-count" style="font-size:11px;margin:12px 0 8px"></p><div id="mem-table"></div>';
      var q = document.getElementById("mem-q");
      q.oninput = function () { S.memQ = q.value; drawMembers(); };
      drawMembers();
    });
  }
  var MEM_F = [["all", "すべて"], ["member", "一般"], ["trusted", "信頼ユーザー"], ["manager", "運営"], ["admin", "管理者"], ["banned", "登録停止中"], ["excluded", "統計から外した人"]], MEM_MAX = 100;
  function drawMembers() {
    var box = document.getElementById("mem-table"), cnt = document.getElementById("mem-count"); if (!box) return;
    var all = S.members || [], f = S.memF || "all", q = (S.memQ || "").trim().toLowerCase();
    var list = all.filter(function (p) {
      if (f === "banned" ? !p.banned : f === "excluded" ? !p.stats_excluded : f !== "all" && p.role !== f) return false;
      return !q || String(p.name || "").toLowerCase().indexOf(q) >= 0;
    });
    cnt.textContent = "全 " + all.length + " 人" + (list.length !== all.length ? " · 当てはまる人 " + list.length + " 人" : "") + (list.length > MEM_MAX ? " · 上から " + MEM_MAX + " 人を表示(名前で絞り込んでください)" : "") + " · 登録日の新しい順";
    if (!list.length) { box.innerHTML = '<p class="muted" style="font-size:14px">当てはまる人はいません。</p>'; return; }
    var hasFlags = all.some(function (p) { return "banned" in p; });
    box.innerHTML = meTable(["名前", "役割", "承認済み", "承認待ち"].concat(hasFlags ? ["登録停止", "統計から外す"] : []).concat(["登録日"]), list.slice(0, MEM_MAX).map(function (p) {
      var self = AUTH.user && p.id === AUTH.user.id, locked = self || (AUTH.role === "manager" && ROLE_LOW.indexOf(p.role) < 0);
      var opts = AUTH.role === "admin" ? Object.keys(ROLE_JP) : ROLE_LOW;
      var sw = function (cls, on, label) { return locked ? '<span class="' + (on ? "sub-msg bad" : "muted") + '" style="font-size:12px">' + (on ? "はい" : "—") + "</span>" : '<label class="rv-switch"><input type="checkbox" class="' + cls + '" data-uid="' + p.id + '"' + (on ? " checked" : "") + '><span class="sr">' + esc(p.name) + " を" + label + "</span><i></i></label>"; };
      return '<tr' + (p.banned ? ' class="rv-banned"' : "") + '><td><span class="mem-name">' + avatarHtml(p.avatar || "", p.discord_avatar || "", p.name, "sm") + esc(p.name || "(名前なし)") + "</span>" + (self ? ' <span class="tag dim me-thin">あなた</span>' : "") + "</td><td>" +
        (locked ? '<span class="muted">' + esc(ROLE_JP[p.role] || p.role) + "</span>" :
        '<select class="rv-role" data-uid="' + p.id + '" aria-label="' + esc(p.name) + ' の役割">' + opts.map(function (k) { return '<option value="' + k + '"' + (k === p.role ? " selected" : "") + ">" + ROLE_JP[k] + "</option>"; }).join("") + "</select>") + '</td><td class="num">' + p.approved + '</td><td class="num">' + p.pending + "</td>" +
        (hasFlags ? "<td>" + sw("rv-ban", p.banned, "登録停止にする") + "</td><td>" + sw("rv-excl", p.stats_excluded, "統計から外す") + "</td>" : "") +
        '<td class="num muted">' + esc(String(p.created_at).slice(0, 10).replace(/-/g, ".")) + "</td></tr>";
    }));
  }

  /* ---- 作業の記録 ---- */
  function loadLog(reset) {
    var box = document.getElementById("rv-log"), more = document.getElementById("rv-log-more"); if (!box || !SB) return;
    if (reset) S.logBefore = null;
    var kind = (LOG_KINDS.filter(function (k) { return k[0] === (S.logKind || "all"); })[0] || LOG_KINDS[0])[2];
    SB.rpc("audit_list", { lim: 50, before: S.logBefore, kinds: kind }).then(function (res) {
      if (!document.getElementById("rv-log")) return;
      if (res.error) { box.innerHTML = '<p class="sub-msg bad">' + esc(/audit_list/.test(res.error.message || "") ? "データベースの準備がまだです(db/manage.sql の実行が必要です)。" : dbErr(res.error)) + "</p>"; return; }
      var rows = res.data || [];
      if (reset) { box.innerHTML = ""; S.logDay = null; }
      if (!rows.length && reset) box.innerHTML = '<p class="muted" style="font-size:14px">記録はまだありません。</p>';
      var html = "";
      rows.forEach(function (e) {
        var d = new Date(e.at), day = d.getFullYear() + "." + ("0" + (d.getMonth() + 1)).slice(-2) + "." + ("0" + d.getDate()).slice(-2);
        if (day !== S.logDay) { html += '<h4 class="rv-log-day mono">' + day + "</h4>"; S.logDay = day; }
        html += logRow(e, ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2));
      });
      box.insertAdjacentHTML("beforeend", html);
      if (rows.length) S.logBefore = rows[rows.length - 1].id;
      more.hidden = rows.length < 50;
    });
  }
  var LOG_FIELD = { played_on: "日付", season: "シーズン", rank: "ランク", stars: "星", party: "パーティ", win: "勝敗", duration_sec: "試合時間", note: "メモ", battle_id: "戦闘番号" };
  var NOTE_FIELD = { strengths: "長所", weaknesses: "短所", playbook: "立ち回り" };
  function logVal(k, v) {
    if (v == null || v === "") return "(なし)";
    if (k === "win") return v ? "勝ち" : "負け";
    if (k === "duration_sec") return meDur(v);
    if (k === "party") return (PARTIES.filter(function (p) { return p[0] === v; })[0] || ["", v])[1];
    return String(v);
  }
  function editDiff(b, a) {
    var out = [];
    b = b || {}; a = a || {};
    Object.keys(LOG_FIELD).forEach(function (k) { if (JSON.stringify(b[k]) !== JSON.stringify(a[k])) out.push([LOG_FIELD[k], logVal(k, b[k]), logVal(k, a[k])]); });
    var bp = b.picks || {}, ap = a.picks || {};
    ["ally", "enemy"].forEach(function (side) { LANE_ORDER.forEach(function (L) {
      var k = side + ":" + L, x = bp[k] || {}, y = ap[k] || {}, nm = (side === "ally" ? "味方 " : "敵 ") + L;
      var hn = function (id) { return id && CH[id] ? CH[id].name : id || "(なし)"; }, kda = function (p) { return p.k == null ? "(なし)" : p.k + "/" + p.d + "/" + p.a; };
      if (x.hero !== y.hero) out.push([nm + " のヒーロー", hn(x.hero), hn(y.hero)]);
      if (kda(x) !== kda(y)) out.push([nm + " のKDA", kda(x), kda(y)]);
      if (JSON.stringify(x.items || null) !== JSON.stringify(y.items || null)) out.push([nm + " の装備", (x.items || []).length + "個", (y.items || []).length + "個"]);
      if (!!x.me !== !!y.me && side === "ally") out.push(["登録した人のレーン", x.me ? L + " だった" : "—", y.me ? L + " に" : "—"]);
    }); });
    return out;
  }
  function logRow(e, hm) {
    var d = e.detail || {}, no = e.match_id ? '<b class="num">No.' + e.match_id + "</b>" : "", who = e.target_name ? "<b>" + esc(e.target_name) + "</b>" : "", txt = "", more = "";
    var hero = function (id) { return id && CH[id] ? esc(CH[id].name) : esc(id || "?"); };
    switch (e.action) {
      case "approve": txt = no + " を承認" + (d.forced ? "(管理者が確定)" : d.votes && d.votes.length ? "(" + d.votes.filter(function (v) { return v.approve; }).length + "票で決定)" : ""); break;
      case "reject": txt = no + " を却下" + (d.forced ? "(管理者が確定)" : d.votes && d.votes.length ? "(" + d.votes.filter(function (v) { return !v.approve; }).length + "票で決定)" : "") + (d.reason ? ' <span class="muted">— ' + esc(d.reason) + "</span>" : ""); break;
      case "vote_ok": txt = no + " に「承認」の票"; break;
      case "vote_ng": txt = no + " に「却下」の票" + (d.reason ? ' <span class="muted">— ' + esc(d.reason) + "</span>" : ""); break;
      case "edit":
        var df = editDiff(d.before, d.after);
        txt = no + " を修正(" + (df.length ? df.length + "か所" : "変更なし") + ")";
        if (df.length) more = '<details class="rv-diff"><summary>変更点</summary><table>' + df.map(function (r) { return "<tr><th>" + esc(r[0]) + '</th><td class="was">' + esc(r[1]) + '</td><td aria-hidden="true">→</td><td>' + esc(r[2]) + "</td></tr>"; }).join("") + "</table></details>";
        break;
      case "unapprove": txt = no + " の承認を取り消し(" + (d.to === "rejected" ? "却下に" : "承認待ちに戻す") + ")" + (d.reason ? ' <span class="muted">— ' + esc(d.reason) + "</span>" : ""); break;
      case "role": txt = who + " の役割を " + esc(ROLE_JP[d.from] || d.from) + " → " + esc(ROLE_JP[d.to] || d.to); break;
      case "ban": txt = who + " を登録停止に"; break;
      case "unban": txt = who + " の登録停止を解除"; break;
      case "exclude": txt = who + " を統計から外した"; break;
      case "include": txt = who + " を統計に戻した"; break;
      case "season": txt = "今のシーズンを " + esc(d.from || "—") + " → " + esc(d.to); break;
      case "hero_note":
        var ks = Object.keys(d.changes || {});
        txt = hero(d.hero) + " の解説を更新(" + ks.map(function (k) { return NOTE_FIELD[k] || k; }).join("・") + ")";
        more = '<details class="rv-diff"><summary>変更点</summary>' + ks.map(function (k) { var c = d.changes[k]; return '<div class="rv-note-diff"><span class="mono gold" style="font-size:10px">' + (NOTE_FIELD[k] || k) + '</span><p class="was">' + (esc(c.before || "") || "(なし)") + "</p><p>" + (esc(c.after || "") || "(なし)") + "</p></div>"; }).join("") + "</details>";
        break;
      case "tier": txt = hero(d.hero) + "(" + esc(d.lane) + ")のTIERを " + esc(d.from || "自動") + " → " + esc(d.to || "自動"); break;
      case "patch_add": txt = "パッチ " + esc(d.version || "") + " を追加"; break;
      case "patch_edit": txt = "パッチ " + esc(d.version || "") + " を更新"; break;
      case "patch_delete": txt = "パッチ " + esc(d.version || "") + " を削除"; break;
      case "gear_text":
        var go = gearObj(d.kind, d.id), gf = ((GT_FIELDS[d.kind] || []).filter(function (f) { return f[0] === d.field; })[0] || [0, d.field])[1];
        txt = '<a href="' + (d.kind === "item" ? "#item-" + esc(d.id) : d.kind === "spell" ? "#spells" : "#emblem") + '">' + esc(go ? go.name : d.id) + "</a> の" + esc(String(gf).replace(/\(.*$/, "")) + "を" + (d.after == null ? "元の文に戻した" : "書き換え");
        more = '<details class="rv-diff"><summary>変更点</summary><div class="rv-note-diff"><p class="was">' + (esc(d.before || "") || "(元の文)") + "</p><p>" + (esc(d.after || "") || "(元の文)") + "</p></div></details>";
        break;
      default: txt = esc(e.action);
    }
    return '<div class="rv-log-row"><span class="mono muted num">' + hm + '</span><span class="rv-log-who">' + esc(e.actor_name || "?") + (e.actor_role ? ' <span class="tag dim me-thin">' + esc(ROLE_JP[e.actor_role] || e.actor_role) + "</span>" : "") + '</span><span class="rv-log-what"><span>' + txt + "</span>" + more + "</span></div>";
  }
  function reviewAsk(id, force) {
    var row = document.getElementById("rv-" + id); if (!row) return;
    row.querySelector(".rv-btns").innerHTML = '<label class="sr" for="rv-why-' + id + '">却下する理由</label><input id="rv-why-' + id + '" class="rv-why" maxlength="200" placeholder="却下する理由(登録した人に見えます)" value="内容が正しくないため">' +
      '<button class="chip" type="button" data-action="rv-ng-go" data-id="' + id + '"' + (force ? ' data-force="1"' : "") + ">" + (force ? "管理者として却下" : "却下する") + '</button><button class="chip" type="button" data-action="rv-ng-cancel" data-id="' + id + '">やめる</button>';
    var w = document.getElementById("rv-why-" + id); if (w) { w.focus(); w.select(); }
  }
  function reviewOne(id, ok, btn, force) {
    var reason = null;
    if (!ok) { var w = document.getElementById("rv-why-" + id); reason = w ? w.value.trim() : ""; }
    btn.disabled = true;
    SB.rpc(force ? "decide_match" : "review_match", { match_id: Number(id), approve: ok, reason: reason }).then(function (res) {
      var row = document.getElementById("rv-" + id);
      if (res.error) { btn.disabled = false; if (row) { var em = row.querySelector(".rv-err") || row.querySelector(".mlog-info").appendChild(document.createElement("span")); em.className = "sub-msg bad rv-err"; em.textContent = dbErr(res.error); } return; }
      var r = res.data;
      if (r === "voted") { loadPending(); S.logBefore = null; loadLog(true); return; }
      if (row) { row.classList.add("rv-done"); var cb = row.querySelector(".rv-sel"); if (cb) { cb.checked = false; cb.disabled = true; } row.querySelector(".rv-btns").innerHTML = '<span class="tag' + (ok ? "" : " warn") + '">' + (ok ? "承認しました" : "却下しました") + "</span>"; rvCount(); }
      S.logBefore = null; loadLog(true);
    });
  }
  /* crops from the screenshot with the name the submitter gave them: they become references when the match is approved */
  function rvIcons(icons) {
    var list = (icons || []).filter(function (x) { return x.kind === "hero" || x.kind === "item"; });
    if (!list.length) return "";
    return '<div class="rv-icons"><span class="mono muted" style="font-size:9px">スクショの切り抜き · 承認すると次からの読み取りに使われます</span><div>' + list.map(function (x) {
      var name = x.kind === "hero" ? (CH[x.label] ? CH[x.label].name : x.label) : itemName(x.label);
      return '<span class="rv-icon"><img src="' + esc(x.img) + '" alt=""><span>' + esc(name) + "</span></span>";
    }).join("") + "</div></div>";
  }

  /* ---------------- motion: embers in the page headers, depth that follows the pointer, a veil between pages ----------------
     All of it is skipped for people who ask their device for less motion. */
  var FX = { reduce: window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches, cv: [], raf: 0, io: null, last: 0 };
  function mountEmbers() {
    FX.cv = [];
    if (FX.reduce) return;
    if (!FX.io && window.IntersectionObserver) FX.io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.target._emb) e.target._emb.on = e.isIntersecting; }); kickEmbers(); });
    document.querySelectorAll(".phead .atmo, .hero .atmo, .dhero .atmo").forEach(function (a) {
      var host = a.parentNode, cv = document.createElement("canvas"); cv.className = "embers"; cv.setAttribute("aria-hidden", "true");
      host.insertBefore(cv, a.nextSibling);
      var st = { cv: cv, ctx: cv.getContext("2d"), ps: [], on: true, w: 0, h: 0 }; cv._emb = st; FX.cv.push(st);
      if (FX.io) FX.io.observe(cv);
    });
    kickEmbers();
  }
  /* kinds: 0 ember (rises and sways) · 1 glint (a gold star that twinkles where it is) · 2 bokeh (a large soft light drifting slowly) */
  function emberNew(st, anywhere, kind) {
    if (kind == null) { var q = Math.random(); kind = q < .045 ? 1 : q < .13 ? 2 : 0; }
    var gold = Math.random() < .78;
    var p = { k: kind, x: Math.random() * st.w, y: anywhere || kind ? Math.random() * st.h : st.h + 6, vy: -(14 + Math.random() * 40), vx: (Math.random() - .5) * 10,
      r: .7 + Math.random() * Math.random() * 2.8, ph: Math.random() * 6.28, sw: 6 + Math.random() * 18, life: 0, max: 4 + Math.random() * 7,
      c: gold ? [240, 196 + Math.random() * 30, 128] : [244, 128 + Math.random() * 40, 64] };
    if (kind === 1) { p.vy = -(2 + Math.random() * 4); p.vx = 0; p.sw = 2; p.r = 1.1 + Math.random() * 1.5; p.max = 2.5 + Math.random() * 3; p.c = [255, 226, 160]; }
    if (kind === 2) { p.vy = -(3 + Math.random() * 6); p.vx = (Math.random() - .5) * 6; p.sw = 10; p.r = 14 + Math.random() * 26; p.max = 8 + Math.random() * 8; p.c = [214, 172, 104]; }
    return p;
  }
  function emberSize(st) {
    var r = st.cv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    if (!r.width) return false;
    if (Math.abs(r.width - st.w) > 1 || Math.abs(r.height - st.h) > 1) {
      st.w = r.width; st.h = r.height; st.cv.width = Math.round(r.width * dpr); st.cv.height = Math.round(r.height * dpr); st.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.round(Math.max(22, Math.min(90, r.width * r.height / 10000)) * (r.width < 600 ? .6 : 1));
      st.ps = []; for (var i = 0; i < n; i++) st.ps.push(emberNew(st, true));
    }
    return true;
  }
  function kickEmbers() { if (!FX.raf && FX.cv.length && !document.hidden) { FX.last = performance.now(); FX.raf = requestAnimationFrame(stepEmbers); } }
  function stepEmbers(now) {
    FX.raf = 0;
    var dt = Math.min(.05, (now - FX.last) / 1000), any = false; FX.last = now;
    FX.cv.forEach(function (st) {
      if (!st.on || !st.cv.isConnected || !emberSize(st)) return;
      any = true;
      var g = st.ctx; g.clearRect(0, 0, st.w, st.h); g.globalCompositeOperation = "lighter";
      st.ps.forEach(function (p, i) {
        p.life += dt; p.ph += dt * 1.6;
        p.x += (p.vx + Math.sin(p.ph) * p.sw) * dt; p.y += p.vy * dt;
        if (p.life > p.max || p.y < -10 || p.x < -20 || p.x > st.w + 20) { st.ps[i] = emberNew(st, false); return; }
        var c = p.c, rgb = "rgba(" + c[0] + "," + (c[1] | 0) + "," + c[2] + ",";
        if (p.k === 2) {   /* bokeh */
          var fb = Math.min(1, p.life / 2) * Math.min(1, (p.max - p.life) / 2.5) * .07, gr = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
          gr.addColorStop(0, rgb + fb.toFixed(3) + ")"); gr.addColorStop(.7, rgb + (fb * .45).toFixed(3) + ")"); gr.addColorStop(1, rgb + "0)");
          g.fillStyle = gr; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.283); g.fill(); return;
        }
        if (p.k === 1) {   /* glint: a four-pointed star that swells and fades */
          var tw = Math.sin(Math.min(1, p.life / p.max) * Math.PI), L = p.r * (2 + 3.6 * tw), a = .85 * tw;
          g.strokeStyle = rgb + a.toFixed(3) + ")"; g.lineWidth = .8; g.beginPath(); g.moveTo(p.x - L, p.y); g.lineTo(p.x + L, p.y); g.moveTo(p.x, p.y - L * 1.3); g.lineTo(p.x, p.y + L * 1.3); g.stroke();
          g.strokeStyle = rgb + (a * .45).toFixed(3) + ")"; g.beginPath(); g.moveTo(p.x - L * .45, p.y - L * .45); g.lineTo(p.x + L * .45, p.y + L * .45); g.moveTo(p.x + L * .45, p.y - L * .45); g.lineTo(p.x - L * .45, p.y + L * .45); g.stroke();
          g.fillStyle = rgb + (.16 * tw).toFixed(3) + ")"; g.beginPath(); g.arc(p.x, p.y, L * .9, 0, 6.283); g.fill();
          g.fillStyle = "rgba(255,248,230," + a.toFixed(3) + ")"; g.beginPath(); g.arc(p.x, p.y, p.r * .7, 0, 6.283); g.fill(); return;
        }
        var fade = Math.min(1, p.life / .8) * Math.min(1, (p.max - p.life) / 1.6) * (.65 + .35 * Math.sin(p.ph * 3.1));
        if (p.r > 1.8) { g.strokeStyle = rgb + (.22 * fade).toFixed(3) + ")"; g.lineWidth = p.r * .8; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - p.vx * .12, p.y - p.vy * .12); g.stroke(); }   /* a short trail */
        g.fillStyle = rgb + (.12 * fade).toFixed(3) + ")"; g.beginPath(); g.arc(p.x, p.y, p.r * 4.5, 0, 6.283); g.fill();
        g.fillStyle = rgb + (.95 * fade).toFixed(3) + ")"; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 6.283); g.fill();
      });
    });
    if (any && !document.hidden) FX.raf = requestAnimationFrame(stepEmbers);
  }
  document.addEventListener("visibilitychange", kickEmbers);
  /* depth: the layers of the header move a little with the pointer (or the phone's tilt, where the browser allows it without asking) */
  (function () {
    if (FX.reduce) return;
    var tx = 0, ty = 0, pend = 0, root = document.documentElement;
    function put() { pend = 0; root.style.setProperty("--mx", (tx * -22).toFixed(1) + "px"); root.style.setProperty("--my", (ty * -12).toFixed(1) + "px"); }
    function aim(x, y) { tx = Math.max(-1, Math.min(1, x)); ty = Math.max(-1, Math.min(1, y)); if (!pend) pend = requestAnimationFrame(put); }
    if (window.matchMedia && matchMedia("(pointer: fine)").matches) {
      window.addEventListener("pointermove", function (e) { aim(e.clientX / innerWidth * 2 - 1, e.clientY / innerHeight * 2 - 1); }, { passive: true });
    } else if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission !== "function") {
      window.addEventListener("deviceorientation", function (e) { if (e.gamma == null) return; aim(e.gamma / 25, (e.beta - 45) / 30); }, { passive: true });
    }
  })();
  /* the veil: a dark panel with a gold edge sweeps across while the next page is drawn */
  function veilGo(draw) {
    var v = document.getElementById("veil-wipe");
    if (FX.reduce || !v || !document.getElementById("curtain") || !document.getElementById("curtain").classList.contains("done")) { draw(); return; }
    clearTimeout(FX.vt1); clearTimeout(FX.vt2); clearTimeout(FX.vt3);
    v.className = "veil-wipe in";
    FX.vt1 = setTimeout(function () {
      draw();
      v.className = "veil-wipe in hold";
      FX.vt2 = setTimeout(function () {
        v.className = "veil-wipe out";
        FX.vt3 = setTimeout(function () { v.className = "veil-wipe"; }, 620);
      }, 180);
    }, 360);
  }

  /* ---------------- layout ---------------- */
  var NAV = [["home", "HOME"], ["me", "MY PAGE"], ["champions", "CHAMPIONS"], ["equipment", "EQUIPMENT"], ["matchup", "MATCHUP LAB"], ["patch", "PATCH &amp; META"], ["lore", "LORE ARCHIVE"]];
  function header(cur) {
    return '<header class="site-header"><div class="wrap"><a class="logo" href="#home">' + LOGO + "<span>VEIL</span></a>" +
      '<nav class="nav" id="main-nav" aria-label="メインナビゲーション">' + NAV.map(function (n) { return '<a href="#' + n[0] + '"' + (cur === n[0] ? ' aria-current="page"' : "") + ">" + n[1] + "</a>"; }).join("") + "</nav>" +
      '<div class="head-tools">' + accountBtn(cur) + '<a class="icon-btn' + (cur === "roulette" ? " on" : "") + '" href="#roulette" aria-label="ヒーロールーレット" title="ヒーロールーレット">' + IC.dice + '</a><button class="icon-btn" type="button" data-action="open-search" aria-label="サイト内検索">' + IC.search + '</button><button class="icon-btn menu-btn" type="button" data-action="menu" aria-label="メニューを開く" aria-expanded="false" aria-controls="main-nav">' + IC.menu + "</button></div></div></header>";
  }
  /* ---------------- ad slots (ads.js) ----------------
     Shown only when ads.js has a client id and a slot id for this place; ?adpreview shows empty frames to check the layout. */
  var ADS = window.VEIL_ADS || {}, AD_PREVIEW = /[?&]adpreview\b/.test(location.search), adsLoaded = false;
  var AD_NAMES = { "home-interlude": "A · HOME", "champion-data": "C · HERO" };
  function adSlot(id, kind) {
    var unit = ADS.client && ADS.slots && ADS.slots[id];
    if (!unit && !AD_PREVIEW) return "";
    var body = unit ? '<ins class="adsbygoogle" style="display:block" data-ad-client="' + esc(ADS.client) + '" data-ad-slot="' + esc(unit) + '" data-ad-format="' + (kind === "wide" ? "horizontal" : "auto") + '" data-full-width-responsive="true"></ins>'
      : '<span class="mono muted" style="font-size:10px">AD SLOT ' + esc(AD_NAMES[id] || id) + '</span><span class="muted" style="font-size:12px">広告枠(プレビュー)</span>';
    return '<aside class="adslot ' + (kind || "box") + (unit ? "" : " preview") + '" aria-label="広告"><span class="adslot-label mono">SPONSORED · 広告</span><div class="adslot-body">' + body + "</div></aside>";
  }
  function fillAds() {
    var units = document.querySelectorAll(".adslot ins.adsbygoogle:not([data-adsbygoogle-status])");
    if (!units.length) return;
    if (!adsLoaded) {
      adsLoaded = true;
      var s = document.createElement("script"); s.async = true; s.crossOrigin = "anonymous";
      s.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + encodeURIComponent(ADS.client);
      document.head.appendChild(s);
    }
    units.forEach(function () { try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) { /* ad blocked or not ready */ } });
  }

  function footer() {
    return '<footer class="site-footer"><div class="wrap top"><div style="display:flex;flex-direction:column;gap:16px"><a class="logo" href="#home">' + LOGO + "<span>VEIL</span></a>" +
      '<p class="disclaimer">本サイトはMoontonとは無関係の非公式ファンサイトです。Mobile Legends: Bang Bang、ヒーロー名、アートワーク等の権利はMoontonに帰属します。勝率などの数値は、VEILに登録されて承認された試合記録から集計しています。</p></div>' +
      '<div class="cols"><div class="col"><span class="mono gold">DATABASE</span><a href="#me">マイページ</a><a href="#champions">キャラクター図鑑</a><a href="#roulette">ヒーロールーレット</a><a href="#equipment">装備一覧</a><a href="#matchup">対面攻略</a><a href="#patch">パッチ・メタ</a></div><div class="col"><span class="mono gold">ARCHIVE</span><a href="#lore">世界観</a><a href="#home">HOME</a></div></div></div>' +
      '<div class="wrap bottom"><span class="mono muted">EVERY BATTLE LEAVES A TRACE.</span><span class="mono muted">VEIL · PROTOTYPE v0.2</span></div></footer>';
  }

  /* ---------------- router ---------------- */
  function route() {
    var h = (location.hash || "").replace(/^#/, "") || "home";
    var m;
    if (h === "home") return { nav: "home", html: viewHome() };
    if (h === "champions") return { nav: "champions", html: viewChampions() };
    if (h === "roulette") return { nav: "roulette", html: viewRoulette() };
    if (h === "me") return { nav: "me", html: viewMe(), title: "MY PAGE — VEIL" };
    if (h === "account") return { nav: "account", html: viewAccount(), title: "ACCOUNT — VEIL" };
    if (h === "submit") return { nav: "account", html: viewSubmit(), title: "SUBMIT — VEIL", after: loadMySubs };
    if (h === "review") return { nav: "account", html: viewReview(), title: "REVIEW — VEIL", after: loadReview };
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
    if (r.after && dbOn() && AUTH.user) setTimeout(r.after, 0);
    if (dbOn()) routeHeroes().forEach(ensureHero);
    fillAds();
    mountCharts(keepScroll);
    mountEmbers();
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
    if (act === "szoom") { S.schZoom = S.schZoom || {}; S.schZoom[t.getAttribute("data-cid")] = t.getAttribute("data-z"); schRedraw(t.getAttribute("data-cid")); return; }
    if (act === "mseason") { S.meSeason = t.getAttribute("data-s"); schRedraw("me-season"); return; }
    if (act === "artnext") { var aid = t.getAttribute("data-id"), pn = artPool(CH[aid]).length; S.artSel = S.artSel || {}; S.artSel[aid] = ((S.artSel[aid] || 0) + 1) % pn;
      var A2 = artOf(CH[aid]), pos2 = A2.pos || "50% 30%";
      document.querySelectorAll(".dbg img, .dbody-art").forEach(function (im) { im.src = A2.img; im.style.objectPosition = pos2; });
      var cr = document.querySelector(".dbg-credit"); if (cr) cr.textContent = (A2.name ? A2.name + " · " : "") + (A2.credit || "© MOONTON");
      t.textContent = "SKIN " + (A2.i + 1) + " / " + A2.n + " ↻"; return; }
    if (act === "login") { S.loginErr = ""; login(); return; }
    if (act === "logout") { logout(); return; }
    if (act === "sub-edit") { startEdit(t.getAttribute("data-id")); return; }
    if (act === "sub-edit-cancel") {
      endEdit(); var ff = document.getElementById("sub-form");
      if (ff) { ff.querySelectorAll(".sub-hero, [data-kda], #f-note, #f-dur, #f-battle, #f-stars").forEach(function (x) { x.value = ""; if (x.classList.contains("sub-hero")) subFace(x); });
        ff.querySelectorAll('input[name="f-win"], input[name="f-me"]').forEach(function (x) { x.checked = false; });
        ff.querySelectorAll(".sub-items").forEach(function (b) { b.hidden = true; b.innerHTML = ""; }); }
      return;
    }
    if (act === "av-set") { saveAvatar(t.getAttribute("data-v") || ""); return; }
    if (act === "av-hero") { var avi = document.getElementById("av-hero"), avh = avi && heroFromInput(avi.value); if (!avh) { var am = document.getElementById("av-msg"); if (am) { am.className = "sub-msg bad"; am.textContent = "ヒーロー名が見つかりません。候補から選んでください。"; } return; } saveAvatar("hero:" + avh); return; }
    if (act === "sub-withdraw") { t.disabled = true; SB.rpc("withdraw_match", { match_id: Number(t.getAttribute("data-id")) }).then(function (res) { if (res.error) { t.disabled = false; t.textContent = dbErr(res.error); } else loadMySubs(); }); return; }
    if (act === "rv-season") {
      var sv = document.getElementById("rv-season"), sm = document.getElementById("rv-season-msg"), val = (sv.value || "").trim().toUpperCase();
      if (!/^S\d{1,3}$/.test(val)) { sm.className = "sub-msg bad"; sm.textContent = "S43 のように入れてください"; return; }
      t.disabled = true;
      SB.rpc("set_current_season", { season: val }).then(function (res) {
        t.disabled = false;
        if (res.error) { sm.className = "sub-msg bad"; sm.textContent = dbErr(res.error); return; }
        S.curSeason = val; sv.value = val; sm.className = "sub-msg ok"; sm.textContent = "今のシーズンを " + val + " にしました";
      });
      return; }
    if (act === "rv-ok") { reviewOne(t.getAttribute("data-id"), true, t); return; }
    if (act === "rv-ng") { reviewAsk(t.getAttribute("data-id")); return; }
    if (act === "rv-force-ok") { reviewOne(t.getAttribute("data-id"), true, t, true); return; }
    if (act === "rv-force-ng") { reviewAsk(t.getAttribute("data-id"), true); return; }
    if (act === "rv-ng-go") { reviewOne(t.getAttribute("data-id"), false, t, t.getAttribute("data-force") === "1"); return; }
    if (act === "rv-ng-cancel") { loadPending(); return; }
    if (act === "rv-bulk-ok" || act === "rv-bulk-ng") { reviewBulk(act === "rv-bulk-ok", t); return; }
    if (act === "rv-edit") { staffEdit(t.getAttribute("data-id"), t); return; }
    if (act === "rv-undo") { undoAsk(t.getAttribute("data-id")); return; }
    if (act === "rv-undo-go") { undoGo(t.getAttribute("data-id"), t); return; }
    if (act === "rv-undo-cancel") { loadApproved(); return; }
    if (act === "rv-logf") { S.logKind = t.getAttribute("data-k"); document.querySelectorAll('[data-action="rv-logf"]').forEach(function (b) { b.setAttribute("aria-pressed", String(b === t)); }); loadLog(true); return; }
    if (act === "rv-log-more") { loadLog(false); return; }
    if (act === "mem-f") { S.memF = t.getAttribute("data-f"); document.querySelectorAll('[data-action="mem-f"]').forEach(function (b) { b.setAttribute("aria-pressed", String(b === t)); }); drawMembers(); return; }
    if (act === "hn-edit") { var hb = document.getElementById(t.getAttribute("data-f") === "pc" ? "hn-pc" : "hn-pb"); if (hb) { hb.innerHTML = heroNoteEditor(t.getAttribute("data-f"), t.getAttribute("data-hero")); var ta0 = hb.querySelector("textarea"); if (ta0) ta0.focus(); } return; }
    if (act === "hn-save") { heroNoteSave(t); return; }
    if (act === "gt-edit") { var gb = document.getElementById("gt-" + t.getAttribute("data-kind") + "-" + t.getAttribute("data-id")); if (gb) { gb.innerHTML = gtEditor(t.getAttribute("data-kind"), t.getAttribute("data-id")); var gta = gb.querySelector("textarea"); if (gta) gta.focus(); } return; }
    if (act === "gt-save" || act === "gt-reset") { gtSave(t, act === "gt-reset"); return; }
    if (act === "gt-cancel") { render(true); return; }
    if (act === "hn-cancel") { render(true); return; }
    if (act === "tl-lane") { S.tierLane = t.getAttribute("data-l"); document.getElementById("tl-box").innerHTML = tierListBox(); return; }
    if (act === "pt-new") { document.getElementById("pt-new-box").innerHTML = patchForm(); return; }
    if (act === "pt-edit") { var pp = CT.patches.filter(function (x) { return String(x.id) === t.getAttribute("data-id"); })[0], pc = document.getElementById("pt-" + t.getAttribute("data-id")); if (pp && pc) pc.innerHTML = patchForm(pp); return; }
    if (act === "pt-cancel") { document.getElementById("pt-box").innerHTML = patchListBox(); return; }
    if (act === "pt-add-ch") { t.previousElementSibling.insertAdjacentHTML("beforeend", changeRow()); var nr = t.previousElementSibling.lastElementChild.querySelector("input"); if (nr) nr.focus(); return; }
    if (act === "pt-rm-ch") { t.closest(".pt-ch").remove(); return; }
    if (act === "pt-del") { t.parentNode.innerHTML = '<span class="muted" style="font-size:12px">本当に削除しますか?</span><button class="chip" type="button" data-action="pt-del-go" data-id="' + t.getAttribute("data-id") + '">削除する</button><button class="chip" type="button" data-action="pt-cancel">やめる</button>'; return; }
    if (act === "pt-del-go") { t.disabled = true; SB.rpc("delete_patch", { id: Number(t.getAttribute("data-id")) }).then(function (res) { if (res.error) { t.disabled = false; t.textContent = dbErr(res.error); return; } loadContent(); }); return; }
    if (act === "me-pick") {
      var pk = t.getAttribute("data-k"), pl = t.getAttribute("data-lane"), pm = meList().filter(function (x) { return String(x.k) === pk; })[0];
      if (!pm) return;
      var redraw = function () {
        var row = document.getElementById("mlog-" + pk);
        if (row) { var tmp = document.createElement("div"); tmp.innerHTML = meLogRow(pm); var nr = tmp.firstChild; row.replaceWith(nr); var nb = nr.querySelector('[data-lane="' + pl + '"]'); if (nb) nb.focus(); }
        document.getElementById("mlog-head").innerHTML = meLogHead();
        var mh2 = document.getElementById("me-heroes"); if (mh2) mh2.innerHTML = meHeroes();
      };
      if (dbOn()) {
        var nl = pm.me === pl ? null : pl; t.disabled = true;
        SB.rpc("set_my_lane", { match_id: pm.id, lane: nl }).then(function (res) { t.disabled = false; if (res.error) { t.title = dbErr(res.error); return; } pm.me = nl; redraw(); });
        return;
      }
      var PK = mePicks(); if (PK[pk] === pl) delete PK[pk]; else PK[pk] = pl; meSavePicks(PK); redraw(); return; }
    if (act === "me-move-picks") {
      var mv = meMovable(); t.disabled = true; t.textContent = "移しています… 0 / " + mv.length;
      var step = function (n) {
        if (n >= mv.length) { meSavePicks({}); render(true); return; }
        SB.rpc("set_my_lane", { match_id: mv[n].m.id, lane: mv[n].lane }).then(function (res) { if (!res.error) mv[n].m.me = mv[n].lane; t.textContent = "移しています… " + (n + 1) + " / " + mv.length; step(n + 1); });
      };
      step(0); return; }
    if (act === "me-unpick-all") { meSavePicks({}); document.getElementById("mlog-head").innerHTML = meLogHead(); document.getElementById("mlog-list").innerHTML = meLogList(); var mh3 = document.getElementById("me-heroes"); if (mh3) mh3.innerHTML = meHeroes(); return; }
    if (act === "rl-spin") { if (!document.getElementById("rl-strip-wrap")) return; rlSpin(); return; }
    if (act === "rl-ex") { var ex = rlEx(), xid = t.getAttribute("data-id"); if (ex.indexOf(xid) < 0) ex.push(xid); rlSetEx(ex); S.rl.last = null; document.getElementById("rl-out").innerHTML = '<p class="muted rl-note">' + esc(CH[xid].name) + ' を候補から外しました。</p>'; document.getElementById("rl-ex").innerHTML = rlExList(); rlCount(); return; }
    if (act === "rl-unex") { rlSetEx(rlEx().filter(function (x) { return x !== t.getAttribute("data-id"); })); document.getElementById("rl-ex").innerHTML = rlExList(); rlCount(); return; }
    if (act === "rl-unex-all") { rlSetEx([]); document.getElementById("rl-ex").innerHTML = rlExList(); rlCount(); return; }
    if (act === "rl-lanetoo") { S.rl.laneToo = t.checked; return; }
    if (act === "skip") { ev.preventDefault(); var mv = document.getElementById("view"); if (mv) mv.focus(); return; }
    if (act === "filter") {
      var g = t.getAttribute("data-group"), v = t.getAttribute("data-value");
      if (g === "rl-lane" || g === "rl-cls") { S.rl[g === "rl-lane" ? "lane" : "cls"] = v; document.querySelectorAll('[data-group="' + g + '"]').forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-value") === v)); }); if (!S.rl.spinning) document.getElementById("rl-strip-wrap").innerHTML = rlReelIdle(); rlCount(); return; }
      if (g === "me-lane") { meSetLane(v); var mh = document.getElementById("me-heroes"); if (mh) mh.innerHTML = meHeroes(); return; }
      if (g === "me-log") { S.meLogOnly = v; document.querySelectorAll('[data-group="me-log"]').forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-value") === v)); }); document.getElementById("mlog-list").innerHTML = meLogList(); return; }
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
    if (t.hasAttribute && t.hasAttribute("data-hero-input")) subFace(t);
  });
  document.addEventListener("change", function (ev) {
    var t = ev.target, b = t.getAttribute("data-bind");
    if (b === "cf-sort") { S.cf.sort = t.value; document.getElementById("champ-grid").innerHTML = champGrid(); }
    if (t.matches && t.matches(".rec-item select")) { var ci = t.parentNode.querySelector("img.rec-cur"); if (ci) { var cs = itemSrc(t.value); ci.src = cs; ci.hidden = !cs; } }
    if (t.id === "rec-file") { if (t.files && t.files[0]) readShot(t.files[0]); t.value = ""; return; }
    if (t.hasAttribute && t.hasAttribute("data-hero-input")) { var hid2 = heroFromInput(t.value); if (hid2) t.value = CH[hid2].name + " (" + CH[hid2].en + ")"; subFace(t); return; }
    if (t.classList && (t.classList.contains("rv-sel") || t.id === "rv-all")) {
      if (t.id === "rv-all") document.querySelectorAll(".rv-sel:not(:disabled)").forEach(function (x) { x.checked = t.checked; });
      rvCount(); return; }
    if (t.classList && (t.classList.contains("rv-ban") || t.classList.contains("rv-excl"))) {
      var ban = t.classList.contains("rv-ban"); t.disabled = true;
      SB.rpc("set_user_flags", { target: t.getAttribute("data-uid"), p_banned: ban ? t.checked : null, p_excluded: ban ? null : t.checked }).then(function (res) {
        t.disabled = false;
        if (res.error) { t.checked = !t.checked; var e3 = document.createElement("span"); e3.className = "sub-msg bad"; e3.textContent = dbErr(res.error); t.closest("td").appendChild(e3); return; }
        var tr = t.closest("tr"); if (ban && tr) tr.classList.toggle("rv-banned", t.checked);
        (S.members || []).forEach(function (m) { if (m.id === t.getAttribute("data-uid")) { if (ban) m.banned = t.checked; else m.stats_excluded = t.checked; } });
        S.logBefore = null; loadLog(true);
      });
      return; }
    if (t.id && /^ra-to-/.test(t.id)) return;
    if (t.classList && t.classList.contains("hn-tier")) { tierSave(t); return; }
    if (t.classList && t.classList.contains("rv-role")) { t.disabled = true; SB.rpc("set_role", { target: t.getAttribute("data-uid"), new_role: t.value }).then(function (res) { t.disabled = false; if (res.error) { var e2 = document.createElement("span"); e2.className = "sub-msg bad"; e2.textContent = dbErr(res.error); t.parentNode.appendChild(e2); loadMembers(); return; } (S.members || []).forEach(function (m) { if (m.id === t.getAttribute("data-uid")) m.role = t.value; }); S.logBefore = null; loadLog(true); }); return; }
    if (b === "it-sort") { S.itf.sort = t.value; document.getElementById("item-grid").innerHTML = itemGrid(); }
    if (b === "q-you" || b === "l-you") S.lab.you = t.value;
    if (b === "q-enemy" || b === "l-enemy") S.lab.enemy = t.value;
    if (b === "q-lane" || b === "l-lane") S.lab.lane = t.value;
  });
  document.addEventListener("paste", function (ev) {
    if (!document.getElementById("rec-box")) return;
    var it = [].filter.call((ev.clipboardData || {}).items || [], function (x) { return x.kind === "file" && /^image\//.test(x.type); })[0];
    if (it) { ev.preventDefault(); readShot(it.getAsFile()); }
  });
  document.addEventListener("submit", function (ev) {
    if (ev.target.id === "sub-form") { ev.preventDefault(); sendForm(); return; }
    var f = ev.target.getAttribute("data-form"); if (!f) return;
    ev.preventDefault();
    if (f === "rv-search") { S.rvQ = document.getElementById("rv-q").value.trim(); loadApproved(); return; }
    if (f === "patch") { patchSave(ev.target); return; }
    var p = f === "quick" ? "q-" : "l-";
    S.lab.you = document.getElementById(p + "you").value; S.lab.enemy = document.getElementById(p + "enemy").value; S.lab.lane = document.getElementById(p + "lane").value;
    go(muHash(S.lab.you, S.lab.enemy, S.lab.lane));
  });


  function selectTab(id, focus) {
    if (id.indexOf("me-") === 0) S.metab = id; else S.dtab = id;
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
  if (dbOn()) dbCacheLoad();              /* last DB statistics kept in this browser: shown at once, then checked for updates */
  var tp0 = topPairs(1)[0]; if (tp0) S.lab = { you: tp0.y, enemy: tp0.e, lane: tp0.lane };
  window.addEventListener("hashchange", function () { closeSearch(); S.artSel = {}; veilGo(render); });
  render();
  if (dbOn()) { try { dbStats(); loadContent(); } catch (e) {} }
  var curtain = document.getElementById("curtain");
  function lift() { curtain.classList.add("done"); }
  setTimeout(lift, 700);
  window.VEIL_TEST = { route: route, filteredChamps: filteredChamps, S: S };
})();
