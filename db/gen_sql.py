"""Makes heroes.sql and import_sheet.sql from ../roster.js (which make_roster.py builds from the sheet)."""
import json, re, os
here = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(here, '..', 'roster.js'), encoding='utf-8').read()
heroes = json.loads(re.search(r'VEIL_ROSTER = (\[.*?\]);\n', src, re.S).group(1))
matches = json.loads(re.search(r'VEIL_MATCHES = (\[.*\]);', src, re.S).group(1))
q = lambda v: 'null' if v is None else "'" + str(v).replace("'", "''") + "'"
LANES = ['EXP', 'JUNGLE', 'MID', 'GOLD', 'ROAM']

rows = ',\n'.join('  (%s, %s, %s, %s, %s)' % (q(h['id']), q(h['en']), q(h['jp']), q(h['cls']), q(h['sub'])) for h in heroes)
open(os.path.join(here, 'heroes.sql'), 'w', encoding='utf-8').write(
    "-- VEIL heroes (%d). Safe to run again: updates names and classes.\n" % len(heroes) +
    "insert into public.heroes (id, en, jp, cls, sub) values\n" + rows +
    "\non conflict (id) do update set en = excluded.en, jp = excluded.jp, cls = excluded.cls, sub = excluded.sub;\n")

out = ["-- Imports the %d matches from the sheet as approved matches sent by the admin." % len(matches),
       "-- Run once, after you have logged in on the site and made yourself admin. Running it again does nothing.",
       "do $$",
       "declare adm uuid; mid bigint;",
       "begin",
       "  select id into adm from public.profiles where role = 'admin' order by created_at limit 1;",
       "  if adm is null then raise exception 'admin がいません。先にサイトでログインして、自分を admin にしてください'; end if;",
       "  if exists (select 1 from public.matches where source = 'sheet') then raise notice 'シートの試合はもう取り込まれています'; return; end if;"]
for m in matches:
    ally = {L: m['ally'][L] for L in LANES}; enemy = {L: m['enemy'][L] for L in LANES}
    out.append("  insert into public.matches (submitted_by, status, played_on, season, rank, stars, party, win, duration_sec, source, signature, reviewed_by, reviewed_at)")
    out.append("  values (adm, 'approved', %s, %s, %s, %s, %s, %s, %s, 'sheet', public.veil_signature(%s, %s::jsonb, %s::jsonb), adm, now()) returning id into mid;" % (
        q(m['date']), q(m['season']), q(m['rank']), m.get('stars') if m.get('stars') is not None else 'null', q(m['party']), 'true' if m['win'] else 'false',
        m.get('dur') if m.get('dur') is not None else 'null', q(m['date']) + '::date', q(json.dumps(ally)), q(json.dumps(enemy))))
    vals = ', '.join("(mid, '%s', '%s', %s)" % (s, L, q(m[s][L])) for s in ('ally', 'enemy') for L in LANES)
    out.append("  insert into public.picks (match_id, side, lane, hero) values %s;" % vals)
out += ["  perform public.refresh_stats();", "end $$;"]
open(os.path.join(here, 'import_sheet.sql'), 'w', encoding='utf-8').write('\n'.join(out) + '\n')
print(len(heroes), 'heroes,', len(matches), 'matches')

# stars for sheet matches that were imported before the stars column existed
up = ["-- Fills in the rank stars of the matches imported from the sheet. Safe to run again."]
for m in matches:
    if m.get('stars') is None: continue
    ally = {L: m['ally'][L] for L in LANES}; enemy = {L: m['enemy'][L] for L in LANES}
    up.append("update public.matches set stars = %d where source = 'sheet' and stars is null and signature = public.veil_signature(%s::date, %s::jsonb, %s::jsonb);" % (
        m['stars'], q(m['date']), q(json.dumps(ally)), q(json.dumps(enemy))))
open(os.path.join(here, 'sheet_stars.sql'), 'w', encoding='utf-8').write('\n'.join(up) + '\n')

# setup.sql = schema + heroes, so the first setup is one paste
open(os.path.join(here, 'setup.sql'), 'w', encoding='utf-8').write(
    open(os.path.join(here, 'schema.sql'), encoding='utf-8').read() + '\n\n' + open(os.path.join(here, 'heroes.sql'), encoding='utf-8').read())

# setup.sql also gets the starting references for the screenshot reader
seeds = os.path.join(here, 'icon_seeds.sql')
if os.path.exists(seeds):
    with open(os.path.join(here, 'setup.sql'), 'a', encoding='utf-8') as f: f.write('\n\n' + open(seeds, encoding='utf-8').read())
