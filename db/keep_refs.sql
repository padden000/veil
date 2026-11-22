-- VEIL: keep up to 100 crops per hero / item / digit (2026-11-22). Paste into the Supabase SQL Editor and run once;
-- running it again is safe.
-- Approved crops are now kept up to 100 per name (material for a trained model later). The screenshot reader still
-- uses only the newest few per name, through the view icon_refs_active, so reading stays as fast as before.

-- when a match is approved its crops become references; beyond 100 per name the oldest learned ones are deleted
-- (the starting references from the shop screens are never deleted)
create or replace function public.promote_icons(mid bigint) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.icon_refs set status = 'approved' where match_id = mid and status = 'pending';
  delete from public.icon_refs r using (
    select id, row_number() over (partition by kind, label order by id desc) as n
    from public.icon_refs where status = 'approved' and match_id is not null
  ) x where r.id = x.id and x.n > 100;
end $$;
revoke execute on function public.promote_icons(bigint) from public, anon, authenticated;

-- what the reader downloads: every starting reference, plus the newest learned crops per name
-- (40 for "no mark" / "not in the list", 6 per digit, 4 for each hero and item)
create or replace view public.icon_refs_active as
select id, kind, label, img from (
  select id, kind, label, img, match_id,
         row_number() over (partition by kind, label, (match_id is null) order by id desc) as n
  from public.icon_refs where status = 'approved'
) x
where match_id is null
   or n <= case when label in ('none', 'other') then 40 when kind in ('kda', 'bid', 'time') then 6 else 4 end;
grant select on public.icon_refs_active to anon, authenticated;
