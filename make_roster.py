import openpyxl, json, re, sys, datetime
src = sys.argv[1]; out = sys.argv[2]
wb = openpyxl.load_workbook(src, data_only=True)
ws = wb['キャラ']
LANES = ['ROAM','EXP','MID','JG','GOLD']
LMAP = {'ROAM':'ROAM','EXP':'EXP','MID':'MID','JG':'JUNGLE','GOLD':'GOLD'}
heroes = []; byEn = {}
def slug(s): return re.sub(r'[^a-z]', '', s.lower())
for r in ws.iter_rows(min_row=5, values_only=True):
    if r[1] is None or r[2] is None: continue
    lanes = {}
    for k, v in zip(LANES, r[6:11]):
        if v: lanes[LMAP[k]] = '○' if str(v).strip() in ('○', '〇', 'O', 'o') else '△'
    laneWr = {LMAP[k]: (float(v) if isinstance(v,(int,float)) else None) for k, v in zip(LANES, r[14:19])}
    h = {"no": r[1], "id": slug(r[2]), "en": r[2], "jp": r[3], "cls": r[4], "sub": r[5], "lanes": lanes,
         "games": r[11] or 0, "useRate": r[12], "wr": r[13], "laneWrSheet": laneWr}
    heroes.append(h); byEn[r[2].strip().lower()] = h
ids = [h['id'] for h in heroes]; assert len(ids) == len(set(ids)), "duplicate slug"
# matches
ms = wb['試合結果']; matches = []; unknown = set()
for r in ms.iter_rows(min_row=4, values_only=True):
    if not r[1] or not r[6]: continue
    def pid(name):
        if not name: return None
        h = byEn.get(str(name).strip().lower())
        if not h: unknown.add(name); return None
        return h['id']
    d = r[2].strftime('%Y-%m-%d') if isinstance(r[2], (datetime.date, datetime.datetime)) else str(r[2])
    matches.append({"season": r[1], "date": d, "rank": r[3], "party": r[5], "win": str(r[6]).lower().startswith('w'),
                    "ally": {LMAP[k]: pid(v) for k, v in zip(LANES, r[8:13])}, "enemy": {LMAP[k]: pid(v) for k, v in zip(LANES, r[13:18])}})
print(len(heroes), "heroes;", len(matches), "matches; unknown names:", sorted(unknown))
print("ranks:", sorted(set(m['rank'] for m in matches)), "| dates:", matches[0]['date'], "→", matches[-1]['date'])
open(out, 'w').write("/* Generated from the user's sheet (キャラ, 試合結果). Do not edit by hand: regenerate from the sheet. */\n"
  "window.VEIL_ROSTER = " + json.dumps(heroes, ensure_ascii=False) + ";\nwindow.VEIL_MATCHES = " + json.dumps(matches, ensure_ascii=False) + ";\n")
