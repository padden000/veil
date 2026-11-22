-- VEIL: profile icons (2026-11-22). Paste into the Supabase SQL Editor and run once; running it again is safe.
-- Each person chooses: their Discord icon (default), a hero's face, or the first letter of their name.
-- No pictures are uploaded or stored: the Discord icon is Discord's own link, a hero face is just the hero's id.

alter table public.profiles add column if not exists avatar text not null default '';
alter table public.profiles drop constraint if exists profiles_avatar_check;
alter table public.profiles add constraint profiles_avatar_check check (avatar ~ '^(discord|initial|hero:[a-z0-9_]{1,30})?$');
grant select (avatar) on public.profiles to authenticated;          -- each person can read only their own row (profiles_self)

-- '' or 'discord' = Discord icon, 'initial' = first letter, 'hero:<id>' = that hero's face
create or replace function public.set_my_avatar(choice text) returns text
language plpgsql security definer set search_path = '' as $$
declare c text := coalesce(choice, '');
begin
  if auth.uid() is null then raise exception 'ログインしてください'; end if;
  if c !~ '^(discord|initial|hero:[a-z0-9_]{1,30})?$' then raise exception 'アイコンの指定が正しくありません'; end if;
  if c like 'hero:%' and not exists (select 1 from public.heroes h where h.id = substr(c, 6)) then raise exception 'そのヒーローは見つかりません'; end if;
  update public.profiles set avatar = c where id = auth.uid();
  return c;
end $$;

-- member list for 運営 / 管理者, now with each person's icon choice and Discord icon link
drop function if exists public.list_profiles();
create function public.list_profiles() returns table (
  id uuid, name text, role text, created_at timestamptz, approved bigint, pending bigint, avatar text, discord_avatar text
) language plpgsql stable security definer set search_path = '' as $$
begin
  if coalesce(public.my_role(), '') not in ('manager', 'admin') then raise exception '運営か管理者だけが使えます'; end if;
  return query
  select p.id, p.name, p.role, p.created_at,
         (select count(*) from public.matches m where m.submitted_by = p.id and m.status = 'approved'),
         (select count(*) from public.matches m where m.submitted_by = p.id and m.status = 'pending'),
         p.avatar,
         coalesce(case when u.raw_user_meta_data ->> 'avatar_url' ~ '^https://cdn\.discordapp\.com/[A-Za-z0-9_./?=-]{1,200}$'
                       then u.raw_user_meta_data ->> 'avatar_url' end, '')
  from public.profiles p left join auth.users u on u.id = p.id
  order by p.created_at;
end $$;

revoke execute on function public.set_my_avatar(text), public.list_profiles() from public, anon;
grant execute on function public.set_my_avatar(text), public.list_profiles() to authenticated;
