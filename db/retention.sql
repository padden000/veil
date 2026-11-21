-- ---------- how many matches to keep (oldest are deleted once a day) ----------
-- Already ran setup.sql before 2026-11-21? Paste this file once into the SQL Editor too. Running it again is safe.
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

select cron.schedule('veil-trim-matches', '0 19 * * *', 'select public.trim_matches()');   -- every day 04:00 JST
