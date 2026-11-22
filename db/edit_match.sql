-- VEIL: edit a match within an hour, and see its items afterwards (2026-11-22).
-- Paste into the Supabase SQL Editor and run once (after recog.sql); running it again is safe.

-- one function does both: a new match (edit_id null) or an edit of your own match (same number kept)
create or replace function public.veil_save_match(payload jsonb, edit_id bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  r text;
  lanes text[] := array['EXP', 'JUNGLE', 'MID', 'GOLD', 'ROAM'];
  l text; s text; h text; kd jsonb; me text;
  heroes_all text[] := '{}';
  pending_n int; today_n int;
  sig text; dup bigint; st text; mid bigint; sea text; stars_v int; bid text; it text[]; prev record; prev_season text;
begin
  if uid is null then raise exception 'ログインが必要です'; end if;
  select role into r from public.profiles where id = uid;
  if r is null then raise exception 'プロフィールが見つかりません。いったんログアウトして入り直してください'; end if;

  if edit_id is null then
    select count(*) into pending_n from public.matches where submitted_by = uid and status = 'pending';
    if r = 'member' and pending_n >= 20 then raise exception '承認待ちが20件あります。承認されるまで新しい登録はできません'; end if;
    select count(*) into today_n from public.matches where submitted_by = uid and source = 'form' and created_at > now() - interval '1 day';
    if r not in ('manager', 'admin') and today_n >= 60 then raise exception '1日に登録できるのは60試合までです'; end if;
  else
    /* editing: only your own match, within an hour of sending it, and not one that was rejected */
    select m.submitted_by, m.status, m.created_at, m.season into prev from public.matches m where m.id = edit_id for update;
    if not found or prev.submitted_by is distinct from uid then raise exception '自分が登録した試合だけ編集できます'; end if;
    if prev.status = 'rejected' then raise exception '却下された試合は編集できません'; end if;
    if prev.created_at < now() - interval '1 hour' then raise exception '編集できるのは登録してから1時間までです'; end if;
    prev_season := prev.season;
  end if;

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
    stars_v := (payload ->> 'stars')::int;
  end if;
  sea := case when r in ('manager', 'admin') and coalesce(payload ->> 'season', '') ~* '^S[0-9]{1,3}$' then upper(payload ->> 'season')
              when edit_id is not null then prev_season else public.current_season() end;

  sig := public.veil_signature((payload ->> 'played_on')::date, payload -> 'ally', payload -> 'enemy');
  bid := nullif(regexp_replace(coalesce(payload ->> 'battle_id', ''), '[^0-9]', '', 'g'), '');
  if bid is not null and bid !~ '^[0-9]{6,30}$' then raise exception '戦闘番号が正しくありません'; end if;
  if bid is not null then
    select id into dup from public.matches where battle_id = bid and status <> 'rejected' and id <> coalesce(edit_id, -1) order by id limit 1;
  end if;
  if dup is null then
    select id into dup from public.matches where signature = sig and status <> 'rejected' and id <> coalesce(edit_id, -1) order by id limit 1;
  end if;
  st := case when r in ('trusted', 'manager', 'admin') and dup is null then 'approved' else 'pending' end;

  if edit_id is null then
    insert into public.matches (submitted_by, status, played_on, season, rank, stars, party, win, duration_sec, note, signature, battle_id, dup_of,
                                reviewed_by, reviewed_at)
    values (uid, st, (payload ->> 'played_on')::date, sea, nullif(payload ->> 'rank', ''), stars_v,
            nullif(payload ->> 'party', ''), (payload ->> 'win')::boolean, nullif(payload ->> 'duration_sec', '')::int,
            nullif(payload ->> 'note', ''), sig, bid, dup,
            case when st = 'approved' then uid end, case when st = 'approved' then now() end)
    returning id into mid;
  else
    /* same number, same sending time; a member's edited match goes back to 承認待ち */
    mid := edit_id;
    update public.matches m
       set status = st, played_on = (payload ->> 'played_on')::date, season = sea, rank = nullif(payload ->> 'rank', ''), stars = stars_v,
           party = nullif(payload ->> 'party', ''), win = (payload ->> 'win')::boolean, duration_sec = nullif(payload ->> 'duration_sec', '')::int,
           note = nullif(payload ->> 'note', ''), signature = sig, battle_id = bid, dup_of = dup, reject_reason = null,
           reviewed_by = case when st = 'approved' then uid end, reviewed_at = case when st = 'approved' then now() end
     where m.id = mid;
    delete from public.picks p where p.match_id = mid;
    delete from public.icon_refs x where x.match_id = mid;
  end if;

  foreach s in array array['ally', 'enemy'] loop
    foreach l in array lanes loop
      kd := payload -> 'kda' -> s -> l;
      it := case when jsonb_typeof(payload -> 'items' -> s -> l) = 'array'
                 then array(select jsonb_array_elements_text(payload -> 'items' -> s -> l)) end;
      if it is not null and cardinality(it) = 0 then it := null; end if;
      insert into public.picks (match_id, side, lane, hero, is_me, k, d, a, items)
      values (mid, s, l, payload -> s ->> l, s = 'ally' and l = me,
              case when jsonb_typeof(kd) = 'array' then (kd ->> 0)::smallint end,
              case when jsonb_typeof(kd) = 'array' then (kd ->> 1)::smallint end,
              case when jsonb_typeof(kd) = 'array' then (kd ->> 2)::smallint end, it);
    end loop;
  end loop;

  /* crops read from the screenshot, labelled by what the submitter confirmed: references once the match is approved */
  if jsonb_typeof(payload -> 'icons') = 'array' then
    if jsonb_array_length(payload -> 'icons') > 120 then raise exception '画像の切り抜きが多すぎます'; end if;
    insert into public.icon_refs (kind, label, img, match_id)
    select x ->> 'kind', x ->> 'label', x ->> 'img', mid from jsonb_array_elements(payload -> 'icons') x
    where x ->> 'kind' in ('hero', 'item', 'badge', 'kda', 'bid', 'time') and (x ->> 'label') ~ '^[a-z0-9_]{1,30}$'
      and (x ->> 'img') like 'data:image/%' and char_length(x ->> 'img') <= 12000;
    if st = 'approved' then perform public.promote_icons(mid); end if;
  end if;
  return jsonb_build_object('id', mid, 'status', st, 'dup_of', dup);
end $$;
revoke execute on function public.veil_save_match(jsonb, bigint) from public, anon, authenticated;

create or replace function public.submit_match(payload jsonb) returns jsonb
language sql security definer set search_path = '' as $$ select public.veil_save_match(payload, null) $$;

create or replace function public.update_match(match_id bigint, payload jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if match_id is null then raise exception '編集する試合がありません'; end if;
  return public.veil_save_match(payload, match_id);
end $$;

-- your matches, now with every pick's KDA and items, the memo, and whether it can still be edited
drop function if exists public.my_matches(int);
create function public.my_matches(lim int default 200) returns table (
  id bigint, status text, played_on date, season text, rank text, stars smallint, battle_id text, party text, win boolean, duration_sec int,
  my_lane text, my_hero text, k smallint, d smallint, a smallint, reject_reason text, created_at timestamptz, picks jsonb,
  note text, editable boolean, detail jsonb
) language sql stable security definer set search_path = '' as $$
  select m.id, m.status, m.played_on, m.season, m.rank, m.stars, m.battle_id, m.party, m.win, m.duration_sec,
         me.lane, me.hero, me.k, me.d, me.a, m.reject_reason, m.created_at,
         (select jsonb_object_agg(p.side || ':' || p.lane, p.hero) from public.picks p where p.match_id = m.id),
         m.note, m.status <> 'rejected' and m.source = 'form' and m.created_at > now() - interval '1 hour',
         (select jsonb_agg(jsonb_build_object('side', p.side, 'lane', p.lane, 'hero', p.hero, 'me', p.is_me, 'k', p.k, 'd', p.d, 'a', p.a, 'items', p.items))
            from public.picks p where p.match_id = m.id)
  from public.matches m left join public.picks me on me.match_id = m.id and me.is_me
  where m.submitted_by = auth.uid()
  order by m.played_on desc, m.id desc
  limit least(greatest(lim, 1), 1000)
$$;

revoke execute on function public.submit_match(jsonb), public.update_match(bigint, jsonb), public.my_matches(int) from public, anon;
grant execute on function public.submit_match(jsonb), public.update_match(bigint, jsonb), public.my_matches(int) to authenticated;
