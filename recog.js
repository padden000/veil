/* VEIL screenshot reader: reads an MLBB result screen in the browser (no server, no outside AI).
   It finds 10 heroes, their items and KDA, the battle number, the match time, the result and the user's own row,
   by comparing small crops with reference crops ("refs") that grow as approved matches are registered.
   Player names, ratings and gold are never read.
   Layout: measured on a 2556×1179 screen; other sizes are scaled by height around the screen centre. */
(function () {
  /* Positions are measured on two screen shapes. Phones (wide, 2556×1179) and tablets (iPad, 2360×1640) lay the
     result screen out differently, so each has its own layout; the one closest to the screenshot's shape is used.
     Both are written in "phone units": sizes inside a row (icons, digits, the boots mark) are the same in both. */
  var PHONE = {
    BASE: { W: 2556, H: 1179 },
    rows: [318, 468, 620, 770, 920],                         /* y of each player row (portrait centre) */
    portrait: { ally: 400, enemy: 2152, r: 58 },             /* portrait centre x, half size */
    face: [26, 18, 70, 70],                                  /* x, y, w, h inside the portrait crop: the face, no flag / level */
    items: { ally: [517, 594, 670, 748, 825, 902], enemy: [1652, 1729, 1806, 1884, 1962, 2040], dy: 25, r: 31 },
    kda: { ally: [812, 863, 915], enemy: [1640, 1692, 1744], half: 25, top: -58, bottom: -12 },
    band: { ally: [10, 1270], top: -70, bottom: 75 },        /* row background, to find the highlighted (own) row */
    battle: [245, 1143, 560, 1177],                          /* digits after 「戦闘番号」 */
    time: [2343, 138, 2432, 180],
    title: [1060, 60, 1500, 140]
  };
  /* tablet: measured in screen pixels on 2360×1640, then turned into phone units (the item spacing is 85.6 px there, 77 on phones) */
  var TABLET = (function () {
    var v = 77 / 85.6, k = function (a) { return a.map(function (x) { return x * v; }); };
    return {
      BASE: { W: 2360 * v, H: 1640 * v },
      rows: k([512.5, 683, 854, 1024.5, 1195]),
      portrait: { ally: 312.5 * v, enemy: 2050 * v, r: 58 },
      face: PHONE.face,
      items: { ally: k([450, 535.5, 621, 707, 792.5, 878]), enemy: k([1481, 1566.5, 1651.5, 1736.5, 1822.5, 1907.5]), dy: 30 * v, r: 31 },
      kda: { ally: k([746.5, 805, 864]), enemy: k([1495, 1554, 1612.5]), half: 25, top: -58, bottom: -12 },
      band: { ally: k([10, 1170]), top: -70, bottom: 75 },
      battle: k([140, 1596, 448, 1639]),
      time: k([1926, 308, 2030, 358]),
      title: k([905, 62, 1460, 165])
    };
  })();
  var LAYOUTS = [PHONE, TABLET];
  var L = PHONE, BASE = PHONE.BASE;
  function pickLayout(w, h) {
    var a = w / h, best = PHONE;
    LAYOUTS.forEach(function (x) { if (Math.abs(a - x.BASE.W / x.BASE.H) < Math.abs(a - best.BASE.W / best.BASE.H)) best = x; });
    L = best; BASE = best.BASE; return best;
  }
  var SZ = 24;                                               /* compare crops at 24×24 */
  var GLYPH = [12, 18];

  function geom(w, h) { var s = h / BASE.H; return { s: s, X: function (x) { return w / 2 + (x - BASE.W / 2) * s; }, Y: function (y) { return y * s; } }; }
  function canvasOf(img, w, h) { var c = document.createElement("canvas"); c.width = w; c.height = h; var x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(img, 0, 0, w, h); return c; }
  function crop(src, x, y, w, h, ow, oh) {
    var c = document.createElement("canvas"); c.width = ow || Math.max(1, Math.round(w)); c.height = oh || Math.max(1, Math.round(h));
    var g = c.getContext("2d", { willReadFrequently: true }); g.imageSmoothingQuality = "high";
    g.drawImage(src, x, y, w, h, 0, 0, c.width, c.height); return c;
  }
  function pixels(c) { return c.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, c.width, c.height).data; }

  /* zero-mean, unit-length colour vector; circle mask for round icons.
     cut: items leave out the bottom third, where the shop pictures print the price, and the top-right corner, where boots carry the
     roam/jungle mark (result screen and shop then compare alike) */
  function vecOf(c, round, cut) {
    var s = c.width === SZ && c.height === SZ ? c : crop(c, 0, 0, c.width, c.height, SZ, SZ), d = pixels(s), v = [], n = SZ * SZ, r2 = (SZ / 2 - 1) * (SZ / 2 - 1);
    for (var i = 0; i < n; i++) {
      var px = i % SZ - SZ / 2 + .5, py = Math.floor(i / SZ) - SZ / 2 + .5;
      if (round && px * px + py * py > r2) continue;
      if (cut && (py > SZ * .17 || (px - SZ * .34) * (px - SZ * .34) + (py + SZ * .27) * (py + SZ * .27) < SZ * SZ * .085)) continue;
      v.push(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]);
    }
    return norm(v);
  }
  function norm(v) { var m = 0, i; for (i = 0; i < v.length; i++) m += v[i]; m /= v.length; var q = 0; for (i = 0; i < v.length; i++) { v[i] -= m; q += v[i] * v[i]; } q = Math.sqrt(q) || 1; for (i = 0; i < v.length; i++) v[i] /= q; return v; }
  function dot(a, b) { var s = 0, n = Math.min(a.length, b.length); for (var i = 0; i < n; i++) s += a[i] * b[i]; return s; }
  function std(c) { var d = pixels(c), n = d.length / 4, m = 0, q = 0, i, g; for (i = 0; i < n; i++) { g = (d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2]) / 3; m += g; q += g * g; } m /= n; return Math.sqrt(Math.max(0, q / n - m * m)); }

  /* ---- references ---- */
  var KINDS = ["hero", "item", "badge", "kda", "bid", "time"];
  var REFS = {}; KINDS.forEach(function (k) { REFS[k] = []; });
  function loadImage(src) { return new Promise(function (ok, ng) { var i = new Image(); i.onload = function () { ok(i); }; i.onerror = ng; i.src = src; }); }
  function refVec(kind, img) {
    var c = canvasOf(img, img.naturalWidth || img.width, img.naturalHeight || img.height);
    if (kind === "hero") return vecOf(c, false);
    if (kind === "item") return vecOf(c, true, true);
    if (kind === "badge") return badgeVec(c);
    return glyphVec(c);
  }
  /* refs: [{kind, label, img(dataURL or URL)}] */
  function setRefs(list) {
    REFS = {}; KINDS.forEach(function (k) { REFS[k] = []; });
    return Promise.all((list || []).map(function (r) {
      if (!REFS[r.kind]) return null;
      return loadImage(r.img).then(function (im) { REFS[r.kind].push({ label: r.label, v: refVec(r.kind, im) }); }).catch(function () {});
    })).then(function () { return counts(); });
  }
  function counts() { var o = {}; Object.keys(REFS).forEach(function (k) { o[k] = REFS[k].length; }); return o; }
  function best(kind, v) {
    var by = {};
    /* digits: the battle number shows all ten digits, so its examples also stand in for KDA and match-time digits not seen yet */
    var pool = kind === "kda" || kind === "time" ? REFS[kind].concat(REFS.bid) : REFS[kind];
    pool.forEach(function (r) { var s = dot(v, r.v); if (!(r.label in by) || s > by[r.label]) by[r.label] = s; });
    var list = Object.keys(by).map(function (k) { return { label: k, score: by[k] }; }).sort(function (a, b) { return b.score - a.score; });
    return list;
  }
  var TH = { hero: [0.82, 0.04], item: [0.72, 0.05], kda: [0.75, 0.05], bid: [0.75, 0.05], time: [0.75, 0.05] };

  /* boots badge (top right of an item): a mark in a small dark ring. Foot mark = ROAM, hunt (beast) mark = JUNGLE.
     Compared as greyscale against learned examples of "roam", "jungle" and "none" (no badge), nearest wins. */
  var BADGE = 34;
  function badgeVec(c) {
    var b = c.width === BADGE ? c : crop(c, 0, 0, c.width, c.height, BADGE, BADGE), d = pixels(b), v = [];
    for (var y = 0; y < BADGE; y++) for (var x = 0; x < BADGE; x++) {
      var dx = x + .5 - 19, dy = y + .5 - 17; if (dx * dx + dy * dy > 15.5 * 15.5) continue;
      var i = (y * BADGE + x) * 4; v.push((d[i] + d[i + 1] + d[i + 2]) / 3);
    }
    return norm(v);
  }
  function badgeAt(src, G, ix, iy) {
    var b = crop(src, G.X(ix + 2), G.Y(iy - 34), 34 * G.s, 34 * G.s, BADGE, BADGE);
    var l = best("badge", badgeVec(b)), top = l[0], none = l.filter(function (x) { return x.label === "none"; })[0];
    /* a mark only counts when it is clearly closer than the nearest "no badge" example */
    var lane = top && top.label !== "none" && (!none || top.score - none.score >= .05) ? (top.label === "roam" ? "ROAM" : top.label === "jungle" ? "JUNGLE" : null) : null;
    return { img: b.toDataURL("image/webp", .92), lane: lane, score: top ? top.score : 0 };
  }

  function decide(kind, v) {
    var l = best(kind, v), t = TH[kind], top = l[0], second = l[1];
    var ok = top && top.score >= t[0] && (!second || top.score - second.score >= t[1]);
    return { label: ok ? top.label : null, score: top ? top.score : 0, alts: l.slice(0, 3) };
  }

  /* ---- digits ---- */
  function glyphVec(c) {
    var g = crop(c, 0, 0, c.width, c.height, GLYPH[0], GLYPH[1]), d = pixels(g), v = [];
    for (var i = 0; i < d.length; i += 4) v.push((d[i] + d[i + 1] + d[i + 2]) / 3);
    return norm(v);
  }
  /* bright text on a darker background: split into glyphs by empty columns */
  function glyphs(src, box) {
    var w = Math.round(box[2] - box[0]), h = Math.round(box[3] - box[1]);
    if (w < 4 || h < 4) return [];
    var c = crop(src, box[0], box[1], box[2] - box[0], box[3] - box[1], w, h), d = pixels(c), V = new Float32Array(w * h), sorted = [];
    for (var i = 0; i < w * h; i++) { V[i] = (d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2]) / 3; sorted.push(V[i]); }
    sorted.sort(function (a, b) { return a - b; });
    var bg = sorted[Math.floor(sorted.length * .5)], hi = sorted[Math.floor(sorted.length * .985)];
    if (hi - bg < 40) return [];
    var th = bg + (hi - bg) * .58, col = [], x, y;
    for (x = 0; x < w; x++) { var n = 0; for (y = 0; y < h; y++) if (V[y * w + x] > th) n++; col.push(n); }
    var spans = [], st = -1;
    for (x = 0; x <= w; x++) { var on = x < w && col[x] > 0; if (on && st < 0) st = x; if (!on && st >= 0) { spans.push([st, x]); st = -1; } }
    var out = [];
    spans.forEach(function (sp) {
      var y0 = h, y1 = -1;
      for (y = 0; y < h; y++) for (x = sp[0]; x < sp[1]; x++) if (V[y * w + x] > th) { if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (y1 < 0) return;
      var gh = y1 - y0 + 1, gw = sp[1] - sp[0];
      if (gh < h * .35 || gw < 1) return;                 /* specks, punctuation such as ":" */
      if (sp[0] === 0 || sp[1] === w) return;            /* cut off by the box edge (bubbles, frames) */
      var gap = 0, run = 0;                                /* ":" and similar: ink broken by an empty band */
      for (y = y0; y <= y1; y++) { var any = false; for (x = sp[0]; x < sp[1]; x++) if (V[y * w + x] > th) { any = true; break; } run = any ? 0 : run + 1; if (run > gap) gap = run; }
      if (gap > gh * .2) return;
      /* digits that touch each other: split by the usual digit width */
      var n = gw > gh * .85 ? Math.max(2, Math.round(gw / (gh * .62))) : 1;
      for (var k = 0; k < n; k++) { var gx = sp[0] + Math.round(gw * k / n), gx2 = sp[0] + Math.round(gw * (k + 1) / n); out.push({ x: gx, w: gx2 - gx, h: gh, c: crop(c, gx, y0, gx2 - gx, gh) }); }
    });
    return out;
  }
  function readNumber(kind, src, box) {
    var gs = glyphs(src, box), text = "", sure = true, parts = [];
    gs.forEach(function (g) {
      var r = decide(kind, glyphVec(g.c));
      parts.push({ img: g.c.toDataURL("image/webp", .92), label: r.label, score: r.score });
      if (r.label == null) { sure = false; text += "?"; } else text += r.label;
    });
    return { text: text, sure: sure && gs.length > 0, glyphs: parts };
  }

  /* ---- the whole screen ---- */
  function analyze(img) {
    var W = img.naturalWidth || img.width, H = img.naturalHeight || img.height, lay = pickLayout(W, H), G = geom(W, H);
    var src = canvasOf(img, W, H), out = { size: [W, H], aspect: W / H, layout: lay === TABLET ? "tablet" : "phone", rows: [] };
    out.layoutOk = Math.abs(W / H - BASE.W / BASE.H) < 0.12;
    /* result: VICTORY is gold, so red+green clearly above blue */
    /* result: the VICTORY letters are gold; count gold pixels in the title */
    var t = L.title, tc = crop(src, G.X(t[0]), G.Y(t[1]), (t[2] - t[0]) * G.s, (t[3] - t[1]) * G.s, 220, 40), td = pixels(tc), gold = 0;
    for (var i = 0; i < td.length; i += 4) if (td[i] > 150 && td[i + 1] > 110 && td[i + 2] < 120) gold++;
    gold /= td.length / 4; out.win = { value: gold > 0.03, score: gold };
    var bx = function (b) { return [G.X(b[0]), G.Y(b[1]), G.X(b[2]), G.Y(b[3])]; };
    out.battle = readNumber("bid", src, bx(L.battle));
    out.time = readNumber("time", src, bx(L.time));
    var bands = [];
    ["ally", "enemy"].forEach(function (side) {
      L.rows.forEach(function (ry, ri) {
        var r = L.portrait.r, px = L.portrait[side];
        var pc = crop(src, G.X(px - r), G.Y(ry - r), 2 * r * G.s, 2 * r * G.s, 2 * r, 2 * r);
        var fc = crop(pc, L.face[0], L.face[1], L.face[2], L.face[3], SZ, SZ);
        var hero = decide("hero", vecOf(fc, false));
        var items = L.items[side].map(function (ix) {
          var ir = L.items.r, ic = crop(src, G.X(ix - ir), G.Y(ry + L.items.dy - ir), 2 * ir * G.s, 2 * ir * G.s, 2 * ir, 2 * ir);
          if (std(ic) < 22) return null;                   /* empty slot */
          var d = decide("item", vecOf(ic, true, true)), bd = badgeAt(src, G, ix, ry + L.items.dy);
          return { img: crop(ic, 0, 0, ic.width, ic.height, 32, 32).toDataURL("image/webp", .92), id: d.label, score: d.score, alts: d.alts, badge: bd };
        }).filter(Boolean);
        var kda = L.kda[side].map(function (kx) {
          return readNumber("kda", src, [G.X(kx - L.kda.half), G.Y(ry + L.kda.top), G.X(kx + L.kda.half), G.Y(ry + L.kda.bottom)]);
        });
        var mark = null; items.forEach(function (it) { if (it.badge && it.badge.lane && !mark) mark = it.badge.lane; });
        var row = { side: side, row: ri, mark: mark, face: crop(pc, L.face[0], L.face[1], L.face[2], L.face[3], 32, 32).toDataURL("image/webp", .92),
          portrait: crop(pc, 0, 0, pc.width, pc.height, 64, 64).toDataURL("image/png"), hero: hero, items: items, kda: kda };
        out.rows.push(row);
        if (side === "ally") {
          var b = L.band, bc = crop(src, G.X(b.ally[0]), G.Y(ry + b.top), (b.ally[1] - b.ally[0]) * G.s, (b.bottom - b.top) * G.s, 120, 16), bd = pixels(bc), vals = [];
          for (var j = 0; j < bd.length; j += 4) vals.push((bd[j] + bd[j + 1] + bd[j + 2]) / 3);
          vals.sort(function (a, b2) { return a - b2; }); bands.push(vals[Math.floor(vals.length / 2)]);
        }
      });
    });
    var order = bands.map(function (v, i) { return i; }).sort(function (a, b) { return bands[b] - bands[a]; });
    out.meRow = bands[order[0]] - bands[order[1]] > 12 ? order[0] : null;
    return out;
  }

  /* ---- lanes: boots marks first, then the usual class for each lane, then where the hero is usually played ---- */
  var CLS_LANE = { Fighter: "EXP", Mage: "MID", Marksman: "GOLD" };
  /* marks[i]: "JUNGLE" / "ROAM" from the boots badge of row i (or null) */
  function lanes(heroIds, marks, clsOf, laneGames) {
    var res = [null, null, null, null, null], used = {};
    (marks || []).forEach(function (m, i) { if (m && !used[m]) { res[i] = m; used[m] = 1; } });
    var left = ["EXP", "MID", "GOLD", "JUNGLE", "ROAM"].filter(function (l) { return !used[l]; });
    var idx = [0, 1, 2, 3, 4].filter(function (i) { return !res[i]; });
    function score(i, lane) {
      var h = heroIds[i], s = 0; if (!h) return 0;
      var c = clsOf(h) || {};
      if (CLS_LANE[c.cls] === lane) s += 3; else if (CLS_LANE[c.sub] === lane) s += 1.5;
      var g = laneGames(h) || {}, tot = 0; Object.keys(g).forEach(function (k) { tot += g[k]; });
      if (tot) s += 2 * (g[lane] || 0) / tot;
      return s;
    }
    var bestP = null, bestS = -1;
    (function perm(arr, k) {
      if (k === arr.length) { var s = 0; for (var j = 0; j < idx.length; j++) s += score(idx[j], arr[j]); if (s > bestS) { bestS = s; bestP = arr.slice(); } return; }
      for (var i = k; i < arr.length; i++) { var t = arr[k]; arr[k] = arr[i]; arr[i] = t; perm(arr, k + 1); t = arr[k]; arr[k] = arr[i]; arr[i] = t; }
    })(left.slice(0, idx.length), 0);
    idx.forEach(function (i, j) { res[i] = bestP[j]; });
    return res;
  }

  window.VEIL_RECOG = { analyze: analyze, setRefs: setRefs, counts: counts, lanes: lanes, loadImage: loadImage, layout: L };
})();
