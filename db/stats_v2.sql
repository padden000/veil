-- Statistics for the site (per hero / matchups / teammates / recent lanes) and marking your own hero.
-- For a database set up before 2026-11-22 afternoon. Safe to run again.
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


revoke execute on function public.refresh_stats() from public, anon, authenticated;
revoke execute on function public.set_my_lane(bigint, text) from public, anon;
grant execute on function public.set_my_lane(bigint, text) to authenticated;
select public.refresh_stats();
