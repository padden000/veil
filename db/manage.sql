-- =====================================================================
-- VEIL: 運営の道具 (2026-11-22)
--   作業の記録 / 登録停止・統計から外す / 要確認の試合は複数人で判定 / まとめて承認 /
--   承認済みの試合の修正・取り消し / ヒーロー解説・TIER・パッチ・装備の説明文の編集
-- Supabase → SQL Editor に全部貼って Run。stats_day.sql のあとに 1 回。何回実行しても大丈夫です。
-- =====================================================================

-- ---------- new columns ----------
alter table public.profiles add column if not exists banned boolean not null default false;          -- 登録停止
alter table public.profiles add column if not exists stats_excluded boolean not null default false;  -- 統計から外す
alter table public.matches add column if not exists flags text[] not null default '{}';              -- 要確認の理由
alter table public.matches add column if not exists updated_at timestamptz;                           -- 運営が直した時刻
insert into public.settings (key, value) values ('flag_votes', '2') on conflict (key) do nothing;    -- 要確認の試合を決めるのに必要な票

-- ---------- 作業の記録 (audit log): written only by the functions below, read by 運営 / 管理者 ----------
create table if not exists public.audit_log (
  id           bigint generated always as identity primary key,
  at           timestamptz not null default now(),
  actor        uuid references public.profiles (id) on delete set null,
  actor_name   text not null default '',
  action       text not null,
  match_id     bigint,                -- no foreign key: the record stays after the match is deleted
  target_user  uuid,
  target_name  text,
  detail       jsonb not null default '{}'
);
create index if not exists audit_log_at_idx on public.audit_log (at desc, id desc);
create index if not exists audit_log_match_idx on public.audit_log (match_id) where match_id is not null;
alter table public.audit_log enable row level security;
revoke all on public.audit_log from anon, authenticated;

create or replace function public.veil_log(p_action text, p_match bigint, p_target uuid, p_detail jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.audit_log (actor, actor_name, action, match_id, target_user, target_name, detail)
  values (auth.uid(), coalesce((select name from public.profiles where id = auth.uid()), ''), p_action, p_match, p_target,
          (select name from public.profiles where id = p_target), coalesce(p_detail, '{}'::jsonb));
end $$;

-- ---------- votes on matches marked 要確認 ----------
create table if not exists public.match_votes (
  match_id  bigint not null references public.matches (id) on delete cascade,
  voter     uuid not null references public.profiles (id) on delete cascade,
  approve   boolean not null,
  reason    text check (char_length(reason) <= 200),
  at        timestamptz not null default now(),
  primary key (match_id, voter)
);
alter table public.match_votes enable row level security;
revoke all on public.match_votes from anon, authenticated;

-- ---------- one match as JSON (for the before / after of a correction) ----------
create or replace function public.veil_match_json(mid bigint) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('played_on', m.played_on, 'season', m.season, 'rank', m.rank, 'stars', m.stars, 'party', m.party, 'win', m.win,
           'duration_sec', m.duration_sec, 'note', m.note, 'battle_id', m.battle_id,
           'picks', (select jsonb_object_agg(p.side || ':' || p.lane, jsonb_build_object('hero', p.hero, 'k', p.k, 'd', p.d, 'a', p.a, 'items', p.items, 'me', p.is_me))
                       from public.picks p where p.match_id = m.id))
  from public.matches m where m.id = mid
$$;

create or replace function public.veil_save_match(payload jsonb, edit_id bigint, staff boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  r text;
  lanes text[] := array['EXP', 'JUNGLE', 'MID', 'GOLD', 'ROAM'];
  l text; s text; h text; kd jsonb; me text;
  heroes_all text[] := '{}';
  pending_n int; today_n int;
  sig text; dup bigint; st text; mid bigint; sea text; stars_v int; bid text; it text[]; prev record; prev_season text; prev_status text;
begin
  if uid is null then raise exception 'ログインが必要です'; end if;
  select role into r from public.profiles where id = uid;
  if r is null then raise exception 'プロフィールが見つかりません。いったんログアウトして入り直してください'; end if;

  if staff then
    /* 運営 / 管理者 correcting any match: the sender, status and screenshot crops stay as they are */
    if r not in ('manager', 'admin') then raise exception '運営か管理者だけが直せます'; end if;
    select m.submitted_by, m.status, m.created_at, m.season into prev from public.matches m where m.id = edit_id for update;
    if not found then raise exception 'その試合は見つかりません'; end if;
    prev_season := prev.season; prev_status := prev.status;
  elsif edit_id is null then
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
  if staff and coalesce(me, '') = '' then me := null;          /* matches from the sheet have no sender's lane */
  elsif me is null or not (me = any (lanes)) then raise exception '自分のレーンを選んでください'; end if;

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

  if not staff then
    kd := payload -> 'kda' -> 'ally' -> me;
    if kd is null or jsonb_array_length(kd) <> 3 then raise exception '自分のKDAを入れてください'; end if;
  end if;

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
  st := case when staff then prev_status when r in ('trusted', 'manager', 'admin') and dup is null then 'approved' else 'pending' end;

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
    if staff then
      update public.matches m
         set played_on = (payload ->> 'played_on')::date, season = sea, rank = nullif(payload ->> 'rank', ''), stars = stars_v,
             party = nullif(payload ->> 'party', ''), win = (payload ->> 'win')::boolean, duration_sec = nullif(payload ->> 'duration_sec', '')::int,
             note = nullif(payload ->> 'note', ''), signature = sig, battle_id = bid, dup_of = dup, updated_at = now()
       where m.id = mid;
    else
      update public.matches m
         set status = st, played_on = (payload ->> 'played_on')::date, season = sea, rank = nullif(payload ->> 'rank', ''), stars = stars_v,
             party = nullif(payload ->> 'party', ''), win = (payload ->> 'win')::boolean, duration_sec = nullif(payload ->> 'duration_sec', '')::int,
             note = nullif(payload ->> 'note', ''), signature = sig, battle_id = bid, dup_of = dup, reject_reason = null,
             reviewed_by = case when st = 'approved' then uid end, reviewed_at = case when st = 'approved' then now() end
       where m.id = mid;
      delete from public.icon_refs x where x.match_id = mid;
    end if;
    delete from public.picks p where p.match_id = mid;
  end if;

  foreach s in array array['ally', 'enemy'] loop
    foreach l in array lanes loop
      kd := payload -> 'kda' -> s -> l;
      it := case when jsonb_typeof(payload -> 'items' -> s -> l) = 'array'
                 then array(select jsonb_array_elements_text(payload -> 'items' -> s -> l)) end;
      if it is not null and cardinality(it) = 0 then it := null; end if;
      insert into public.picks (match_id, side, lane, hero, is_me, k, d, a, items)
      values (mid, s, l, payload -> s ->> l, coalesce(s = 'ally' and l = me, false),
              case when jsonb_typeof(kd) = 'array' then (kd ->> 0)::smallint end,
              case when jsonb_typeof(kd) = 'array' then (kd ->> 1)::smallint end,
              case when jsonb_typeof(kd) = 'array' then (kd ->> 2)::smallint end, it);
    end loop;
  end loop;

  /* crops read from the screenshot, labelled by what the submitter confirmed: references once the match is approved */
  if not staff and jsonb_typeof(payload -> 'icons') = 'array' then
    if jsonb_array_length(payload -> 'icons') > 120 then raise exception '画像の切り抜きが多すぎます'; end if;
    insert into public.icon_refs (kind, label, img, match_id)
    select x ->> 'kind', x ->> 'label', x ->> 'img', mid from jsonb_array_elements(payload -> 'icons') x
    where x ->> 'kind' in ('hero', 'item', 'badge', 'kda', 'bid', 'time') and (x ->> 'label') ~ '^[a-z0-9_]{1,30}$'
      and (x ->> 'img') like 'data:image/%' and char_length(x ->> 'img') <= 12000;
    if st = 'approved' then perform public.promote_icons(mid); end if;
  end if;
  return jsonb_build_object('id', mid, 'status', st, 'dup_of', dup);
end $$;
create or replace function public.veil_save_match(payload jsonb, edit_id bigint) returns jsonb
language sql security definer set search_path = '' as $$ select public.veil_save_match(payload, edit_id, false) $$;

-- ---------- 要確認: marks a match that needs a second look ----------
--   dup   同じ戦闘番号・同じ顔ぶれの試合がもうある      kda   KDAが極端 (K>30 / D>25 / A>40)
--   short 試合時間が5分未満                              old   60日以上前の試合
--   burst 1時間に20件を超える登録
-- A trusted user's match with a mark waits for approval instead of counting at once.
create or replace function public.veil_flag(mid bigint) returns text
language plpgsql security definer set search_path = '' as $$
declare m record; f text[] := '{}'; n int; sr text;
begin
  select * into m from public.matches where id = mid;
  if not found then return null; end if;
  if m.dup_of is not null then f := f || 'dup'::text; end if;
  if exists (select 1 from public.picks p where p.match_id = mid and (p.k > 30 or p.d > 25 or p.a > 40)) then f := f || 'kda'::text; end if;
  if m.duration_sec is not null and m.duration_sec < 300 then f := f || 'short'::text; end if;
  if m.played_on < current_date - 60 then f := f || 'old'::text; end if;
  select count(*) into n from public.matches where submitted_by = m.submitted_by and source = 'form' and created_at > now() - interval '1 hour';
  if n > 20 then f := f || 'burst'::text; end if;
  update public.matches set flags = f where id = mid;
  select role into sr from public.profiles where id = m.submitted_by;
  if cardinality(f) > 0 and m.status = 'approved' and sr = 'trusted' then
    update public.matches set status = 'pending', reviewed_by = null, reviewed_at = null where id = mid;
    update public.icon_refs set status = 'pending' where match_id = mid and status = 'approved';
    return 'pending';
  end if;
  return m.status;
end $$;

-- ---------- sending and editing your own match: 登録停止 is checked here, then the marks ----------
create or replace function public.submit_match(payload jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare res jsonb;
begin
  if exists (select 1 from public.profiles where id = auth.uid() and banned) then raise exception '登録が停止されています。運営に問い合わせてください'; end if;
  res := public.veil_save_match(payload, null, false);
  return res || jsonb_build_object('status', public.veil_flag((res ->> 'id')::bigint));
end $$;

create or replace function public.update_match(match_id bigint, payload jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare res jsonb;
begin
  if match_id is null then raise exception '編集する試合がありません'; end if;
  if exists (select 1 from public.profiles where id = auth.uid() and banned) then raise exception '登録が停止されています。運営に問い合わせてください'; end if;
  res := public.veil_save_match(payload, match_id, false);
  return res || jsonb_build_object('status', public.veil_flag((res ->> 'id')::bigint));
end $$;

-- ---------- approval: one place that approves, rejects or votes ----------
-- A match without marks is decided by one person. A marked match needs <flag_votes> (2) matching votes
-- from different 運営 / 管理者; the sender cannot vote on their own match. A 管理者 may decide alone with force.
create or replace function public.veil_review(mid bigint, approve boolean, reason text, force boolean) returns text
language plpgsql security definer set search_path = '' as $$
declare r text := coalesce(public.my_role(), ''); m record; need int; ya int; na int; v jsonb;
begin
  if r not in ('manager', 'admin') then raise exception '承認する権限がありません'; end if;
  if force and r <> 'admin' then raise exception '1人で確定できるのは管理者だけです'; end if;
  select id, status, flags, submitted_by into m from public.matches where id = mid for update;
  if not found or m.status <> 'pending' then return 'skipped'; end if;
  if cardinality(m.flags) > 0 and not force then
    if m.submitted_by = auth.uid() then raise exception '自分が登録した要確認の試合には投票できません'; end if;
    insert into public.match_votes (match_id, voter, approve, reason) values (mid, auth.uid(), approve, left(reason, 200))
      on conflict (match_id, voter) do update set approve = excluded.approve, reason = excluded.reason, at = now();
    perform public.veil_log(case when approve then 'vote_ok' else 'vote_ng' end, mid, m.submitted_by, jsonb_build_object('reason', reason, 'flags', m.flags));
    select greatest(coalesce(value::int, 2), 1) into need from public.settings where key = 'flag_votes';
    need := coalesce(need, 2);
    select count(*) filter (where x.approve), count(*) filter (where not x.approve) into ya, na from public.match_votes x where x.match_id = mid;
    if ya >= need then approve := true; elsif na >= need then approve := false; else return 'voted'; end if;
  end if;
  update public.matches
     set status = case when approve then 'approved' else 'rejected' end,
         reject_reason = case when approve then null else left(reason, 200) end,
         reviewed_by = auth.uid(), reviewed_at = now()
   where id = mid;
  if approve then perform public.promote_icons(mid); else delete from public.icon_refs x where x.match_id = mid; end if;
  select jsonb_agg(jsonb_build_object('name', coalesce(p.name, ''), 'approve', x.approve) order by x.at) into v
    from public.match_votes x left join public.profiles p on p.id = x.voter where x.match_id = mid;
  perform public.veil_log(case when approve then 'approve' else 'reject' end, mid, m.submitted_by,
    jsonb_build_object('reason', reason, 'flags', m.flags, 'forced', force, 'votes', coalesce(v, '[]'::jsonb)));
  return case when approve then 'approved' else 'rejected' end;
end $$;

drop function if exists public.review_match(bigint, boolean, text);
create function public.review_match(match_id bigint, approve boolean, reason text default null) returns text
language plpgsql security definer set search_path = '' as $$
declare res text;
begin
  res := public.veil_review(match_id, approve, reason, false);
  if res = 'skipped' then raise exception 'この試合はもう処理されています'; end if;
  return res;
end $$;

-- 管理者が1人で確定する (要確認の試合でも)
create or replace function public.decide_match(match_id bigint, approve boolean, reason text default null) returns text
language plpgsql security definer set search_path = '' as $$
declare res text;
begin
  res := public.veil_review(match_id, approve, reason, true);
  if res = 'skipped' then raise exception 'この試合はもう処理されています'; end if;
  return res;
end $$;

-- まとめて承認 / 却下: returns how many were approved, rejected, voted on (要確認), skipped
create or replace function public.review_matches(ids bigint[], approve boolean, reason text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare i bigint; res text; out jsonb := '{"approved":0,"rejected":0,"voted":0,"skipped":0,"failed":0}';
begin
  if coalesce(public.my_role(), '') not in ('manager', 'admin') then raise exception '承認する権限がありません'; end if;
  if cardinality(ids) > 200 then raise exception '一度に処理できるのは200件までです'; end if;
  foreach i in array ids loop
    begin
      res := public.veil_review(i, approve, reason, false);
    exception when others then res := 'failed';
    end;
    out := jsonb_set(out, array[res], to_jsonb((out ->> res)::int + 1));
  end loop;
  return out;
end $$;

-- the list on the approval page, now with the marks and the votes so far
drop function if exists public.pending_matches(int);
create function public.pending_matches(lim int default 100) returns table (
  id bigint, played_on date, season text, rank text, stars smallint, battle_id text, party text, win boolean, duration_sec int, note text,
  submitter text, submitter_role text, dup_of bigint, created_at timestamptz, picks jsonb, icons jsonb, flags text[], votes jsonb, mine boolean
) language plpgsql stable security definer set search_path = '' as $$
begin
  if coalesce(public.my_role(), '') not in ('manager', 'admin') then raise exception '承認する権限がありません'; end if;
  return query
  select m.id, m.played_on, m.season, m.rank, m.stars, m.battle_id, m.party, m.win, m.duration_sec, m.note, pr.name, pr.role, m.dup_of, m.created_at,
         (select jsonb_agg(jsonb_build_object('side', p.side, 'lane', p.lane, 'hero', p.hero, 'me', p.is_me, 'k', p.k, 'd', p.d, 'a', p.a, 'items', p.items))
            from public.picks p where p.match_id = m.id),
         (select jsonb_agg(jsonb_build_object('kind', r.kind, 'label', r.label, 'img', r.img) order by r.id)
            from public.icon_refs r where r.match_id = m.id and r.kind in ('hero', 'item', 'badge')),
         m.flags,
         coalesce((select jsonb_agg(jsonb_build_object('name', coalesce(vp.name, ''), 'approve', v.approve, 'reason', v.reason, 'me', v.voter = auth.uid()) order by v.at)
            from public.match_votes v left join public.profiles vp on vp.id = v.voter where v.match_id = m.id), '[]'::jsonb),
         m.submitted_by = auth.uid()
  from public.matches m left join public.profiles pr on pr.id = m.submitted_by
  where m.status = 'pending'
  order by cardinality(m.flags) > 0, m.created_at
  limit least(greatest(lim, 1), 500);
end $$;

-- ---------- approved matches: find, correct, take back (運営 / 管理者) ----------
create or replace function public.staff_matches(q text default '', lim int default 30) returns table (
  id bigint, status text, played_on date, season text, rank text, stars smallint, battle_id text, party text, win boolean, duration_sec int, note text,
  submitter text, submitter_role text, reviewer text, reviewed_at timestamptz, updated_at timestamptz, flags text[], picks jsonb
) language plpgsql stable security definer set search_path = '' as $$
declare s text := trim(coalesce(q, ''));
begin
  if coalesce(public.my_role(), '') not in ('manager', 'admin') then raise exception '運営か管理者だけが使えます'; end if;
  return query
  select m.id, m.status, m.played_on, m.season, m.rank, m.stars, m.battle_id, m.party, m.win, m.duration_sec, m.note,
         pr.name, pr.role, rv.name, m.reviewed_at, m.updated_at, m.flags,
         (select jsonb_agg(jsonb_build_object('side', p.side, 'lane', p.lane, 'hero', p.hero, 'me', p.is_me, 'k', p.k, 'd', p.d, 'a', p.a, 'items', p.items))
            from public.picks p where p.match_id = m.id)
  from public.matches m
  left join public.profiles pr on pr.id = m.submitted_by
  left join public.profiles rv on rv.id = m.reviewed_by
  where m.status = 'approved'
    and (s = '' or m.id::text = ltrim(s, 'No.') or m.battle_id = s or pr.name ilike '%' || s || '%')
  order by coalesce(m.reviewed_at, m.created_at) desc, m.id desc
  limit least(greatest(lim, 1), 100);
end $$;

-- one match with everything the form needs, for 運営 / 管理者 to correct it
create or replace function public.staff_match(match_id bigint) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare res jsonb;
begin
  if coalesce(public.my_role(), '') not in ('manager', 'admin') then raise exception '運営か管理者だけが使えます'; end if;
  select jsonb_build_object('id', m.id, 'status', m.status, 'played_on', m.played_on, 'season', m.season, 'rank', m.rank, 'stars', m.stars,
           'battle_id', m.battle_id, 'party', m.party, 'win', m.win, 'duration_sec', m.duration_sec, 'note', m.note, 'source', m.source,
           'submitter', coalesce(pr.name, ''), 'my_lane', (select p.lane from public.picks p where p.match_id = m.id and p.is_me),
           'detail', (select jsonb_agg(jsonb_build_object('side', p.side, 'lane', p.lane, 'hero', p.hero, 'me', p.is_me, 'k', p.k, 'd', p.d, 'a', p.a, 'items', p.items))
                        from public.picks p where p.match_id = m.id))
    into res
  from public.matches m left join public.profiles pr on pr.id = m.submitted_by where m.id = staff_match.match_id;
  if res is null then raise exception 'その試合は見つかりません'; end if;
  return res;
end $$;

create or replace function public.staff_update_match(match_id bigint, payload jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare before jsonb; res jsonb;
begin
  if coalesce(public.my_role(), '') not in ('manager', 'admin') then raise exception '運営か管理者だけが直せます'; end if;
  before := public.veil_match_json(match_id);
  if before is null then raise exception 'その試合は見つかりません'; end if;
  res := public.veil_save_match(payload, match_id, true);
  perform public.veil_log('edit', match_id, (select submitted_by from public.matches m where m.id = staff_update_match.match_id),
                          jsonb_build_object('before', before, 'after', public.veil_match_json(match_id)));
  return res;
end $$;

-- 取り消し: an approved match goes back to 承認待ち, or becomes 却下 (deleted after 30 days)
create or replace function public.unapprove_match(match_id bigint, to_status text, reason text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare sb uuid;
begin
  if coalesce(public.my_role(), '') not in ('manager', 'admin') then raise exception '運営か管理者だけが取り消せます'; end if;
  if to_status not in ('pending', 'rejected') then raise exception '戻し先が正しくありません'; end if;
  update public.matches m
     set status = to_status, reject_reason = case when to_status = 'rejected' then left(reason, 200) end,
         reviewed_by = case when to_status = 'rejected' then auth.uid() end, reviewed_at = case when to_status = 'rejected' then now() end
   where m.id = unapprove_match.match_id and m.status = 'approved'
  returning submitted_by into sb;
  if not found then raise exception 'この試合は承認済みではありません'; end if;
  if to_status = 'rejected' then delete from public.icon_refs x where x.match_id = unapprove_match.match_id;
  else update public.icon_refs x set status = 'pending' where x.match_id = unapprove_match.match_id and x.status = 'approved'; end if;
  delete from public.match_votes v where v.match_id = unapprove_match.match_id;
  perform public.veil_log('unapprove', match_id, sb, jsonb_build_object('to', to_status, 'reason', reason));
end $$;

-- ---------- people: roles, 登録停止, 統計から外す ----------
drop function if exists public.list_profiles();
create function public.list_profiles() returns table (
  id uuid, name text, role text, created_at timestamptz, approved bigint, pending bigint, avatar text, discord_avatar text, banned boolean, stats_excluded boolean
) language plpgsql stable security definer set search_path = '' as $$
begin
  if coalesce(public.my_role(), '') not in ('manager', 'admin') then raise exception '運営か管理者だけが使えます'; end if;
  return query
  select p.id, p.name, p.role, p.created_at,
         (select count(*) from public.matches m where m.submitted_by = p.id and m.status = 'approved'),
         (select count(*) from public.matches m where m.submitted_by = p.id and m.status = 'pending'),
         p.avatar,
         coalesce(case when u.raw_user_meta_data ->> 'avatar_url' ~ '^https://cdn\.discordapp\.com/[A-Za-z0-9_./?=-]{1,200}$'
                       then u.raw_user_meta_data ->> 'avatar_url' end, ''),
         p.banned, p.stats_excluded
  from public.profiles p left join auth.users u on u.id = p.id
  order by p.created_at;
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
  if cur = new_role then return; end if;
  update public.profiles set role = new_role where id = target;
  perform public.veil_log('role', null, target, jsonb_build_object('from', cur, 'to', new_role));
end $$;

-- 登録停止 (banned): can log in and look, cannot send matches. 統計から外す (stats_excluded): their matches stay but are not counted.
create or replace function public.set_user_flags(target uuid, p_banned boolean default null, p_excluded boolean default null) returns void
language plpgsql security definer set search_path = '' as $$
declare me text := coalesce(public.my_role(), ''); cur record;
begin
  if me not in ('manager', 'admin') then raise exception '運営か管理者だけが使えます'; end if;
  if target = auth.uid() then raise exception '自分には使えません'; end if;
  select role, banned, stats_excluded into cur from public.profiles where id = target;
  if not found then raise exception 'その人が見つかりません'; end if;
  if me = 'manager' and cur.role in ('manager', 'admin') then raise exception '運営や管理者には使えません'; end if;
  update public.profiles set banned = coalesce(p_banned, banned), stats_excluded = coalesce(p_excluded, stats_excluded) where id = target;
  if p_banned is not null and p_banned <> cur.banned then perform public.veil_log(case when p_banned then 'ban' else 'unban' end, null, target, '{}'); end if;
  if p_excluded is not null and p_excluded <> cur.stats_excluded then perform public.veil_log(case when p_excluded then 'exclude' else 'include' end, null, target, '{}'); end if;
end $$;

create or replace function public.set_current_season(season text) returns void
language plpgsql security definer set search_path = '' as $$
declare old text;
begin
  if coalesce(public.my_role(), '') not in ('manager', 'admin') then raise exception '運営か管理者だけが変えられます'; end if;
  season := upper(trim(season));
  if season !~ '^S[0-9]{1,3}$' then raise exception 'シーズンは S43 のように入れてください'; end if;
  select value into old from public.settings where key = 'current_season';
  insert into public.settings (key, value) values ('current_season', season) on conflict (key) do update set value = excluded.value;
  if old is distinct from season then perform public.veil_log('season', null, null, jsonb_build_object('from', old, 'to', season)); end if;
end $$;

-- 作業の記録を読む (運営 / 管理者): newest first; before = the smallest id already shown; kinds = filter
create or replace function public.audit_list(lim int default 50, before bigint default null, kinds text[] default null) returns table (
  id bigint, at timestamptz, actor_name text, actor_role text, action text, match_id bigint, target_name text, detail jsonb
) language plpgsql stable security definer set search_path = '' as $$
begin
  if coalesce(public.my_role(), '') not in ('manager', 'admin') then raise exception '運営か管理者だけが見られます'; end if;
  return query
  select l.id, l.at, coalesce(nullif(l.actor_name, ''), p.name, ''), p.role, l.action, l.match_id, l.target_name, l.detail
  from public.audit_log l left join public.profiles p on p.id = l.actor
  where (before is null or l.id < before) and (kinds is null or l.action = any (kinds))
  order by l.id desc
  limit least(greatest(lim, 1), 200);
end $$;

-- ---------- ヒーロー解説 / TIER / パッチ: everyone can read, 運営 / 管理者 write ----------
create table if not exists public.hero_notes (
  hero         text primary key references public.heroes (id) on delete cascade,
  strengths    text not null default '' check (char_length(strengths) <= 1500),
  weaknesses   text not null default '' check (char_length(weaknesses) <= 1500),
  playbook     text not null default '' check (char_length(playbook) <= 8000),
  editor_name  text not null default '',
  updated_at   timestamptz not null default now()
);
create table if not exists public.hero_tiers (
  hero         text not null references public.heroes (id) on delete cascade,
  lane         text not null check (lane in ('EXP', 'JUNGLE', 'MID', 'GOLD', 'ROAM')),
  tier         text not null check (tier in ('S', 'A', 'B', 'C', 'D')),
  editor_name  text not null default '',
  updated_at   timestamptz not null default now(),
  primary key (hero, lane)
);
create table if not exists public.patch_notes (
  id           bigint generated always as identity primary key,
  version      text not null check (char_length(version) between 1 and 20),
  released_on  date not null,
  title        text not null default '' check (char_length(title) <= 80),
  body         text not null default '' check (char_length(body) <= 8000),
  changes      jsonb not null default '[]' check (jsonb_typeof(changes) = 'array'),
  editor_name  text not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
alter table public.hero_notes enable row level security;
alter table public.hero_tiers enable row level security;
alter table public.patch_notes enable row level security;
drop policy if exists hero_notes_read on public.hero_notes;
create policy hero_notes_read on public.hero_notes for select to anon, authenticated using (true);
drop policy if exists hero_tiers_read on public.hero_tiers;
create policy hero_tiers_read on public.hero_tiers for select to anon, authenticated using (true);
drop policy if exists patch_notes_read on public.patch_notes;
create policy patch_notes_read on public.patch_notes for select to anon, authenticated using (true);
revoke all on public.hero_notes, public.hero_tiers, public.patch_notes from anon, authenticated;
grant select on public.hero_notes, public.hero_tiers, public.patch_notes to anon, authenticated;

-- payload: any of {"strengths":"…","weaknesses":"…","playbook":"…"}; keys left out stay as they are
create or replace function public.save_hero_note(hero text, payload jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare old record; nm text; ch jsonb := '{}';
begin
  if coalesce(public.my_role(), '') not in ('manager', 'admin') then raise exception '運営か管理者だけが編集できます'; end if;
  if not exists (select 1 from public.heroes h where h.id = save_hero_note.hero) then raise exception 'そのヒーローは見つかりません'; end if;
  select name into nm from public.profiles where id = auth.uid();
  select * into old from public.hero_notes n where n.hero = save_hero_note.hero;
  insert into public.hero_notes (hero, strengths, weaknesses, playbook, editor_name, updated_at)
  values (save_hero_note.hero, coalesce(payload ->> 'strengths', ''), coalesce(payload ->> 'weaknesses', ''), coalesce(payload ->> 'playbook', ''), coalesce(nm, ''), now())
  on conflict on constraint hero_notes_pkey do update set
    strengths = coalesce(payload ->> 'strengths', public.hero_notes.strengths),
    weaknesses = coalesce(payload ->> 'weaknesses', public.hero_notes.weaknesses),
    playbook = coalesce(payload ->> 'playbook', public.hero_notes.playbook),
    editor_name = coalesce(nm, ''), updated_at = now();
  select jsonb_object_agg(k, jsonb_build_object('before', coalesce(to_jsonb(old) ->> k, ''), 'after', payload ->> k)) into ch
    from unnest(array['strengths', 'weaknesses', 'playbook']) k where payload ? k and coalesce(to_jsonb(old) ->> k, '') is distinct from payload ->> k;
  if ch is not null then perform public.veil_log('hero_note', null, null, jsonb_build_object('hero', save_hero_note.hero, 'changes', ch)); end if;
end $$;

-- tier null = back to the automatic one
create or replace function public.set_hero_tier(hero text, lane text, tier text) returns void
language plpgsql security definer set search_path = '' as $$
declare old text; nm text;
begin
  if coalesce(public.my_role(), '') not in ('manager', 'admin') then raise exception '運営か管理者だけが設定できます'; end if;
  if not exists (select 1 from public.heroes h where h.id = set_hero_tier.hero) then raise exception 'そのヒーローは見つかりません'; end if;
  if lane not in ('EXP', 'JUNGLE', 'MID', 'GOLD', 'ROAM') then raise exception 'レーンが正しくありません'; end if;
  if tier is not null and tier not in ('S', 'A', 'B', 'C', 'D') then raise exception 'TIERは S / A / B / C / D です'; end if;
  select t.tier into old from public.hero_tiers t where t.hero = set_hero_tier.hero and t.lane = set_hero_tier.lane;
  if old is not distinct from tier then return; end if;
  select name into nm from public.profiles where id = auth.uid();
  if tier is null then delete from public.hero_tiers t where t.hero = set_hero_tier.hero and t.lane = set_hero_tier.lane;
  else insert into public.hero_tiers (hero, lane, tier, editor_name, updated_at) values (set_hero_tier.hero, set_hero_tier.lane, tier, coalesce(nm, ''), now())
       on conflict on constraint hero_tiers_pkey do update set tier = excluded.tier, editor_name = excluded.editor_name, updated_at = now(); end if;
  perform public.veil_log('tier', null, null, jsonb_build_object('hero', set_hero_tier.hero, 'lane', set_hero_tier.lane, 'from', old, 'to', tier));
end $$;

-- payload: {"version":"1.9.42","released_on":"2026-11-20","title":"…","body":"…","changes":[{"hero":"arlott","kind":"buff|nerf|adjust|new","text":"…"}]}
-- id null = a new patch. Returns the id.
create or replace function public.save_patch(id bigint, payload jsonb) returns bigint
language plpgsql security definer set search_path = '' as $$
declare nm text; ch jsonb := coalesce(payload -> 'changes', '[]'::jsonb); x jsonb; nid bigint; old jsonb;
begin
  if coalesce(public.my_role(), '') not in ('manager', 'admin') then raise exception '運営か管理者だけが編集できます'; end if;
  if coalesce(trim(payload ->> 'version'), '') = '' then raise exception 'バージョンを入れてください'; end if;
  if (payload ->> 'released_on') is null then raise exception '日付を入れてください'; end if;
  if jsonb_typeof(ch) <> 'array' or jsonb_array_length(ch) > 80 then raise exception '変更点は80件までです'; end if;
  for x in select * from jsonb_array_elements(ch) loop
    if not exists (select 1 from public.heroes h where h.id = x ->> 'hero') then raise exception '変更点のヒーローが正しくありません'; end if;
    if coalesce(x ->> 'kind', '') not in ('buff', 'nerf', 'adjust', 'new') then raise exception '変更点の種類が正しくありません'; end if;
    if char_length(coalesce(x ->> 'text', '')) > 300 then raise exception '変更点の説明は300文字までです'; end if;
  end loop;
  select name into nm from public.profiles where profiles.id = auth.uid();
  if save_patch.id is null then
    insert into public.patch_notes (version, released_on, title, body, changes, editor_name)
    values (trim(payload ->> 'version'), (payload ->> 'released_on')::date, coalesce(payload ->> 'title', ''), coalesce(payload ->> 'body', ''), ch, coalesce(nm, ''))
    returning patch_notes.id into nid;
    perform public.veil_log('patch_add', null, null, jsonb_build_object('patch', nid, 'version', trim(payload ->> 'version')));
  else
    select to_jsonb(p) into old from public.patch_notes p where p.id = save_patch.id;
    if old is null then raise exception 'そのパッチは見つかりません'; end if;
    update public.patch_notes p set version = trim(payload ->> 'version'), released_on = (payload ->> 'released_on')::date,
           title = coalesce(payload ->> 'title', ''), body = coalesce(payload ->> 'body', ''), changes = ch, editor_name = coalesce(nm, ''), updated_at = now()
     where p.id = save_patch.id returning p.id into nid;
    perform public.veil_log('patch_edit', null, null, jsonb_build_object('patch', nid, 'version', trim(payload ->> 'version'), 'before_version', old ->> 'version'));
  end if;
  return nid;
end $$;

create or replace function public.delete_patch(id bigint) returns void
language plpgsql security definer set search_path = '' as $$
declare v text;
begin
  if coalesce(public.my_role(), '') not in ('manager', 'admin') then raise exception '運営か管理者だけが削除できます'; end if;
  delete from public.patch_notes p where p.id = delete_patch.id returning version into v;
  if not found then raise exception 'そのパッチは見つかりません'; end if;
  perform public.veil_log('patch_delete', null, null, jsonb_build_object('patch', delete_patch.id, 'version', v));
end $$;

-- ---------- statistics: only approved matches from people who are not 統計から外す ----------
create or replace view public.counted_matches as
  select m.* from public.matches m left join public.profiles p on p.id = m.submitted_by
  where m.status = 'approved' and not coalesce(p.stats_excluded, false);
revoke all on public.counted_matches from anon, authenticated;

drop materialized view if exists public.stats_top_pairs;
drop materialized view if exists public.stats_vs;
drop materialized view if exists public.stats_mates;
drop materialized view if exists public.stats_hero_day;
drop materialized view if exists public.stats_hero;
drop materialized view if exists public.stats_recent_lanes;
drop materialized view if exists public.stats_summary;
create materialized view public.stats_hero as                 -- per hero × lane × rank × month
  select p.hero, p.lane, coalesce(m.rank, '') as rank, to_char(m.played_on, 'YYYY-MM') as month,
         count(*)::int as games, count(*) filter (where (p.side = 'ally') = m.win)::int as wins
  from public.picks p join public.counted_matches m on m.id = p.match_id
  group by 1, 2, 3, 4;
create unique index on public.stats_hero (hero, lane, rank, month);
create materialized view public.stats_hero_day as             -- per hero × day (daily chart on hero pages)
  select p.hero, m.played_on as day,
         count(*)::int as games, count(*) filter (where (p.side = 'ally') = m.win)::int as wins
  from public.picks p join public.counted_matches m on m.id = p.match_id
  group by 1, 2;
create unique index on public.stats_hero_day (hero, day);
create materialized view public.stats_vs as                   -- hero against the enemy in the same lane
  select p.hero, p.lane, o.hero as opp,
         count(*)::int as games, count(*) filter (where (p.side = 'ally') = m.win)::int as wins
  from public.picks p
  join public.picks o on o.match_id = p.match_id and o.lane = p.lane and o.side <> p.side
  join public.counted_matches m on m.id = p.match_id
  group by 1, 2, 3;
create unique index on public.stats_vs (hero, lane, opp);
create materialized view public.stats_mates as                -- hero (in a lane) with each teammate
  select p.hero, p.lane, t.hero as mate,
         count(*)::int as games, count(*) filter (where (p.side = 'ally') = m.win)::int as wins
  from public.picks p
  join public.picks t on t.match_id = p.match_id and t.side = p.side and t.lane <> p.lane
  join public.counted_matches m on m.id = p.match_id
  group by 1, 2, 3;
create unique index on public.stats_mates (hero, lane, mate);
create materialized view public.stats_top_pairs as            -- the most-played lane matchups (each pair once)
  select hero, lane, opp, games, wins from public.stats_vs
  where hero < opp order by games desc, wins::float / games desc limit 30;
create unique index on public.stats_top_pairs (hero, lane, opp);
create materialized view public.stats_recent_lanes as         -- lanes played in the newest 1000 counted matches (roulette)
  with recent as (select id from public.counted_matches order by played_on desc, id desc limit 1000)
  select p.hero, p.lane, count(*)::int as games
  from public.picks p join recent r on r.id = p.match_id
  group by 1, 2;
create unique index on public.stats_recent_lanes (hero, lane);
create materialized view public.stats_summary as
  select 1 as id, count(*)::int as matches, min(played_on) as first_on, max(played_on) as last_on,
         coalesce(array_agg(distinct rank) filter (where rank is not null), '{}') as ranks,
         least(count(*), 1000)::int as recent_n, now() as refreshed_at
  from public.counted_matches;
create unique index on public.stats_summary (id);
grant select on public.stats_hero, public.stats_hero_day, public.stats_vs, public.stats_mates, public.stats_top_pairs, public.stats_recent_lanes, public.stats_summary to anon, authenticated;

-- ---------- the log is kept for a year ----------
create or replace function public.trim_audit_log() returns void
language sql security definer set search_path = '' as $$ delete from public.audit_log where at < now() - interval '365 days' $$;
select cron.schedule('veil-trim-log', '30 19 * * *', 'select public.trim_audit_log()');   -- every day 04:30 JST

-- ---------- who may call what ----------
revoke execute on function public.veil_log(text, bigint, uuid, jsonb), public.veil_match_json(bigint), public.veil_flag(bigint),
  public.veil_review(bigint, boolean, text, boolean), public.veil_save_match(jsonb, bigint, boolean), public.veil_save_match(jsonb, bigint),
  public.trim_audit_log() from public, anon, authenticated;
revoke execute on function public.submit_match(jsonb), public.update_match(bigint, jsonb), public.review_match(bigint, boolean, text),
  public.decide_match(bigint, boolean, text), public.review_matches(bigint[], boolean, text), public.pending_matches(int),
  public.staff_matches(text, int), public.staff_match(bigint), public.staff_update_match(bigint, jsonb), public.unapprove_match(bigint, text, text),
  public.list_profiles(), public.set_role(uuid, text), public.set_user_flags(uuid, boolean, boolean), public.set_current_season(text),
  public.audit_list(int, bigint, text[]), public.save_hero_note(text, jsonb), public.set_hero_tier(text, text, text),
  public.save_patch(bigint, jsonb), public.delete_patch(bigint) from public, anon;
grant execute on function public.submit_match(jsonb), public.update_match(bigint, jsonb), public.review_match(bigint, boolean, text),
  public.decide_match(bigint, boolean, text), public.review_matches(bigint[], boolean, text), public.pending_matches(int),
  public.staff_matches(text, int), public.staff_match(bigint), public.staff_update_match(bigint, jsonb), public.unapprove_match(bigint, text, text),
  public.list_profiles(), public.set_role(uuid, text), public.set_user_flags(uuid, boolean, boolean), public.set_current_season(text),
  public.audit_list(int, bigint, text[]), public.save_hero_note(text, jsonb), public.set_hero_tier(text, text, text),
  public.save_patch(bigint, jsonb), public.delete_patch(bigint) to authenticated;


-- ---------- 装備・天賦・スペルの説明文の書き換え (元の文は gear.js のまま。書き換えた分だけここに入る) ----------
--   item: passive (EFFECT) / stats (上がる能力、1行に1つ)   talent: desc / extra   spell: desc
create table if not exists public.gear_texts (
  kind         text not null check (kind in ('item', 'talent', 'spell')),
  id           text not null check (id ~ '^[a-z0-9_]{1,40}$'),
  field        text not null check (field in ('passive', 'stats', 'desc', 'extra')),
  body         text not null check (char_length(body) <= 3000),
  editor_name  text not null default '',
  updated_at   timestamptz not null default now(),
  primary key (kind, id, field)
);
alter table public.gear_texts enable row level security;
drop policy if exists gear_texts_read on public.gear_texts;
create policy gear_texts_read on public.gear_texts for select to anon, authenticated using (true);
revoke all on public.gear_texts from anon, authenticated;
grant select on public.gear_texts to anon, authenticated;

-- body null or '' = back to the original text
create or replace function public.save_gear_text(kind text, id text, field text, body text) returns void
language plpgsql security definer set search_path = '' as $$
declare old text; nm text;
begin
  if coalesce(public.my_role(), '') not in ('manager', 'admin') then raise exception '運営か管理者だけが編集できます'; end if;
  if kind not in ('item', 'talent', 'spell') or coalesce(id, '') !~ '^[a-z0-9_]{1,40}$' then raise exception '対象が正しくありません'; end if;
  if not ((kind = 'item' and field in ('passive', 'stats')) or (kind = 'talent' and field in ('desc', 'extra')) or (kind = 'spell' and field = 'desc')) then
    raise exception '編集できる項目ではありません';
  end if;
  if char_length(coalesce(body, '')) > 3000 then raise exception '3000文字までです'; end if;
  select g.body into old from public.gear_texts g where g.kind = save_gear_text.kind and g.id = save_gear_text.id and g.field = save_gear_text.field;
  if coalesce(body, '') = '' then
    if old is null then return; end if;
    delete from public.gear_texts g where g.kind = save_gear_text.kind and g.id = save_gear_text.id and g.field = save_gear_text.field;
  else
    if old is not distinct from body then return; end if;
    select name into nm from public.profiles where profiles.id = auth.uid();
    insert into public.gear_texts (kind, id, field, body, editor_name, updated_at) values (kind, id, field, body, coalesce(nm, ''), now())
      on conflict on constraint gear_texts_pkey do update set body = excluded.body, editor_name = excluded.editor_name, updated_at = now();
  end if;
  perform public.veil_log('gear_text', null, null, jsonb_build_object('kind', kind, 'id', id, 'field', field, 'before', old, 'after', nullif(body, '')));
end $$;
revoke execute on function public.save_gear_text(text, text, text, text) from public, anon;
grant execute on function public.save_gear_text(text, text, text, text) to authenticated;

select public.refresh_stats();
