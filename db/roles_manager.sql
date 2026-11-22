-- Roles become: 一般 (member) / 信頼ユーザー (trusted) / 運営 (manager) / 管理者 (admin).
-- For a database set up before 2026-11-22. Safe to run again. Anyone who was 承認係 (approver) becomes 運営.
alter table public.profiles drop constraint if exists profiles_role_check;
update public.profiles set role = 'manager' where role = 'approver';
alter table public.profiles add constraint profiles_role_check check (role in ('member', 'trusted', 'manager', 'admin'));

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
