-- Daily totals per hero, for the daily win-rate chart on each hero page (2026-11-22).
-- For a database set up before this date. Safe to run again.
-- One row per hero and day: every appearance of the hero on either team in approved matches
-- (all lanes and ranks together, the same as the monthly chart).
drop materialized view if exists public.stats_hero_day;
create materialized view public.stats_hero_day as
  select p.hero, m.played_on as day,
         count(*)::int as games, count(*) filter (where (p.side = 'ally') = m.win)::int as wins
  from public.picks p join public.matches m on m.id = p.match_id
  where m.status = 'approved'
  group by 1, 2;
create unique index on public.stats_hero_day (hero, day);
grant select on public.stats_hero_day to anon, authenticated;

create or replace function public.refresh_stats() returns void
language plpgsql security definer set search_path = '' as $$
begin
  refresh materialized view concurrently public.stats_hero;
  refresh materialized view concurrently public.stats_hero_day;
  refresh materialized view concurrently public.stats_vs;
  refresh materialized view concurrently public.stats_mates;
  refresh materialized view concurrently public.stats_top_pairs;
  refresh materialized view concurrently public.stats_recent_lanes;
  refresh materialized view concurrently public.stats_summary;
end $$;
revoke execute on function public.refresh_stats() from public, anon, authenticated;
select public.refresh_stats();
