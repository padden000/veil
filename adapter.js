/* Turns the sheet data (roster.js) into what the pages use.
   Every number here is counted from the user's own match records (VEIL集計), on both teams of each match. */
(function () {
  var D = window.VEIL_DATA, R = window.VEIL_ROSTER || [], M = window.VEIL_MATCHES || [];
  var LANES = ["EXP", "GOLD", "MID", "JUNGLE", "ROAM"];
  var CLS_JP = { Tank: "タンク", Fighter: "ファイター", Assassin: "アサシン", Mage: "メイジ", Marksman: "マークスマン", Support: "サポート" };
  var CLS_EMBLEM = { Tank: "タンク", Fighter: "ファイター", Assassin: "アサシン", Mage: "メイジ", Marksman: "ハンター", Support: "サポート" };
  var CLS_RGB = { Tank: "96,92,84", Fighter: "113,32,42", Assassin: "70,52,96", Mage: "185,154,104", Marksman: "101,113,125", Support: "150,138,112" };
  var CLS_SIGIL = { Tank: "ROAM", Fighter: "EXP", Assassin: "JUNGLE", Mage: "MID", Marksman: "GOLD", Support: "ROAM" };

  function rec() { return { games: 0, wins: 0 }; }
  function add(r, w) { r.games++; if (w) r.wins++; }
  var S = {};
  R.forEach(function (h) { S[h.id] = { all: rec(), lane: {}, vs: {}, mates: {}, rank: {}, month: {}, days: {} }; });
  M.forEach(function (m) {
    ["ally", "enemy"].forEach(function (side) {
      var won = side === "ally" ? m.win : !m.win, mine = m[side], other = m[side === "ally" ? "enemy" : "ally"];
      LANES.forEach(function (L) {
        var id = mine[L]; if (!id || !S[id]) return;
        var s = S[id]; add(s.all, won);
        (s.lane[L] = s.lane[L] || rec()); add(s.lane[L], won);
        var key = m.rank || "不明"; (s.rank[key] = s.rank[key] || rec()); add(s.rank[key], won);
        var mo = m.date.slice(0, 7); (s.month[mo] = s.month[mo] || rec()); add(s.month[mo], won);
        (s.days[m.date] = s.days[m.date] || rec()); add(s.days[m.date], won);
        var opp = other[L]; if (opp) { var k = opp + "|" + L; (s.vs[k] = s.vs[k] || rec()); add(s.vs[k], won); }
        LANES.forEach(function (L2) { var t = mine[L2]; if (t && t !== id) { (s.mates[t] = s.mates[t] || rec()); add(s.mates[t], won); } });
      });
    });
  });
  window.VEIL_STATS = S;
  window.VEIL_MATCH_INFO = { count: M.length, from: M.length ? M[0].date : null, to: M.length ? M[M.length - 1].date : null, ranks: Array.from(new Set(M.map(function (m) { return m.rank; }))) };

  /* lanes come from the lanes actually played in the recorded matches (the sheet's 適正 columns are kept as sheetLanes) */
  function playedLanes(h) {
    var s = S[h.id], ls = LANES.filter(function (L) { return s.lane[L]; }).sort(function (a, b) { return s.lane[b].games - s.lane[a].games; });
    var out = {}; ls.forEach(function (L, i) { out[L] = i === 0 ? "○" : "△"; });
    return { lanes: out, order: ls };
  }
  function mainLane(h) { var p = playedLanes(h); return p.order[0] || "EXP"; }
  function ranked(map, top, sign) {
    return Object.keys(map).map(function (k) { var r = map[k]; return { k: k, games: r.games, wr: r.wins / r.games }; })
      .filter(function (x) { return sign > 0 ? x.wr >= .5 : x.wr < .5; })
      .sort(function (a, b) { return sign * (b.wr - a.wr) || b.games - a.games; }).slice(0, top);
  }

  var champs = R.map(function (h) {
    var s = S[h.id], role = mainLane(h);
    var vsLane = {}; Object.keys(s.vs).forEach(function (k) { if (k.split("|")[1] === role) vsLane[k.split("|")[0]] = s.vs[k]; });
    return {
      id: h.id, name: h.jp || h.en, en: h.en, title: h.en, cls: h.cls, sub: h.sub, lanes: playedLanes(h).lanes, sheetLanes: h.lanes,
      role: role, desc: (CLS_JP[h.cls] || h.cls) + (h.sub ? " / " + (CLS_JP[h.sub] || h.sub) : ""),
      attr: CLS_JP[h.cls] || h.cls, diff: 0, rgb: CLS_RGB[h.cls] || "96,92,84", sigil: CLS_SIGIL[h.cls] || "EXP",
      games: s.all.games, wins: s.all.wins, wr: s.all.games ? s.all.wins / s.all.games * 100 : null,
      pick: M.length ? s.all.games / M.length * 100 : null, ban: null,
      strong: ranked(vsLane, 3, 1).map(function (x) { return x.k; }), weak: ranked(vsLane, 3, -1).map(function (x) { return x.k; }),
      skills: [], combo: [], comboNote: "", build: [], emblem: (CLS_EMBLEM[h.cls] || "共通") + ":", play: "", lane: "", team: "", lore: "", events: [], relations: [], stats: null
    };
  });
  D.champions = champs;
  D.matchups = {}; D.tierList = {}; D.changes = []; D.metaNotes = [];
  D.news = [
    { date: "2026.11.18", cat: "UPDATE", title: "キャラクター図鑑を実在のヒーロー133体に切り替えました", to: "champions" },
    { date: "2026.11.18", cat: "DATA", title: "試合記録 " + M.length + " 試合をもとに、勝率と対戦成績を集計しています", to: "patch" }
  ];

  /* roles a hero is played in: ○ first, then △ */
  var RS = {}, EM = {}, OV = {};
  champs.forEach(function (c) {
    var s = S[c.id], order = LANES.filter(function (L) { return s.lane[L]; }).sort(function (a, b) { return s.lane[b].games - s.lane[a].games; });
    RS[c.id] = {};
    order.forEach(function (L) {
      var r = s.lane[L] || rec();
      var mates = {}; /* teammates when played in this lane */
      M.forEach(function (m) { ["ally", "enemy"].forEach(function (side) { if (m[side][L] !== c.id) return; var won = side === "ally" ? m.win : !m.win;
        LANES.forEach(function (L2) { var tm = m[side][L2]; if (tm && tm !== c.id) { (mates[tm] = mates[tm] || rec()); add(mates[tm], won); } }); }); });
      RS[c.id][L] = { tier: null, wr: r.games ? r.wins / r.games * 100 : null, pick: M.length ? r.games / M.length * 100 : null, ban: null, games: r.games,
        apt: c.lanes[L] || null, synergy: ranked(mates, 3, 1).filter(function (x) { return x.games >= 1; }).map(function (x) { return x.k; }) };
    });
    var em = CLS_EMBLEM[c.cls] || "共通", alt = c.sub && CLS_EMBLEM[c.sub] && CLS_EMBLEM[c.sub] !== em ? [CLS_EMBLEM[c.sub]] : [];
    EM[c.id] = [em].concat(alt).concat(["共通"].filter(function (x) { return x !== em; }));
    OV[c.id] = { tags: [CLS_JP[c.cls] || c.cls].concat(c.sub ? [CLS_JP[c.sub] || c.sub] : []), ratings: null, pros: [], cons: [], synergy: (RS[c.id][c.role] || {}).synergy || [] };
  });
  window.VEIL_ROLESETS = RS; window.VEIL_EMBLEM_OF = EM; window.VEIL_OVERVIEW = OV;
  window.VEIL_EXTRA.heroes = {};
  window.VEIL_CLS_JP = CLS_JP;

  /* statistics slots: replace the generated SAMPLE with the real counts */
  var SL = window.VEIL_SLOTS; SL.heroes = SL.heroes || {};
  SL.rankGroups = window.VEIL_MATCH_INFO.ranks.map(function (r) { return { id: r, label: r }; });
  champs.forEach(function (c) {
    var s = S[c.id], rs = {};
    Object.keys(s.rank).forEach(function (k) { var r = s.rank[k]; rs[k] = { wr: r.wins / r.games * 100, games: r.games }; });
    SL.heroes[c.id] = Object.assign(SL.heroes[c.id] || {}, { real: true, rankStats: rs, month: s.month });
  });

  /* lore: the earlier world was written for invented characters, so it is held back */
  D.lore = null;
})();
