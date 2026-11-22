/* Turns the match records into what the pages use.
   Two sources, same result:
   - the sheet (roster.js: VEIL_MATCHES), counted here in the browser;
   - the database (Supabase), whose totals are already counted (stats_* views) and passed to VEIL_APPLY / VEIL_APPLY_HERO.
   Every number counts both teams of each match. */
(function () {
  var D = window.VEIL_DATA, R = window.VEIL_ROSTER || [], M = window.VEIL_MATCHES || [];
  var LANES = ["EXP", "GOLD", "MID", "JUNGLE", "ROAM"];
  var CLS_JP = { Tank: "タンク", Fighter: "ファイター", Assassin: "アサシン", Mage: "メイジ", Marksman: "マークスマン", Support: "サポート" };
  var CLS_EMBLEM = { Tank: "タンク", Fighter: "ファイター", Assassin: "アサシン", Mage: "メイジ", Marksman: "ハンター", Support: "サポート" };
  var CLS_RGB = { Tank: "96,92,84", Fighter: "113,32,42", Assassin: "70,52,96", Mage: "185,154,104", Marksman: "101,113,125", Support: "150,138,112" };
  var CLS_SIGIL = { Tank: "ROAM", Fighter: "EXP", Assassin: "JUNGLE", Mage: "MID", Marksman: "GOLD", Support: "ROAM" };

  function rec() { return { games: 0, wins: 0 }; }
  function add(r, w) { r.games++; if (w) r.wins++; }
  function addN(r, g, w) { r.games += g; r.wins += w; }
  function blank() { return { all: rec(), lane: {}, vs: {}, mates: {}, laneMates: {}, rank: {}, month: {}, detail: false }; }

  /* ---------- from the sheet ---------- */
  function fromSheet() {
    var S = {};
    R.forEach(function (h) { S[h.id] = blank(); S[h.id].detail = true; });
    M.forEach(function (m) {
      ["ally", "enemy"].forEach(function (side) {
        var won = side === "ally" ? m.win : !m.win, mine = m[side], other = m[side === "ally" ? "enemy" : "ally"];
        LANES.forEach(function (L) {
          var id = mine[L]; if (!id || !S[id]) return;
          var s = S[id]; add(s.all, won);
          (s.lane[L] = s.lane[L] || rec()); add(s.lane[L], won);
          var key = m.rank || "不明"; (s.rank[key] = s.rank[key] || rec()); add(s.rank[key], won);
          var mo = m.date.slice(0, 7); (s.month[mo] = s.month[mo] || rec()); add(s.month[mo], won);
          var opp = other[L]; if (opp) { var k = opp + "|" + L; (s.vs[k] = s.vs[k] || rec()); add(s.vs[k], won); }
          var lm = (s.laneMates[L] = s.laneMates[L] || {});
          LANES.forEach(function (L2) { var t = mine[L2]; if (t && t !== id) { (s.mates[t] = s.mates[t] || rec()); add(s.mates[t], won); (lm[t] = lm[t] || rec()); add(lm[t], won); } });
        });
      });
    });
    /* lanes of the newest 1000 matches, for the roulette */
    var recent = {}, ms = M.map(function (m, i) { return { m: m, i: i }; })
      .sort(function (a, b) { return a.m.date < b.m.date ? 1 : a.m.date > b.m.date ? -1 : b.i - a.i; }).slice(0, 1000);
    ms.forEach(function (x) { [x.m.ally, x.m.enemy].forEach(function (team) { Object.keys(team || {}).forEach(function (L) { var id = team[L]; if (!id) return; recent[id] = recent[id] || {}; recent[id][L] = (recent[id][L] || 0) + 1; }); }); });
    return {
      S: S, recent: recent, recentN: ms.length, pairs: null,
      info: { count: M.length, from: M.length ? M[0].date : null, to: M.length ? M[M.length - 1].date : null, ranks: Array.from(new Set(M.map(function (m) { return m.rank; }))), source: "sheet" }
    };
  }

  /* ---------- shared: champions, lane sets, rank slots ---------- */
  function playedOrder(s) { return LANES.filter(function (L) { return s.lane[L]; }).sort(function (a, b) { return s.lane[b].games - s.lane[a].games; }); }
  function ranked(map, top, sign) {
    return Object.keys(map).map(function (k) { var r = map[k]; return { k: k, games: r.games, wr: r.wins / r.games }; })
      .filter(function (x) { return sign > 0 ? x.wr >= .5 : x.wr < .5; })
      .sort(function (a, b) { return sign * (b.wr - a.wr) || b.games - a.games || (a.k < b.k ? -1 : a.k > b.k ? 1 : 0); }).slice(0, top);   /* ties: by id, so both sources agree */
  }
  var byId = {};
  function heroDetail(c, s) {   /* the parts that need matchups / teammates */
    var vsLane = {}; Object.keys(s.vs).forEach(function (k) { if (k.split("|")[1] === c.role) vsLane[k.split("|")[0]] = s.vs[k]; });
    c.strong = ranked(vsLane, 3, 1).map(function (x) { return x.k; }); c.weak = ranked(vsLane, 3, -1).map(function (x) { return x.k; });
    var RS = window.VEIL_ROLESETS[c.id] || {};
    Object.keys(RS).forEach(function (L) { RS[L].synergy = ranked(s.laneMates[L] || {}, 3, 1).filter(function (x) { return x.games >= 1; }).map(function (x) { return x.k; }); });
    var ov = window.VEIL_OVERVIEW[c.id]; if (ov) ov.synergy = (RS[c.role] || {}).synergy || [];
  }
  function apply(src) {
    var S = src.S, info = src.info;
    window.VEIL_STATS = S; window.VEIL_MATCH_INFO = info;
    window.VEIL_RECENT_LANES = { lanes: src.recent, n: src.recentN };
    window.VEIL_TOP_PAIRS = src.pairs;
    var RS = window.VEIL_ROLESETS = window.VEIL_ROLESETS || {}, EM = window.VEIL_EMBLEM_OF = window.VEIL_EMBLEM_OF || {}, OV = window.VEIL_OVERVIEW = window.VEIL_OVERVIEW || {};
    var champs = R.map(function (h) {
      var s = S[h.id] || (S[h.id] = blank()), order = playedOrder(s), role = order[0] || "EXP";
      var lanes = {}; order.forEach(function (L, i) { lanes[L] = i === 0 ? "○" : "△"; });
      var c = byId[h.id] || (byId[h.id] = {
        id: h.id, name: h.jp || h.en, en: h.en, title: h.en, cls: h.cls, sub: h.sub, sheetLanes: h.lanes,
        desc: (CLS_JP[h.cls] || h.cls) + (h.sub ? " / " + (CLS_JP[h.sub] || h.sub) : ""),
        attr: CLS_JP[h.cls] || h.cls, diff: 0, rgb: CLS_RGB[h.cls] || "96,92,84", sigil: CLS_SIGIL[h.cls] || "EXP", ban: null,
        skills: [], combo: [], comboNote: "", build: [], emblem: (CLS_EMBLEM[h.cls] || "共通") + ":", play: "", lane: "", team: "", lore: "", events: [], relations: [], stats: null
      });
      /* update in place: the pages keep references to these objects */
      Object.assign(c, { lanes: lanes, role: role, games: s.all.games, wins: s.all.wins, wr: s.all.games ? s.all.wins / s.all.games * 100 : null,
        pick: info.count ? s.all.games / info.count * 100 : null, strong: [], weak: [] });
      RS[c.id] = {};
      order.forEach(function (L) {
        var r = s.lane[L];
        RS[c.id][L] = { tier: null, wr: r.games ? r.wins / r.games * 100 : null, pick: info.count ? r.games / info.count * 100 : null, ban: null, games: r.games, apt: lanes[L] || null, synergy: [] };
      });
      var em = CLS_EMBLEM[c.cls] || "共通", alt = c.sub && CLS_EMBLEM[c.sub] && CLS_EMBLEM[c.sub] !== em ? [CLS_EMBLEM[c.sub]] : [];
      EM[c.id] = [em].concat(alt).concat(["共通"].filter(function (x) { return x !== em; }));
      OV[c.id] = { tags: [CLS_JP[c.cls] || c.cls].concat(c.sub ? [CLS_JP[c.sub] || c.sub] : []), ratings: null, pros: [], cons: [], synergy: [] };
      if (s.detail) heroDetail(c, s);
      return c;
    });
    if (!D.champions || D.champions.length !== champs.length) D.champions = champs;
    D.matchups = {}; D.tierList = {}; D.changes = []; D.metaNotes = [];
    D.news = [
      { date: "2026.11.18", cat: "UPDATE", title: "キャラクター図鑑を実在のヒーロー133体に切り替えました", to: "champions" },
      { date: "2026.11.18", cat: "DATA", title: "試合記録 " + info.count + " 試合をもとに、勝率と対戦成績を集計しています", to: "patch" }
    ];
    var SL = window.VEIL_SLOTS; SL.heroes = SL.heroes || {};
    SL.rankGroups = (info.ranks || []).filter(function (r) { return r; }).map(function (r) { return { id: r, label: r }; });
    champs.forEach(function (c) {
      var s = S[c.id], rs = {};
      Object.keys(s.rank).forEach(function (k) { var r = s.rank[k]; rs[k] = { wr: r.wins / r.games * 100, games: r.games }; });
      SL.heroes[c.id] = Object.assign(SL.heroes[c.id] || {}, { real: true, rankStats: rs, month: s.month });
    });
  }

  /* ---------- from the database ---------- */
  /* g: { summary, hero: [{hero,lane,rank,month,games,wins}], recent: [{hero,lane,games}], pairs: [{hero,lane,opp,games,wins}] } */
  window.VEIL_APPLY = function (g) {
    var S = {};
    R.forEach(function (h) { S[h.id] = blank(); });
    (g.hero || []).forEach(function (r) {
      var s = S[r.hero]; if (!s) return;
      addN(s.all, r.games, r.wins);
      addN(s.lane[r.lane] = s.lane[r.lane] || rec(), r.games, r.wins);
      var rk = r.rank || "不明"; addN(s.rank[rk] = s.rank[rk] || rec(), r.games, r.wins);
      addN(s.month[r.month] = s.month[r.month] || rec(), r.games, r.wins);
    });
    var recent = {};
    (g.recent || []).forEach(function (r) { recent[r.hero] = recent[r.hero] || {}; recent[r.hero][r.lane] = r.games; });
    var sm = g.summary || {};
    apply({ S: S, recent: recent, recentN: sm.recent_n || 0,
      pairs: (g.pairs || []).map(function (r) { return { y: r.hero, e: r.opp, lane: r.lane, r: { games: r.games, wins: r.wins } }; }),
      info: { count: sm.matches || 0, from: sm.first_on || null, to: sm.last_on || null, ranks: sm.ranks || [], source: "db", refreshed: sm.refreshed_at } });
  };
  /* one hero's matchups (vs) and teammates (mates), loaded when its page is opened */
  window.VEIL_APPLY_HERO = function (id, vs, mates) {
    var s = (window.VEIL_STATS || {})[id], c = byId[id]; if (!s || !c) return;
    s.vs = {}; s.mates = {}; s.laneMates = {};
    (vs || []).forEach(function (r) { s.vs[r.opp + "|" + r.lane] = { games: r.games, wins: r.wins }; });
    (mates || []).forEach(function (r) {
      var lm = (s.laneMates[r.lane] = s.laneMates[r.lane] || {}); lm[r.mate] = { games: r.games, wins: r.wins };
      addN(s.mates[r.mate] = s.mates[r.mate] || rec(), r.games, r.wins);
    });
    s.detail = true; heroDetail(c, s);
  };

  apply(fromSheet());
  window.VEIL_EXTRA.heroes = {};
  window.VEIL_CLS_JP = CLS_JP;
  /* lore: the earlier world was written for invented characters, so it is held back */
  D.lore = null;
})();
