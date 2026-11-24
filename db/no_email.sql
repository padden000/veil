-- VEIL: do not keep e-mail addresses (2026-11-24). Paste into the Supabase SQL Editor and run once; running it again is safe.
--
-- Supabase always asks Discord for the e-mail address when someone signs in, and keeps it in the auth tables
-- (Authentication > Users). VEIL never uses it: people are told apart by their Discord ID. So we blank it:
--   1. now, for everyone already registered
--   2. from now on, every time someone signs up or signs in (triggers; nobody has to do anything)
-- Places it is kept:
--   auth.users.email                          the "Email" column in Authentication > Users
--   auth.users.raw_user_meta_data ->> 'email' the profile Discord sends
--   auth.identities.identity_data ->> 'email' the same profile, kept per sign-in method (auth.identities.email follows it)
--   auth.audit_log_entries.payload            the sign-in history ("actor_username" and similar)
-- The Discord ID, name and avatar stay: sign-in and the site need them.
--
-- Undo (sign-in keeps working without these; addresses already blanked do not come back):
--   drop function if exists public.veil_noemail_user() cascade;
--   drop function if exists public.veil_noemail_identity() cascade;
--   drop function if exists public.veil_noemail_audit() cascade;

-- text with every quoted e-mail address in it replaced by ""
create or replace function public.veil_strip_emails(t text) returns text
language sql immutable set search_path = '' as $$
  select regexp_replace(t, '"[^"\\\s@]+@[^"\\\s@]+"', '""', 'g')
$$;

create or replace function public.veil_noemail_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.email := null;
  new.email_change := '';
  new.raw_user_meta_data := coalesce(new.raw_user_meta_data, '{}'::jsonb) - 'email';
  return new;
exception when others then
  return new;                                  -- never let this stand in the way of signing in
end $$;

create or replace function public.veil_noemail_identity() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.identity_data := coalesce(new.identity_data, '{}'::jsonb) - 'email';
  return new;
exception when others then
  return new;
end $$;

create or replace function public.veil_noemail_audit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.payload is not null then new.payload := regexp_replace(new.payload::text, '"[^"\\\s@]+@[^"\\\s@]+"', '""', 'g')::json; end if;
  return new;
exception when others then
  return new;
end $$;

-- these only run as triggers (security definer, like the profile trigger, so the sign-in service needs no extra rights)
revoke all on function public.veil_strip_emails(text), public.veil_noemail_user(), public.veil_noemail_identity(), public.veil_noemail_audit() from public, anon, authenticated;

drop trigger if exists veil_noemail on auth.users;
create trigger veil_noemail before insert or update on auth.users
  for each row execute function public.veil_noemail_user();
drop trigger if exists veil_noemail on auth.identities;
create trigger veil_noemail before insert or update on auth.identities
  for each row execute function public.veil_noemail_identity();
drop trigger if exists veil_noemail on auth.audit_log_entries;
create trigger veil_noemail before insert on auth.audit_log_entries
  for each row execute function public.veil_noemail_audit();

-- everyone already registered (the triggers above do the blanking as these rows are touched)
update auth.users set email = email where email is not null or raw_user_meta_data ? 'email';
update auth.identities set identity_data = identity_data where identity_data ? 'email';
update auth.audit_log_entries set payload = public.veil_strip_emails(payload::text)::json where payload::text ~ '@';

-- check: all three should be 0
select (select count(*) from auth.users where email is not null or raw_user_meta_data ? 'email') as users_with_email,
       (select count(*) from auth.identities where identity_data ? 'email') as identities_with_email,
       (select count(*) from auth.audit_log_entries where payload::text ~ '"[^"\\\s@]+@[^"\\\s@]+"') as history_with_email;
