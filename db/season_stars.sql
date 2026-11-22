-- Adds rank stars and the battle number (戦闘番号) to matches, and a current season that only 運営 / 管理者 can change.

-- For a database set up before 2026-11-22 afternoon. Safe to run again.

alter table public.matches add column if not exists stars smallint;
alter table public.matches drop constraint if exists matches_stars_check;
alter table public.matches add constraint matches_stars_check check (stars between 0 and 9999);

alter table public.matches add column if not exists battle_id text;
alter table public.matches drop constraint if exists matches_battle_id_check;
alter table public.matches add constraint matches_battle_id_check check (battle_id ~ '^[0-9]{6,30}$');
create index if not exists matches_battle_idx on public.matches (battle_id) where battle_id is not null;
grant select (stars) on public.matches to anon, authenticated;

-- ---------- the current season: set by 運営 / 管理者, used for every new match ----------
create table if not exists public.settings (key text primary key, value text not null);
alter table public.settings enable row level security;          -- no policies: only the functions read it
revoke all on public.settings from anon, authenticated;
insert into public.settings (key, value) values ('current_season', 'S42') on conflict (key) do nothing;

create or replace function public.current_season() returns text
language sql stable security definer set search_path = '' as $$
  select value from public.settings where key = 'current_season'
$$;

create or replace function public.set_current_season(season text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(public.my_role(), '') not in ('manager', 'admin') then raise exception '運営か管理者だけが変えられます'; end if;
  season := upper(trim(season));
  if season !~ '^S[0-9]{1,3}$' then raise exception 'シーズンは S43 のように入れてください'; end if;
  insert into public.settings (key, value) values ('current_season', season) on conflict (key) do update set value = excluded.value;
end $$;

create or replace function public.submit_match(payload jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  r text;
  lanes text[] := array['EXP', 'JUNGLE', 'MID', 'GOLD', 'ROAM'];
  l text; s text; h text; kd jsonb; me text;
  heroes_all text[] := '{}';
  pending_n int; today_n int;
  sig text; dup bigint; st text; mid bigint; sea text; stars int; bid text;
begin
  if uid is null then raise exception 'ログインが必要です'; end if;
  select role into r from public.profiles where id = uid;
  if r is null then raise exception 'プロフィールが見つかりません。いったんログアウトして入り直してください'; end if;

  select count(*) into pending_n from public.matches where submitted_by = uid and status = 'pending';
  if r = 'member' and pending_n >= 20 then raise exception '承認待ちが20件あります。承認されるまで新しい登録はできません'; end if;
  select count(*) into today_n from public.matches where submitted_by = uid and source = 'form' and created_at > now() - interval '1 day';
  if r not in ('manager', 'admin') and today_n >= 60 then raise exception '1日に登録できるのは60試合までです'; end if;

  if (payload ->> 'played_on') is null or (payload ->> 'played_on')::date not between date '2016-07-01' and current_date + 1 then
    raise exception '日付が正しくありません';
  end if;
  me := payload ->> 'my_lane';
  if me is null or not (me = any (lanes)) then raise exception '自分のレーンを選んでください'; end if;

  foreach s in array array['ally', 'enemy'] loop
    foreach l in array lanes loop
      h := payload -> s ->> l;
      if h is null or not exists (select 1 from public.heroes where id = h) then
        raise exception '% の % のヒーローが正しくありません', case s when 'ally' then '味方' else '敵' end, l;
      end if;
      heroes_all := heroes_all || h;
    end loop;
  end loop;
  if (select count(distinct x) from unnest(heroes_all) x) < 10 then raise exception '同じヒーローが2回入っています'; end if;

  kd := payload -> 'kda' -> 'ally' -> me;
  if kd is null or jsonb_array_length(kd) <> 3 then raise exception '自分のKDAを入れてください'; end if;

  if coalesce(payload ->> 'stars', '') <> '' then
    if (payload ->> 'stars') !~ '^[0-9]{1,4}$' then raise exception '星の数は0〜9999の数字で入れてください'; end if;
    stars := (payload ->> 'stars')::int;
  end if;
  sea := case when r in ('manager', 'admin') and coalesce(payload ->> 'season', '') ~* '^S[0-9]{1,3}$' then upper(payload ->> 'season')
              else public.current_season() end;

  sig := public.veil_signature((payload ->> 'played_on')::date, payload -> 'ally', payload -> 'enemy');
  bid := nullif(regexp_replace(coalesce(payload ->> 'battle_id', ''), '[^0-9]', '', 'g'), '');
  if bid is not null and bid !~ '^[0-9]{6,30}$' then raise exception '戦闘番号が正しくありません'; end if;
  if bid is not null then
    select id into dup from public.matches where battle_id = bid and status <> 'rejected' order by id limit 1;
  end if;
  if dup is null then
    select id into dup from public.matches where signature = sig and status <> 'rejected' order by id limit 1;
  end if;
  st := case when r in ('trusted', 'manager', 'admin') and dup is null then 'approved' else 'pending' end;

  insert into public.matches (submitted_by, status, played_on, season, rank, stars, party, win, duration_sec, note, signature, battle_id, dup_of,
                              reviewed_by, reviewed_at)
  values (uid, st, (payload ->> 'played_on')::date, sea, nullif(payload ->> 'rank', ''), stars,
          nullif(payload ->> 'party', ''), (payload ->> 'win')::boolean, nullif(payload ->> 'duration_sec', '')::int,
          nullif(payload ->> 'note', ''), sig, bid, dup,
          case when st = 'approved' then uid end, case when st = 'approved' then now() end)
  returning id into mid;

  foreach s in array array['ally', 'enemy'] loop
    foreach l in array lanes loop
      kd := payload -> 'kda' -> s -> l;
      insert into public.picks (match_id, side, lane, hero, is_me, k, d, a)
      values (mid, s, l, payload -> s ->> l, s = 'ally' and l = me,
              case when jsonb_typeof(kd) = 'array' then (kd ->> 0)::smallint end,
              case when jsonb_typeof(kd) = 'array' then (kd ->> 1)::smallint end,
              case when jsonb_typeof(kd) = 'array' then (kd ->> 2)::smallint end);
    end loop;
  end loop;
  return jsonb_build_object('id', mid, 'status', st, 'dup_of', dup);
end $$;

drop function if exists public.my_matches(int);
create or replace function public.my_matches(lim int default 200) returns table (
  id bigint, status text, played_on date, season text, rank text, stars smallint, battle_id text, party text, win boolean, duration_sec int,
  my_lane text, my_hero text, k smallint, d smallint, a smallint, reject_reason text, created_at timestamptz, picks jsonb
) language sql stable security definer set search_path = '' as $$
  select m.id, m.status, m.played_on, m.season, m.rank, m.stars, m.battle_id, m.party, m.win, m.duration_sec,
         me.lane, me.hero, me.k, me.d, me.a, m.reject_reason, m.created_at,
         (select jsonb_object_agg(p.side || ':' || p.lane, p.hero) from public.picks p where p.match_id = m.id)
  from public.matches m left join public.picks me on me.match_id = m.id and me.is_me
  where m.submitted_by = auth.uid()
  order by m.played_on desc, m.id desc
  limit least(greatest(lim, 1), 1000)
$$;

drop function if exists public.pending_matches(int);
create or replace function public.pending_matches(lim int default 100) returns table (
  id bigint, played_on date, season text, rank text, stars smallint, battle_id text, party text, win boolean, duration_sec int, note text,
  submitter text, submitter_role text, dup_of bigint, created_at timestamptz, picks jsonb
) language plpgsql stable security definer set search_path = '' as $$
begin
  if coalesce(public.my_role(), '') not in ('manager', 'admin') then raise exception '承認する権限がありません'; end if;
  return query
  select m.id, m.played_on, m.season, m.rank, m.stars, m.battle_id, m.party, m.win, m.duration_sec, m.note, pr.name, pr.role, m.dup_of, m.created_at,
         (select jsonb_agg(jsonb_build_object('side', p.side, 'lane', p.lane, 'hero', p.hero, 'me', p.is_me, 'k', p.k, 'd', p.d, 'a', p.a))
            from public.picks p where p.match_id = m.id)
  from public.matches m left join public.profiles pr on pr.id = m.submitted_by
  where m.status = 'pending'
  order by m.created_at
  limit least(greatest(lim, 1), 500);
end $$;

revoke execute on all functions in schema public from public, anon;

grant execute on function public.submit_match(jsonb), public.my_matches(int), public.pending_matches(int), public.set_current_season(text) to authenticated;

grant execute on function public.current_season() to anon, authenticated;

revoke execute on function public.refresh_stats(), public.trim_matches(), public.handle_new_user(), public.veil_signature(date, jsonb, jsonb) from authenticated;
-- Fills in the rank stars of the matches imported from the sheet. Safe to run again.
update public.matches set stars = 1 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-07-16'::date, '{"EXP": "benedetta", "JUNGLE": "alucard", "MID": "zetian", "GOLD": "lesley", "ROAM": "johnson"}'::jsonb, '{"EXP": "paquito", "JUNGLE": "hirara", "MID": "vexana", "GOLD": "layla", "ROAM": "kaja"}'::jsonb);
update public.matches set stars = 1 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-07-17'::date, '{"EXP": "sora", "JUNGLE": "leomord", "MID": "change", "GOLD": "hanabi", "ROAM": "estes"}'::jsonb, '{"EXP": "lapulapu", "JUNGLE": "ling", "MID": "novaria", "GOLD": "miya", "ROAM": "angela"}'::jsonb);
update public.matches set stars = 1 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-07-17'::date, '{"EXP": "dyrroth", "JUNGLE": "alucard", "MID": "selena", "GOLD": "lesley", "ROAM": "kaja"}'::jsonb, '{"EXP": "minsitthar", "JUNGLE": "alice", "MID": "xavier", "GOLD": "hanabi", "ROAM": "angela"}'::jsonb);
update public.matches set stars = 1 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-07-18'::date, '{"EXP": "esmeralda", "JUNGLE": "yin", "MID": "gord", "GOLD": "ixia", "ROAM": "franco"}'::jsonb, '{"EXP": "argus", "JUNGLE": "fanny", "MID": "harley", "GOLD": "granger", "ROAM": "rafaela"}'::jsonb);
update public.matches set stars = 1 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-07-18'::date, '{"EXP": "cici", "JUNGLE": "yisunshin", "MID": "valir", "GOLD": "zetian", "ROAM": "badang"}'::jsonb, '{"EXP": "sun", "JUNGLE": "ling", "MID": "pharsa", "GOLD": "lesley", "ROAM": "floryn"}'::jsonb);
update public.matches set stars = 1 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-07-18'::date, '{"EXP": "ruby", "JUNGLE": "hayabusa", "MID": "luoyi", "GOLD": "melissa", "ROAM": "grock"}'::jsonb, '{"EXP": "sun", "JUNGLE": "fanny", "MID": "vexana", "GOLD": "lesley", "ROAM": "khufra"}'::jsonb);
update public.matches set stars = 1 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-07-18'::date, '{"EXP": "esmeralda", "JUNGLE": "nolan", "MID": "xavier", "GOLD": "karrie", "ROAM": "hylos"}'::jsonb, '{"EXP": "sora", "JUNGLE": "fredrinn", "MID": "kadita", "GOLD": "hanabi", "ROAM": "estes"}'::jsonb);
update public.matches set stars = 1 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-07-19'::date, '{"EXP": "alice", "JUNGLE": "yisunshin", "MID": "nana", "GOLD": "karrie", "ROAM": "badang"}'::jsonb, '{"EXP": "gloo", "JUNGLE": "karina", "MID": "gord", "GOLD": "granger", "ROAM": "minotaur"}'::jsonb);
update public.matches set stars = 1 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-07-19'::date, '{"EXP": "alice", "JUNGLE": "bane", "MID": "vexana", "GOLD": "karrie", "ROAM": "khufra"}'::jsonb, '{"EXP": "sora", "JUNGLE": "guinevere", "MID": "zetian", "GOLD": "miya", "ROAM": "atlas"}'::jsonb);
update public.matches set stars = 1 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-07-19'::date, '{"EXP": "lapulapu", "JUNGLE": "nolan", "MID": "pharsa", "GOLD": "bruno", "ROAM": "chip"}'::jsonb, '{"EXP": "esmeralda", "JUNGLE": "yisunshin", "MID": "aurora", "GOLD": "irithel", "ROAM": "tigreal"}'::jsonb);
update public.matches set stars = 1 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-07-19'::date, '{"EXP": "ruby", "JUNGLE": "hirara", "MID": "lylia", "GOLD": "brody", "ROAM": "marcel"}'::jsonb, '{"EXP": "sun", "JUNGLE": "hanzo", "MID": "kimmy", "GOLD": "claude", "ROAM": "hylos"}'::jsonb);
update public.matches set stars = 11 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-07-19'::date, '{"EXP": "dyrroth", "JUNGLE": "hirara", "MID": "vale", "GOLD": "brody", "ROAM": "franco"}'::jsonb, '{"EXP": "chou", "JUNGLE": "baxia", "MID": "kagura", "GOLD": "miya", "ROAM": "badang"}'::jsonb);
update public.matches set stars = 11 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-07-19'::date, '{"EXP": "terizla", "JUNGLE": "lancelot", "MID": "valentina", "GOLD": "lesley", "ROAM": "mathilda"}'::jsonb, '{"EXP": "chou", "JUNGLE": "hayabusa", "MID": "gord", "GOLD": "brody", "ROAM": "tigreal"}'::jsonb);
update public.matches set stars = 12 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-07-29'::date, '{"EXP": "chou", "JUNGLE": "ling", "MID": "zetian", "GOLD": "lesley", "ROAM": "hilda"}'::jsonb, '{"EXP": "arlott", "JUNGLE": "bane", "MID": "valir", "GOLD": "claude", "ROAM": "helcurt"}'::jsonb);
update public.matches set stars = 12 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-07-29'::date, '{"EXP": "cici", "JUNGLE": "popolandkupa", "MID": "gord", "GOLD": "moskov", "ROAM": "silvanna"}'::jsonb, '{"EXP": "arlott", "JUNGLE": "yisunshin", "MID": "vexana", "GOLD": "layla", "ROAM": "helcurt"}'::jsonb);
update public.matches set stars = 12 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-07-29'::date, '{"EXP": "ruby", "JUNGLE": "alucard", "MID": "selena", "GOLD": "brody", "ROAM": "hylos"}'::jsonb, '{"EXP": "bane", "JUNGLE": "sun", "MID": "gord", "GOLD": "miya", "ROAM": "belerick"}'::jsonb);
update public.matches set stars = 13 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-08-01'::date, '{"EXP": "guinevere", "JUNGLE": "aulus", "MID": "gord", "GOLD": "lesley", "ROAM": "hilda"}'::jsonb, '{"EXP": "silvanna", "JUNGLE": "lancelot", "MID": "vexana", "GOLD": "ixia", "ROAM": "franco"}'::jsonb);
update public.matches set stars = 14 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-08-01'::date, '{"EXP": "minsitthar", "JUNGLE": "lukas", "MID": "eudora", "GOLD": "miya", "ROAM": "rafaela"}'::jsonb, '{"EXP": "silvanna", "JUNGLE": "martis", "MID": "kimmy", "GOLD": "granger", "ROAM": "saber"}'::jsonb);
update public.matches set stars = 15 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-08-02'::date, '{"EXP": "phoveus", "JUNGLE": "suyou", "MID": "zetian", "GOLD": "lesley", "ROAM": "hylos"}'::jsonb, '{"EXP": "arlott", "JUNGLE": "saber", "MID": "odette", "GOLD": "brody", "ROAM": "johnson"}'::jsonb);
update public.matches set stars = 16 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-08-02'::date, '{"EXP": "terizla", "JUNGLE": "martis", "MID": "change", "GOLD": "lesley", "ROAM": "lolita"}'::jsonb, '{"EXP": "valir", "JUNGLE": "hanzo", "MID": "gord", "GOLD": "granger", "ROAM": "helcurt"}'::jsonb);
update public.matches set stars = 17 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-08-02'::date, '{"EXP": "yuzhong", "JUNGLE": "lancelot", "MID": "eudora", "GOLD": "hanabi", "ROAM": "chip"}'::jsonb, '{"EXP": "benedetta", "JUNGLE": "fanny", "MID": "change", "GOLD": "granger", "ROAM": "atlas"}'::jsonb);
update public.matches set stars = 18 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-08-02'::date, '{"EXP": "paquito", "JUNGLE": "ling", "MID": "kimmy", "GOLD": "melissa", "ROAM": "selena"}'::jsonb, '{"EXP": "argus", "JUNGLE": "yisunshin", "MID": "harley", "GOLD": "irithel", "ROAM": "lolita"}'::jsonb);
update public.matches set stars = 19 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-08-02'::date, '{"EXP": "xborg", "JUNGLE": "paquito", "MID": "cecilion", "GOLD": "clint", "ROAM": "helcurt"}'::jsonb, '{"EXP": "minsitthar", "JUNGLE": "yisunshin", "MID": "vexana", "GOLD": "hanabi", "ROAM": "silvanna"}'::jsonb);
update public.matches set stars = 20 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-08-02'::date, '{"EXP": "esmeralda", "JUNGLE": "fanny", "MID": "valentina", "GOLD": "brody", "ROAM": "hilda"}'::jsonb, '{"EXP": "arlott", "JUNGLE": "balmond", "MID": "gord", "GOLD": "nana", "ROAM": "minotaur"}'::jsonb);
update public.matches set stars = 21 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-08-02'::date, '{"EXP": "lapulapu", "JUNGLE": "dyrroth", "MID": "aurora", "GOLD": "melissa", "ROAM": "belerick"}'::jsonb, '{"EXP": "esmeralda", "JUNGLE": "lancelot", "MID": "zetian", "GOLD": "beatrix", "ROAM": "tigreal"}'::jsonb);
update public.matches set stars = 22 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-08-02'::date, '{"EXP": "minsitthar", "JUNGLE": "hirara", "MID": "valentina", "GOLD": "granger", "ROAM": "badang"}'::jsonb, '{"EXP": "phoveus", "JUNGLE": "ling", "MID": "cyclops", "GOLD": "karrie", "ROAM": "jawhead"}'::jsonb);
update public.matches set stars = 23 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-08-02'::date, '{"EXP": "esmeralda", "JUNGLE": "fanny", "MID": "luoyi", "GOLD": "claude", "ROAM": "carmilla"}'::jsonb, '{"EXP": "lapulapu", "JUNGLE": "ling", "MID": "zetian", "GOLD": "irithel", "ROAM": "guinevere"}'::jsonb);
update public.matches set stars = 57 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-08-03'::date, '{"EXP": "minsitthar", "JUNGLE": "yisunshin", "MID": "vexana", "GOLD": "lesley", "ROAM": "hilda"}'::jsonb, '{"EXP": "benedetta", "JUNGLE": "dyrroth", "MID": "eudora", "GOLD": "miya", "ROAM": "helcurt"}'::jsonb);
update public.matches set stars = 56 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-08-03'::date, '{"EXP": "esmeralda", "JUNGLE": "fanny", "MID": "kadita", "GOLD": "lesley", "ROAM": "mathilda"}'::jsonb, '{"EXP": "martis", "JUNGLE": "hirara", "MID": "zetian", "GOLD": "clint", "ROAM": "kaja"}'::jsonb);
update public.matches set stars = 55 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-08-03'::date, '{"EXP": "minsitthar", "JUNGLE": "nolan", "MID": "gusion", "GOLD": "wanwan", "ROAM": "hylos"}'::jsonb, '{"EXP": "uranus", "JUNGLE": "yisunshin", "MID": "valir", "GOLD": "lesley", "ROAM": "mathilda"}'::jsonb);
update public.matches set stars = 54 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-08-03'::date, '{"EXP": "minsitthar", "JUNGLE": "fanny", "MID": "zetian", "GOLD": "helcurt", "ROAM": "minotaur"}'::jsonb, '{"EXP": "aulus", "JUNGLE": "barats", "MID": "kimmy", "GOLD": "melissa", "ROAM": "rafaela"}'::jsonb);
update public.matches set stars = 53 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-08-03'::date, '{"EXP": "esmeralda", "JUNGLE": "paquito", "MID": "vexana", "GOLD": "clint", "ROAM": "minotaur"}'::jsonb, '{"EXP": "balmond", "JUNGLE": "nolan", "MID": "novaria", "GOLD": "lesley", "ROAM": "rafaela"}'::jsonb);
update public.matches set stars = 52 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-08-03'::date, '{"EXP": "martis", "JUNGLE": "hanzo", "MID": "xavier", "GOLD": "bruno", "ROAM": "belerick"}'::jsonb, '{"EXP": "joy", "JUNGLE": "saber", "MID": "valir", "GOLD": "brody", "ROAM": "badang"}'::jsonb);
update public.matches set stars = 61 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-08-03'::date, '{"EXP": "minsitthar", "JUNGLE": "baxia", "MID": "selena", "GOLD": "granger", "ROAM": "minotaur"}'::jsonb, '{"EXP": "paquito", "JUNGLE": "suyou", "MID": "gord", "GOLD": "claude", "ROAM": "angela"}'::jsonb);
update public.matches set stars = 62 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-08-03'::date, '{"EXP": "khaleed", "JUNGLE": "yisunshin", "MID": "selena", "GOLD": "miya", "ROAM": "mathilda"}'::jsonb, '{"EXP": "chou", "JUNGLE": "aamon", "MID": "eudora", "GOLD": "lesley", "ROAM": "belerick"}'::jsonb);
update public.matches set stars = 61 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-08-03'::date, '{"EXP": "minsitthar", "JUNGLE": "suyou", "MID": "selena", "GOLD": "clint", "ROAM": "rafaela"}'::jsonb, '{"EXP": "paquito", "JUNGLE": "saber", "MID": "eudora", "GOLD": "brody", "ROAM": "mathilda"}'::jsonb);
update public.matches set stars = 60 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-08-03'::date, '{"EXP": "dyrroth", "JUNGLE": "nolan", "MID": "faramis", "GOLD": "lesley", "ROAM": "badang"}'::jsonb, '{"EXP": "sun", "JUNGLE": "gusion", "MID": "zetian", "GOLD": "beatrix", "ROAM": "floryn"}'::jsonb);
update public.matches set stars = 22 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-08-04'::date, '{"EXP": "chou", "JUNGLE": "leomord", "MID": "gord", "GOLD": "miya", "ROAM": "khufra"}'::jsonb, '{"EXP": "sora", "JUNGLE": "lukas", "MID": "cyclops", "GOLD": "moskov", "ROAM": "marcel"}'::jsonb);
update public.matches set stars = 23 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-08-05'::date, '{"EXP": "kaja", "JUNGLE": "guinevere", "MID": "aurora", "GOLD": "hanabi", "ROAM": "angela"}'::jsonb, '{"EXP": "fanny", "JUNGLE": "gusion", "MID": "eudora", "GOLD": "granger", "ROAM": "helcurt"}'::jsonb);
update public.matches set stars = 24 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-08-06'::date, '{"EXP": "terizla", "JUNGLE": "yisunshin", "MID": "nana", "GOLD": "moskov", "ROAM": "johnson"}'::jsonb, '{"EXP": "chou", "JUNGLE": "hanzo", "MID": "kagura", "GOLD": "miya", "ROAM": "minotaur"}'::jsonb);
update public.matches set stars = 25 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-08-06'::date, '{"EXP": "ruby", "JUNGLE": "roger", "MID": "valir", "GOLD": "granger", "ROAM": "johnson"}'::jsonb, '{"EXP": "zilong", "JUNGLE": "hanzo", "MID": "vexana", "GOLD": "clint", "ROAM": "minotaur"}'::jsonb);
update public.matches set stars = 27 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-08-07'::date, '{"EXP": "chou", "JUNGLE": "fanny", "MID": "cyclops", "GOLD": "layla", "ROAM": "minotaur"}'::jsonb, '{"EXP": "balmond", "JUNGLE": "julian", "MID": "pharsa", "GOLD": "ixia", "ROAM": "angela"}'::jsonb);
update public.matches set stars = 26 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-08-07'::date, '{"EXP": "masha", "JUNGLE": "alpha", "MID": "cyclops", "GOLD": "popolandkupa", "ROAM": "hilda"}'::jsonb, '{"EXP": "silvanna", "JUNGLE": "hirara", "MID": "valentina", "GOLD": "hanabi", "ROAM": "khufra"}'::jsonb);
update public.matches set stars = 27 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-08-08'::date, '{"EXP": "argus", "JUNGLE": "hirara", "MID": "novaria", "GOLD": "miya", "ROAM": "floryn"}'::jsonb, '{"EXP": "guinevere", "JUNGLE": "yisunshin", "MID": "xavier", "GOLD": "moskov", "ROAM": "minotaur"}'::jsonb);
update public.matches set stars = 28 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-08-08'::date, '{"EXP": "aldous", "JUNGLE": "lukas", "MID": "eudora", "GOLD": "brody", "ROAM": "kaja"}'::jsonb, '{"EXP": "dyrroth", "JUNGLE": "hirara", "MID": "aurora", "GOLD": "hanabi", "ROAM": "minotaur"}'::jsonb);
update public.matches set stars = 28 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-08-08'::date, '{"EXP": "freya", "JUNGLE": "joy", "MID": "yve", "GOLD": "claude", "ROAM": "gloo"}'::jsonb, '{"EXP": "argus", "JUNGLE": "lancelot", "MID": "lylia", "GOLD": "irithel", "ROAM": "belerick"}'::jsonb);
update public.matches set stars = 28 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-08-08'::date, '{"EXP": "thamuz", "JUNGLE": "alucard", "MID": "zetian", "GOLD": "hanabi", "ROAM": "belerick"}'::jsonb, '{"EXP": "benedetta", "JUNGLE": "lukas", "MID": "nana", "GOLD": "ixia", "ROAM": "atlas"}'::jsonb);
update public.matches set stars = 28 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-08-08'::date, '{"EXP": "sun", "JUNGLE": "hayabusa", "MID": "eudora", "GOLD": "popolandkupa", "ROAM": "lolita"}'::jsonb, '{"EXP": "chou", "JUNGLE": "nolan", "MID": "change", "GOLD": "hanabi", "ROAM": "selena"}'::jsonb);
update public.matches set stars = 29 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-08-08'::date, '{"EXP": "edith", "JUNGLE": "alice", "MID": "novaria", "GOLD": "harith", "ROAM": "angela"}'::jsonb, '{"EXP": "eudora", "JUNGLE": "popolandkupa", "MID": "change", "GOLD": "obsidia", "ROAM": "atlas"}'::jsonb);
update public.matches set stars = 28 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-08-08'::date, '{"EXP": "gatotkaca", "JUNGLE": "fanny", "MID": "valir", "GOLD": "miya", "ROAM": "minotaur"}'::jsonb, '{"EXP": "esmeralda", "JUNGLE": "harley", "MID": "kadita", "GOLD": "melissa", "ROAM": "atlas"}'::jsonb);
update public.matches set stars = 28 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-08-08'::date, '{"EXP": "phoveus", "JUNGLE": "lancelot", "MID": "pharsa", "GOLD": "hanabi", "ROAM": "franco"}'::jsonb, '{"EXP": "dyrroth", "JUNGLE": "hanzo", "MID": "kagura", "GOLD": "karrie", "ROAM": "rafaela"}'::jsonb);
update public.matches set stars = 29 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-08-08'::date, '{"EXP": "akai", "JUNGLE": "ling", "MID": "gord", "GOLD": "claude", "ROAM": "badang"}'::jsonb, '{"EXP": "phoveus", "JUNGLE": "yisunshin", "MID": "aurora", "GOLD": "melissa", "ROAM": "chou"}'::jsonb);
update public.matches set stars = 30 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-08-09'::date, '{"EXP": "natalia", "JUNGLE": "ling", "MID": "valentina", "GOLD": "claude", "ROAM": "chou"}'::jsonb, '{"EXP": "gatotkaca", "JUNGLE": "yisunshin", "MID": "novaria", "GOLD": "harith", "ROAM": "johnson"}'::jsonb);
update public.matches set stars = 29 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-08-09'::date, '{"EXP": "arlott", "JUNGLE": "bane", "MID": "vexana", "GOLD": "hanabi", "ROAM": "kaja"}'::jsonb, '{"EXP": "minsitthar", "JUNGLE": "aamon", "MID": "lunox", "GOLD": "miya", "ROAM": "khufra"}'::jsonb);
update public.matches set stars = 30 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-08-09'::date, '{"EXP": "yuzhong", "JUNGLE": "paquito", "MID": "vale", "GOLD": "moskov", "ROAM": "guinevere"}'::jsonb, '{"EXP": "sun", "JUNGLE": "harley", "MID": "novaria", "GOLD": "brody", "ROAM": "khufra"}'::jsonb);
update public.matches set stars = 31 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-08-09'::date, '{"EXP": "arlott", "JUNGLE": "hanzo", "MID": "luoyi", "GOLD": "hanabi", "ROAM": "guinevere"}'::jsonb, '{"EXP": "phoveus", "JUNGLE": "sun", "MID": "vale", "GOLD": "lesley", "ROAM": "grock"}'::jsonb);
update public.matches set stars = 31 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-08-09'::date, '{"EXP": "uranus", "JUNGLE": "hanzo", "MID": "eudora", "GOLD": "layla", "ROAM": "gloo"}'::jsonb, '{"EXP": "dyrroth", "JUNGLE": "silvanna", "MID": "cyclops", "GOLD": "bruno", "ROAM": "franco"}'::jsonb);
update public.matches set stars = 30 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-08-09'::date, '{"EXP": "balmond", "JUNGLE": "roger", "MID": "novaria", "GOLD": "natan", "ROAM": "marcel"}'::jsonb, '{"EXP": "martis", "JUNGLE": "lancelot", "MID": "xavier", "GOLD": "irithel", "ROAM": "chou"}'::jsonb);
update public.matches set stars = 29 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-08-09'::date, '{"EXP": "kalea", "JUNGLE": "fredrinn", "MID": "gord", "GOLD": "natan", "ROAM": "minotaur"}'::jsonb, '{"EXP": "bane", "JUNGLE": "popolandkupa", "MID": "cyclops", "GOLD": "miya", "ROAM": "atlas"}'::jsonb);
update public.matches set stars = 30 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-08-09'::date, '{"EXP": "zhuxin", "JUNGLE": "martis", "MID": "eudora", "GOLD": "melissa", "ROAM": "atlas"}'::jsonb, '{"EXP": "xborg", "JUNGLE": "paquito", "MID": "zetian", "GOLD": "layla", "ROAM": "marcel"}'::jsonb);
update public.matches set stars = 29 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-08-09'::date, '{"EXP": "julian", "JUNGLE": "thamuz", "MID": "zhask", "GOLD": "miya", "ROAM": "rafaela"}'::jsonb, '{"EXP": "phoveus", "JUNGLE": "harley", "MID": "selena", "GOLD": "silvanna", "ROAM": "angela"}'::jsonb);
update public.matches set stars = 30 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-08-09'::date, '{"EXP": "lapulapu", "JUNGLE": "yin", "MID": "gord", "GOLD": "claude", "ROAM": "diggie"}'::jsonb, '{"EXP": "julian", "JUNGLE": "leomord", "MID": "eudora", "GOLD": "ixia", "ROAM": "badang"}'::jsonb);
update public.matches set stars = 31 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-08-09'::date, '{"EXP": "phoveus", "JUNGLE": "lukas", "MID": "eudora", "GOLD": "ixia", "ROAM": "carmilla"}'::jsonb, '{"EXP": "arlott", "JUNGLE": "saber", "MID": "novaria", "GOLD": "hanabi", "ROAM": "khufra"}'::jsonb);
update public.matches set stars = 32 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-08-09'::date, '{"EXP": "argus", "JUNGLE": "saber", "MID": "kimmy", "GOLD": "franco", "ROAM": "belerick"}'::jsonb, '{"EXP": "freya", "JUNGLE": "popolandkupa", "MID": "selena", "GOLD": "miya", "ROAM": "rafaela"}'::jsonb);
update public.matches set stars = 64 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-08-10'::date, '{"EXP": "phoveus", "JUNGLE": "hayabusa", "MID": "cecilion", "GOLD": "minsitthar", "ROAM": "hylos"}'::jsonb, '{"EXP": "silvanna", "JUNGLE": "yin", "MID": "cyclops", "GOLD": "karrie", "ROAM": "atlas"}'::jsonb);
update public.matches set stars = 31 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-08-10'::date, '{"EXP": "arlott", "JUNGLE": "lancelot", "MID": "odette", "GOLD": "obsidia", "ROAM": "minotaur"}'::jsonb, '{"EXP": "barats", "JUNGLE": "akai", "MID": "kadita", "GOLD": "lesley", "ROAM": "franco"}'::jsonb);
update public.matches set stars = 30 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-08-10'::date, '{"EXP": "badang", "JUNGLE": "hirara", "MID": "harley", "GOLD": "miya", "ROAM": "sun"}'::jsonb, '{"EXP": "uranus", "JUNGLE": "xborg", "MID": "change", "GOLD": "layla", "ROAM": "saber"}'::jsonb);
update public.matches set stars = 35 where source = 'sheet' and stars is null and signature = public.veil_signature('2026-08-11'::date, '{"EXP": "arlott", "JUNGLE": "paquito", "MID": "gord", "GOLD": "layla", "ROAM": "floryn"}'::jsonb, '{"EXP": "esmeralda", "JUNGLE": "aamon", "MID": "kagura", "GOLD": "obsidia", "ROAM": "atlas"}'::jsonb);
select public.refresh_stats();
