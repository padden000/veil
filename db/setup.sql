-- =====================================================================
-- VEIL database (Supabase / PostgreSQL)
-- Paste the whole file into Supabase → SQL Editor → Run, once.
-- Viewing: anyone (only approved matches are counted).
-- Submitting: Discord login. Normal users' matches wait for approval;
-- trusted users' matches count at once (unless they look like a duplicate).
-- No passwords are stored here: login is handled by Supabase Auth + Discord.
-- =====================================================================

-- ---------- heroes (ids match the site: art/<id>.webp, #champion-<id>) ----------
create table if not exists public.heroes (
  id    text primary key check (id ~ '^[a-z]+$'),
  en    text not null,
  jp    text not null,
  cls   text,
  sub   text
);

-- ---------- profiles: one row per logged-in user ----------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null default '',
  role        text not null default 'member' check (role in ('member', 'trusted', 'manager', 'admin')),
  created_at  timestamptz not null default now()
);

-- a profile is made automatically the first time someone logs in with Discord
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'user_name', ''))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.my_role() returns text
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = auth.uid()
$$;

-- ---------- matches + the 10 picks of each match ----------
create table if not exists public.matches (
  id             bigint generated always as identity primary key,
  submitted_by   uuid references public.profiles (id) on delete set null,
  status         text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  played_on      date not null,
  season         text check (char_length(season) <= 10),
  rank           text check (char_length(rank) <= 30),
  party          text check (party in ('Solo', 'Duo', 'Trio', '5-stack')),
  win            boolean not null,               -- result for the submitter's team ("ally")
  duration_sec   int check (duration_sec between 60 and 3600),
  note           text check (char_length(note) <= 300),
  source         text not null default 'form' check (source in ('form', 'sheet')),
  signature      text not null,                  -- date + the 10 heroes, sorted: finds the same match sent twice
  dup_of         bigint references public.matches (id) on delete set null,
  reviewed_by    uuid references public.profiles (id) on delete set null,
  reviewed_at    timestamptz,
  reject_reason  text check (char_length(reject_reason) <= 200),
  created_at     timestamptz not null default now()
);
create index if not exists matches_status_idx on public.matches (status, played_on desc);
create index if not exists matches_by_idx on public.matches (submitted_by, created_at desc);
create index if not exists matches_sig_idx on public.matches (signature);

create table if not exists public.picks (
  match_id  bigint not null references public.matches (id) on delete cascade,
  side      text not null check (side in ('ally', 'enemy')),
  lane      text not null check (lane in ('EXP', 'JUNGLE', 'MID', 'GOLD', 'ROAM')),
  hero      text not null references public.heroes (id),
  is_me     boolean not null default false,       -- the submitter's own hero (ally side only)
  k         smallint check (k between 0 and 99),
  d         smallint check (d between 0 and 99),
  a         smallint check (a between 0 and 99),
  primary key (match_id, side, lane),
  check (not is_me or side = 'ally')
);
create index if not exists picks_hero_idx on public.picks (hero, lane);
create unique index if not exists picks_one_me on public.picks (match_id) where is_me;

-- ---------- row level security: nothing is readable or writable directly except below ----------
alter table public.heroes   enable row level security;
alter table public.profiles enable row level security;
alter table public.matches  enable row level security;
alter table public.picks    enable row level security;

drop policy if exists heroes_read on public.heroes;
create policy heroes_read on public.heroes for select to anon, authenticated using (true);

drop policy if exists profiles_self on public.profiles;
create policy profiles_self on public.profiles for select to authenticated using (id = auth.uid());

-- approved matches are public, but without who sent them
drop policy if exists matches_public on public.matches;
create policy matches_public on public.matches for select to anon, authenticated using (status = 'approved');
revoke all on public.matches from anon, authenticated;
grant select (id, status, played_on, season, rank, party, win, duration_sec, source, created_at) on public.matches to anon, authenticated;

drop policy if exists picks_public on public.picks;
create policy picks_public on public.picks for select to anon, authenticated
  using (exists (select 1 from public.matches m where m.id = match_id and m.status = 'approved'));
revoke all on public.picks from anon, authenticated;
grant select (match_id, side, lane, hero, k, d, a) on public.picks to anon, authenticated;   -- is_me stays private

revoke all on public.profiles from anon, authenticated;
grant select (id, name, role, created_at) on public.profiles to authenticated;
grant select on public.heroes to anon, authenticated;

-- ---------- helpers ----------
create or replace function public.veil_signature(p_date date, p_ally jsonb, p_enemy jsonb) returns text
language sql immutable set search_path = '' as $$
  select p_date::text || ':' || string_agg(h, ',' order by h)
  from (select value as h from jsonb_each_text(p_ally) union all select value from jsonb_each_text(p_enemy)) x
$$;

-- ---------- submit a match (the only way to add one) ----------
-- payload:
-- { "played_on":"2026-11-20", "season":"S42", "rank":"Mythic", "party":"Solo", "win":true, "duration_sec":862, "note":"",
--   "my_lane":"GOLD",
--   "ally":  {"EXP":"benedetta","JUNGLE":"alucard","MID":"zetian","GOLD":"lesley","ROAM":"johnson"},
--   "enemy": {...same lanes...},
--   "kda":   {"ally":{"GOLD":[5,1,7], ...}, "enemy":{...}}    -- own KDA required, the rest optional }
create or replace function public.submit_match(payload jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  r text;
  lanes text[] := array['EXP', 'JUNGLE', 'MID', 'GOLD', 'ROAM'];
  l text; s text; h text; kd jsonb; me text;
  heroes_all text[] := '{}';
  pending_n int; today_n int;
  sig text; dup bigint; st text; mid bigint;
begin
  if uid is null then raise exception 'ログインが必要です'; end if;
  select role into r from public.profiles where id = uid;
  if r is null then raise exception 'プロフィールが見つかりません。いったんログアウトして入り直してください'; end if;

  select count(*) into pending_n from public.matches where submitted_by = uid and status = 'pending';
  if r = 'member' and pending_n >= 20 then raise exception '承認待ちが20件あります。承認されるまで新しい登録はできません'; end if;
  select count(*) into today_n from public.matches where submitted_by = uid and created_at > now() - interval '1 day';
  if today_n >= 60 then raise exception '1日に登録できるのは60試合までです'; end if;

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

  sig := public.veil_signature((payload ->> 'played_on')::date, payload -> 'ally', payload -> 'enemy');
  select id into dup from public.matches where signature = sig and status <> 'rejected' order by id limit 1;
  st := case when r in ('trusted', 'manager', 'admin') and dup is null then 'approved' else 'pending' end;

  insert into public.matches (submitted_by, status, played_on, season, rank, party, win, duration_sec, note, signature, dup_of,
                              reviewed_by, reviewed_at)
  values (uid, st, (payload ->> 'played_on')::date, nullif(payload ->> 'season', ''), nullif(payload ->> 'rank', ''),
          nullif(payload ->> 'party', ''), (payload ->> 'win')::boolean, nullif(payload ->> 'duration_sec', '')::int,
          nullif(payload ->> 'note', ''), sig, dup,
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

-- ---------- the user's own matches (any status) with their own hero ----------
create or replace function public.my_matches(lim int default 200) returns table (
  id bigint, status text, played_on date, rank text, party text, win boolean, duration_sec int,
  my_lane text, my_hero text, k smallint, d smallint, a smallint, reject_reason text, created_at timestamptz, picks jsonb
) language sql stable security definer set search_path = '' as $$
  select m.id, m.status, m.played_on, m.rank, m.party, m.win, m.duration_sec,
         me.lane, me.hero, me.k, me.d, me.a, m.reject_reason, m.created_at,
         (select jsonb_object_agg(p.side || ':' || p.lane, p.hero) from public.picks p where p.match_id = m.id)
  from public.matches m left join public.picks me on me.match_id = m.id and me.is_me
  where m.submitted_by = auth.uid()
  order by m.played_on desc, m.id desc
  limit least(greatest(lim, 1), 1000)
$$;

-- a pending or rejected match can be withdrawn by the person who sent it
create or replace function public.withdraw_match(match_id bigint) returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.matches where id = match_id and submitted_by = auth.uid() and status <> 'approved';
  if not found then raise exception '取り下げられるのは、自分の承認前の試合だけです'; end if;
end $$;

-- ---------- approval (運営 and 管理者) ----------
create or replace function public.pending_matches(lim int default 100) returns table (
  id bigint, played_on date, rank text, party text, win boolean, duration_sec int, note text,
  submitter text, submitter_role text, dup_of bigint, created_at timestamptz, picks jsonb
) language plpgsql stable security definer set search_path = '' as $$
begin
  if coalesce(public.my_role(), '') not in ('manager', 'admin') then raise exception '承認する権限がありません'; end if;
  return query
  select m.id, m.played_on, m.rank, m.party, m.win, m.duration_sec, m.note, pr.name, pr.role, m.dup_of, m.created_at,
         (select jsonb_agg(jsonb_build_object('side', p.side, 'lane', p.lane, 'hero', p.hero, 'me', p.is_me, 'k', p.k, 'd', p.d, 'a', p.a))
            from public.picks p where p.match_id = m.id)
  from public.matches m left join public.profiles pr on pr.id = m.submitted_by
  where m.status = 'pending'
  order by m.created_at
  limit least(greatest(lim, 1), 500);
end $$;

create or replace function public.review_match(match_id bigint, approve boolean, reason text default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(public.my_role(), '') not in ('manager', 'admin') then raise exception '承認する権限がありません'; end if;
  update public.matches
     set status = case when approve then 'approved' else 'rejected' end,
         reject_reason = case when approve then null else left(reason, 200) end,
         reviewed_by = auth.uid(), reviewed_at = now()
   where id = match_id and status = 'pending';
  if not found then raise exception 'この試合はもう処理されています'; end if;
end $$;

-- ---------- people and roles ----------
-- roles, low to high:
--   member   一般          submits; matches wait for approval
--   trusted  信頼ユーザー  submits; matches count at once (unless a duplicate)
--   manager  運営          + approves / rejects pending matches, and moves people between member and trusted
--   admin    管理者        everything, including making managers and admins
create or replace function public.list_profiles() returns table (
  id uuid, name text, role text, created_at timestamptz, approved bigint, pending bigint
) language plpgsql stable security definer set search_path = '' as $$
begin
  if coalesce(public.my_role(), '') not in ('manager', 'admin') then raise exception '運営か管理者だけが使えます'; end if;
  return query
  select p.id, p.name, p.role, p.created_at,
         (select count(*) from public.matches m where m.submitted_by = p.id and m.status = 'approved'),
         (select count(*) from public.matches m where m.submitted_by = p.id and m.status = 'pending')
  from public.profiles p order by p.created_at;
end $$;

create or replace function public.set_role(target uuid, new_role text) returns void
language plpgsql security definer set search_path = '' as $$
declare me text := coalesce(public.my_role(), ''); cur text;
begin
  if me not in ('manager', 'admin') then raise exception '運営か管理者だけが使えます'; end if;
  if new_role not in ('member', 'trusted', 'manager', 'admin') then raise exception '役割が正しくありません'; end if;
  select role into cur from public.profiles where id = target;
  if cur is null then raise exception 'その人が見つかりません'; end if;
  if target = auth.uid() then raise exception '自分の役割は変えられません'; end if;
  if me = 'manager' and (cur in ('manager', 'admin') or new_role in ('manager', 'admin')) then
    raise exception '運営が変えられるのは、一般と信頼ユーザーのあいだだけです';
  end if;
  update public.profiles set role = new_role where id = target;
end $$;

-- ---------- public statistics (approved matches only), refreshed on a schedule ----------
-- The site reads only these small totals, never the raw matches, so the amount sent per visit
-- stays about the same however many matches are stored.
drop materialized view if exists public.stats_hero_lane;
drop materialized view if exists public.stats_hero;
create materialized view public.stats_hero as                 -- per hero × lane × rank × month
  select p.hero, p.lane, coalesce(m.rank, '') as rank, to_char(m.played_on, 'YYYY-MM') as month,
         count(*)::int as games, count(*) filter (where (p.side = 'ally') = m.win)::int as wins
  from public.picks p join public.matches m on m.id = p.match_id
  where m.status = 'approved'
  group by 1, 2, 3, 4;
create unique index on public.stats_hero (hero, lane, rank, month);

drop materialized view if exists public.stats_top_pairs;
drop materialized view if exists public.stats_vs;
create materialized view public.stats_vs as                   -- hero against the enemy in the same lane
  select p.hero, p.lane, o.hero as opp,
         count(*)::int as games, count(*) filter (where (p.side = 'ally') = m.win)::int as wins
  from public.picks p
  join public.picks o on o.match_id = p.match_id and o.lane = p.lane and o.side <> p.side
  join public.matches m on m.id = p.match_id
  where m.status = 'approved'
  group by 1, 2, 3;
create unique index on public.stats_vs (hero, lane, opp);

drop materialized view if exists public.stats_mates;
create materialized view public.stats_mates as                -- hero (in a lane) with each teammate
  select p.hero, p.lane, t.hero as mate,
         count(*)::int as games, count(*) filter (where (p.side = 'ally') = m.win)::int as wins
  from public.picks p
  join public.picks t on t.match_id = p.match_id and t.side = p.side and t.lane <> p.lane
  join public.matches m on m.id = p.match_id
  where m.status = 'approved'
  group by 1, 2, 3;
create unique index on public.stats_mates (hero, lane, mate);

drop materialized view if exists public.stats_top_pairs;
create materialized view public.stats_top_pairs as            -- the most-played lane matchups (each pair once)
  select hero, lane, opp, games, wins from public.stats_vs
  where hero < opp order by games desc, wins::float / games desc limit 30;
create unique index on public.stats_top_pairs (hero, lane, opp);

drop materialized view if exists public.stats_recent_lanes;
create materialized view public.stats_recent_lanes as         -- lanes played in the newest 1000 approved matches (roulette)
  with recent as (select id from public.matches where status = 'approved' order by played_on desc, id desc limit 1000)
  select p.hero, p.lane, count(*)::int as games
  from public.picks p join recent r on r.id = p.match_id
  group by 1, 2;
create unique index on public.stats_recent_lanes (hero, lane);

drop materialized view if exists public.stats_summary;
create materialized view public.stats_summary as
  select 1 as id, count(*)::int as matches, min(played_on) as first_on, max(played_on) as last_on,
         coalesce(array_agg(distinct rank) filter (where rank is not null), '{}') as ranks,
         least(count(*), 1000)::int as recent_n, now() as refreshed_at
  from public.matches where status = 'approved';
create unique index on public.stats_summary (id);

grant select on public.stats_hero, public.stats_vs, public.stats_mates, public.stats_top_pairs, public.stats_recent_lanes, public.stats_summary to anon, authenticated;

create or replace function public.refresh_stats() returns void
language plpgsql security definer set search_path = '' as $$
begin
  refresh materialized view concurrently public.stats_hero;
  refresh materialized view concurrently public.stats_vs;
  refresh materialized view concurrently public.stats_mates;
  refresh materialized view concurrently public.stats_top_pairs;
  refresh materialized view concurrently public.stats_recent_lanes;
  refresh materialized view concurrently public.stats_summary;
end $$;

-- ---------- the user marks which ally was them in one of their own matches (null = unmark) ----------
create or replace function public.set_my_lane(match_id bigint, lane text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.matches m where m.id = set_my_lane.match_id and m.submitted_by = auth.uid()) then
    raise exception '自分が登録した試合だけ選べます';
  end if;
  if lane is not null and lane not in ('EXP', 'JUNGLE', 'MID', 'GOLD', 'ROAM') then raise exception 'レーンが正しくありません'; end if;
  update public.picks p set is_me = false where p.match_id = set_my_lane.match_id and p.is_me;
  if lane is not null then
    update public.picks p set is_me = true where p.match_id = set_my_lane.match_id and p.side = 'ally' and p.lane = set_my_lane.lane;
  end if;
end $$;

-- ---------- who may call what ----------
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.submit_match(jsonb), public.my_matches(int), public.withdraw_match(bigint),
                          public.pending_matches(int), public.review_match(bigint, boolean, text),
                          public.list_profiles(), public.set_role(uuid, text), public.my_role(),
                          public.set_my_lane(bigint, text) to authenticated;
-- refresh_stats() and handle_new_user() are not callable from the site

-- ---------- how many matches to keep (oldest are deleted once a day) ----------
-- Change the number any time:  update public.settings set value = '50000' where key = 'max_matches';
create table if not exists public.settings (key text primary key, value text not null);
alter table public.settings enable row level security;          -- no policies: only the functions below read it
revoke all on public.settings from anon, authenticated;
insert into public.settings (key, value) values ('max_matches', '100000') on conflict (key) do nothing;
create index if not exists matches_age_idx on public.matches (status, played_on desc, id desc);
create index if not exists matches_dup_idx on public.matches (dup_of) where dup_of is not null;   -- keeps deletes fast

-- keeps the newest <max_matches> approved matches (by play date), deletes the rest with their picks;
-- rejected matches are deleted after 30 days. Returns how many matches were deleted.
create or replace function public.trim_matches() returns int
language plpgsql security definer set search_path = '' as $$
declare cap int; cut_on date; cut_id bigint; n int := 0; r int;
begin
  select value::int into cap from public.settings where key = 'max_matches';
  if cap is null or cap < 1000 then return 0; end if;
  select played_on, id into cut_on, cut_id from public.matches
   where status = 'approved' order by played_on desc, id desc offset cap - 1 limit 1;
  if cut_id is not null then
    delete from public.matches where status = 'approved' and (played_on, id) < (cut_on, cut_id);
    get diagnostics n = row_count;
  end if;
  delete from public.matches where status = 'rejected' and reviewed_at < now() - interval '30 days';
  get diagnostics r = row_count;
  return n + r;
end $$;
revoke execute on function public.trim_matches() from public, anon, authenticated;


-- ---------- schedules: statistics every 15 minutes, old matches trimmed once a day ----------
create extension if not exists pg_cron;
select cron.schedule('veil-refresh-stats', '*/15 * * * *', 'select public.refresh_stats()');
select cron.schedule('veil-trim-matches', '0 19 * * *', 'select public.trim_matches()');   -- every day 04:00 JST
select public.refresh_stats();


-- VEIL heroes (133). Safe to run again: updates names and classes.
insert into public.heroes (id, en, jp, cls, sub) values
  ('aamon', 'Aamon', 'アモン', 'Assassin', 'Mage'),
  ('akai', 'Akai', 'ガイ', 'Tank', null),
  ('aldous', 'Aldous', 'アルダス', 'Fighter', null),
  ('alice', 'Alice', 'アリス', 'Mage', 'Tank'),
  ('alpha', 'Alpha', 'アルファ', 'Fighter', null),
  ('alucard', 'Alucard', 'アルカード', 'Fighter', 'Assassin'),
  ('angela', 'Angela', 'アンジェラ', 'Support', 'Mage'),
  ('argus', 'Argus', 'アルゴス', 'Fighter', null),
  ('arlott', 'Arlott', 'アーロット', 'Fighter', 'Tank'),
  ('atlas', 'Atlas', 'アテラス', 'Tank', 'Support'),
  ('aulus', 'Aulus', 'アウルス', 'Fighter', null),
  ('aurora', 'Aurora', 'オーロラ', 'Mage', null),
  ('badang', 'Badang', 'バターン', 'Fighter', null),
  ('balmond', 'Balmond', 'バルモンド', 'Fighter', 'Tank'),
  ('bane', 'Bane', 'ベイン', 'Fighter', 'Mage'),
  ('barats', 'Barats', 'バラッツ', 'Tank', 'Fighter'),
  ('baxia', 'Baxia', '玄覇', 'Tank', null),
  ('beatrix', 'Beatrix', 'ベアトリクス', 'Marksman', null),
  ('belerick', 'Belerick', 'べレリック', 'Tank', null),
  ('benedetta', 'Benedetta', 'ベラ', 'Assassin', null),
  ('brody', 'Brody', 'ブロディ', 'Marksman', null),
  ('bruno', 'Bruno', 'ブルーノ', 'Marksman', null),
  ('carmilla', 'Carmilla', 'カーミラ', 'Support', 'Tank'),
  ('cecilion', 'Cecilion', 'セシリオン', 'Mage', null),
  ('change', 'Chang''e', '嫦娥', 'Mage', null),
  ('chip', 'Chip', 'チップ', 'Tank', 'Support'),
  ('chou', 'Chou', 'シュウ', 'Fighter', 'Tank'),
  ('cici', 'Cici', 'シーシー', 'Fighter', null),
  ('claude', 'Claude', 'クラウド', 'Marksman', null),
  ('clint', 'Clint', 'クリント', 'Marksman', null),
  ('cyclops', 'Cyclops', 'サイクロプス', 'Mage', null),
  ('diggie', 'Diggie', 'ディガー', 'Support', null),
  ('dyrroth', 'Dyrroth', 'ディアス', 'Fighter', null),
  ('edith', 'Edith', 'イーディス', 'Tank', 'Marksman'),
  ('esmeralda', 'Esmeralda', 'エスメラルダ', 'Mage', 'Tank'),
  ('estes', 'Estes', 'エスタス', 'Support', null),
  ('eudora', 'Eudora', 'エウドラ', 'Mage', null),
  ('fanny', 'Fanny', 'ファニー', 'Assassin', null),
  ('faramis', 'Faramis', 'ファラミス', 'Support', 'Mage'),
  ('floryn', 'Floryn', 'フローラ', 'Support', null),
  ('franco', 'Franco', 'フランコ', 'Tank', null),
  ('fredrinn', 'Fredrinn', 'フレッドリン', 'Tank', 'Fighter'),
  ('freya', 'Freya', 'フレイヤ', 'Fighter', null),
  ('gatotkaca', 'Gatotkaca', 'ガトートカチャ', 'Tank', 'Fighter'),
  ('gloo', 'Gloo', 'グルー', 'Tank', null),
  ('gord', 'Gord', 'グールド', 'Mage', null),
  ('granger', 'Granger', 'グレンジャー', 'Marksman', null),
  ('grock', 'Grock', 'ガレック', 'Tank', 'Fighter'),
  ('guinevere', 'Guinevere', 'グィネヴィア', 'Fighter', 'Mage'),
  ('gusion', 'Gusion', 'ゴセン', 'Assassin', 'Mage'),
  ('hanabi', 'Hanabi', 'ハナビ', 'Marksman', null),
  ('hanzo', 'Hanzo', '半蔵', 'Assassin', null),
  ('harith', 'Harith', 'ハリス', 'Mage', null),
  ('harley', 'Harley', 'ハーリー', 'Mage', 'Assassin'),
  ('hayabusa', 'Hayabusa', '隼', 'Assassin', null),
  ('helcurt', 'Helcurt', 'ハカート', 'Assassin', null),
  ('hilda', 'Hilda', 'ヒルダ', 'Tank', 'Fighter'),
  ('hylos', 'Hylos', 'ヒロス', 'Tank', null),
  ('ixia', 'Ixia', 'イクシア', 'Marksman', null),
  ('irithel', 'Irithel', 'エレシル', 'Marksman', null),
  ('jawhead', 'Jawhead', 'メタルヘッド', 'Fighter', 'Tank'),
  ('johnson', 'Johnson', 'ジェイソン', 'Tank', null),
  ('joy', 'Joy', 'ジョイ', 'Assassin', null),
  ('julian', 'Julian', 'ジュリアン', 'Fighter', 'Mage'),
  ('kadita', 'Kadita', 'カティタ', 'Mage', 'Assassin'),
  ('kagura', 'Kagura', 'カグラ', 'Mage', null),
  ('kaja', 'Kaja', 'カチャ', 'Support', 'Fighter'),
  ('karina', 'Karina', 'カリナ', 'Assassin', 'Mage'),
  ('karrie', 'Karrie', 'キャリー', 'Marksman', null),
  ('khaleed', 'Khaleed', 'カレード', 'Fighter', null),
  ('khufra', 'Khufra', 'クッフラー', 'Tank', null),
  ('kimmy', 'Kimmy', 'キミー', 'Marksman', 'Mage'),
  ('lancelot', 'Lancelot', 'ランスロット', 'Assassin', null),
  ('lapulapu', 'Lapu-Lapu', 'ラプラプ', 'Fighter', null),
  ('layla', 'Layla', 'ライラ', 'Marksman', null),
  ('leomord', 'Leomord', 'レオモルド', 'Fighter', null),
  ('lesley', 'Lesley', 'ラズリー', 'Marksman', 'Assassin'),
  ('ling', 'Ling', 'リン', 'Assassin', null),
  ('lolita', 'Lolita', 'ロイン', 'Tank', 'Support'),
  ('lukas', 'Lukas', 'ルーカス', 'Fighter', null),
  ('luoyi', 'Luo Yi', 'ローイー', 'Mage', null),
  ('lunox', 'Lunox', '星夢', 'Mage', null),
  ('lylia', 'Lylia', 'リリア', 'Mage', null),
  ('martis', 'Martis', 'マーティス', 'Fighter', 'Assassin'),
  ('masha', 'Masha', 'マーシャ', 'Fighter', 'Tank'),
  ('mathilda', 'Mathilda', 'マチルダ', 'Support', 'Assassin'),
  ('melissa', 'Melissa', 'メリッサ', 'Marksman', null),
  ('minotaur', 'Minotaur', 'ミノタウロス', 'Tank', 'Support'),
  ('minsitthar', 'Minsitthar', 'マイシータール', 'Fighter', null),
  ('miya', 'Miya', 'マイヤ', 'Marksman', null),
  ('moskov', 'Moskov', 'モスコブ', 'Marksman', null),
  ('nana', 'Nana', 'ナナ', 'Mage', 'Support'),
  ('natalia', 'Natalia', 'ナタリア', 'Assassin', null),
  ('natan', 'Natan', 'ニュート', 'Marksman', 'Mage'),
  ('nolan', 'Nolan', 'ノーラン', 'Assassin', null),
  ('novaria', 'Novaria', 'ノヴァリア', 'Mage', null),
  ('odette', 'Odette', 'オデット', 'Mage', null),
  ('paquito', 'Paquito', 'パキート', 'Fighter', null),
  ('pharsa', 'Pharsa', 'ファーサ', 'Mage', null),
  ('phoveus', 'Phoveus', 'フォビウス', 'Fighter', null),
  ('popolandkupa', 'Popol and Kupa', 'ポポル&クパ', 'Marksman', null),
  ('rafaela', 'Rafaela', 'ラファエル', 'Support', null),
  ('roger', 'Roger', 'ロジャー', 'Fighter', 'Marksman'),
  ('ruby', 'Ruby', 'ルビー', 'Fighter', 'Tank'),
  ('saber', 'Saber', 'セイバー', 'Assassin', null),
  ('selena', 'Selena', 'セリナ', 'Assassin', 'Mage'),
  ('silvanna', 'Silvanna', 'シルバンナ', 'Fighter', 'Mage'),
  ('sora', 'Sora', 'ソラ', 'Support', null),
  ('sun', 'Sun', '梧空', 'Fighter', null),
  ('suyou', 'Suyou', 'スヨウ', 'Assassin', 'Fighter'),
  ('terizla', 'Terizla', 'ディスラー', 'Fighter', 'Tank'),
  ('thamuz', 'Thamuz', 'デームス', 'Fighter', null),
  ('tigreal', 'Tigreal', 'ティグラル', 'Tank', null),
  ('uranus', 'Uranus', 'ウラノス', 'Tank', null),
  ('vale', 'Vale', 'ヴェル', 'Mage', null),
  ('valentina', 'Valentina', 'ヴァレンティナ', 'Mage', null),
  ('valir', 'Valir', 'ヴァリル', 'Mage', null),
  ('vexana', 'Vexana', 'サナ', 'Mage', null),
  ('wanwan', 'Wanwan', '琥珀', 'Marksman', null),
  ('xborg', 'X.Borg', 'エックス', 'Fighter', null),
  ('xavier', 'Xavier', 'ザビエル', 'Mage', null),
  ('yisunshin', 'Yi Sun-shin', 'イスンシン', 'Marksman', 'Assassin'),
  ('yin', 'Yin', 'イン', 'Fighter', 'Assassin'),
  ('yuzhong', 'Yu Zhong', 'ゾン', 'Fighter', null),
  ('zhask', 'Zhask', 'ザスク', 'Mage', null),
  ('zhuxin', 'Zhuxin', '燭心', 'Mage', null),
  ('zilong', 'Zilong', '子龍', 'Fighter', 'Assassin'),
  ('kalea', 'Kalea', 'カレア', 'Support', 'Fighter'),
  ('marcel', 'Marcel', 'マルセル', 'Support', 'Assassin'),
  ('yve', 'Yve', 'イブ', 'Mage', null),
  ('zetian', 'Zetian', '則天', 'Mage', null),
  ('hirara', 'Hirara', 'ヒララ', 'Assassin', null),
  ('obsidia', 'Obsidia', 'アイーダ', 'Marksman', null)
on conflict (id) do update set en = excluded.en, jp = excluded.jp, cls = excluded.cls, sub = excluded.sub;
