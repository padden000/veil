-- VEIL: ご意見・ご要望 (2026-11-24). Paste into the Supabase SQL Editor and run once, after manage.sql; running it again is safe.
-- People who are logged in can send a message (要望 / 不具合 / データの間違い / その他) and see what happened to theirs.
-- 運営 and 管理者 read them on the review page (tab ご意見) and mark them 対応済み.
-- Everything goes through the functions below; the table itself is not readable from the site.

create table if not exists public.feedback (
  id          bigint generated always as identity primary key,
  at          timestamptz not null default now(),
  sender      uuid references public.profiles (id) on delete set null,   -- an account that is deleted leaves the message, without a name
  kind        text not null check (kind in ('request', 'bug', 'data', 'other')),
  body        text not null check (char_length(body) between 1 and 2000),
  page        text not null default '' check (char_length(page) <= 200),  -- the page they came from, if any
  status      text not null default 'open' check (status in ('open', 'done')),
  reply       text not null default '' check (char_length(reply) <= 1000), -- a short answer the sender can read on the form
  handled_by  uuid references public.profiles (id) on delete set null,
  handled_at  timestamptz
);
create index if not exists feedback_status_at on public.feedback (status, at desc);
create index if not exists feedback_sender_at on public.feedback (sender, at desc);
alter table public.feedback enable row level security;
revoke all on public.feedback from anon, authenticated;

-- send one message. At most 5 a day per person, so the box cannot be flooded.
create or replace function public.send_feedback(p_kind text, p_body text, p_page text default '') returns bigint
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); b text := btrim(coalesce(p_body, '')); n int; new_id bigint;
begin
  if me is null then raise exception 'ログインしてから送ってください'; end if;
  if p_kind not in ('request', 'bug', 'data', 'other') then raise exception '種類を選んでください'; end if;
  if b = '' then raise exception '内容を書いてください'; end if;
  if char_length(b) > 2000 then raise exception '2000文字までにしてください'; end if;
  select count(*) into n from public.feedback where sender = me and at > now() - interval '1 day';
  if n >= 5 then raise exception '送れるのは1日5件までです。少し時間をおいてください'; end if;
  insert into public.feedback (sender, kind, body, page) values (me, p_kind, b, left(coalesce(p_page, ''), 200)) returning id into new_id;
  return new_id;
end $$;

-- what I sent, newest first
create or replace function public.my_feedback(lim int default 20)
returns table (id bigint, at timestamptz, kind text, body text, status text, reply text, handled_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select f.id, f.at, f.kind, f.body, f.status, f.reply, f.handled_at from public.feedback f
  where f.sender = auth.uid() order by f.at desc limit least(greatest(coalesce(lim, 20), 1), 50)
$$;

-- for 運営 and 管理者: p_status 'open' / 'done' / 'all'
create or replace function public.staff_feedback(p_status text default 'open', lim int default 100)
returns table (id bigint, at timestamptz, kind text, body text, page text, status text, reply text,
               sender_name text, sender_role text, handler_name text, handled_at timestamptz, open_count bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if coalesce(public.my_role(), '') not in ('manager', 'admin') then raise exception '運営か管理者だけが見られます'; end if;
  return query
    select f.id, f.at, f.kind, f.body, f.page, f.status, f.reply,
           coalesce(s.name, '(退会した人)'), coalesce(s.role, ''), coalesce(h.name, ''), f.handled_at,
           (select count(*) from public.feedback o where o.status = 'open')
    from public.feedback f left join public.profiles s on s.id = f.sender left join public.profiles h on h.id = f.handled_by
    where p_status = 'all' or f.status = p_status
    order by f.at desc limit least(greatest(coalesce(lim, 100), 1), 300);
end $$;

-- mark 対応済み (with an optional answer the sender will see) or back to 未対応
create or replace function public.set_feedback(p_id bigint, p_status text, p_reply text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare cur record;
begin
  if coalesce(public.my_role(), '') not in ('manager', 'admin') then raise exception '運営か管理者だけが変えられます'; end if;
  if p_status not in ('open', 'done') then raise exception '状態が正しくありません'; end if;
  if p_reply is not null and char_length(p_reply) > 1000 then raise exception '返事は1000文字までにしてください'; end if;
  select f.status, f.sender, f.kind into cur from public.feedback f where f.id = p_id for update;
  if not found then raise exception 'そのご意見が見つかりません'; end if;
  update public.feedback set status = p_status, reply = coalesce(btrim(p_reply), reply),
         handled_by = case when p_status = 'done' then auth.uid() end, handled_at = case when p_status = 'done' then now() end
  where id = p_id;
  perform public.veil_log(case when p_status = 'done' then 'feedback_done' else 'feedback_open' end, null, cur.sender,
                          jsonb_build_object('id', p_id, 'kind', cur.kind, 'reply', coalesce(btrim(p_reply), '')));
end $$;

-- 対応済み のものは1年で消える (未対応は残る)
create or replace function public.trim_feedback() returns void
language sql security definer set search_path = '' as $$
  delete from public.feedback where status = 'done' and handled_at < now() - interval '365 days'
$$;
select cron.schedule('veil-trim-feedback', '40 19 * * *', 'select public.trim_feedback()');   -- every day 04:40 JST

revoke execute on function public.send_feedback(text, text, text), public.my_feedback(int), public.staff_feedback(text, int),
  public.set_feedback(bigint, text, text), public.trim_feedback() from public, anon;
grant execute on function public.send_feedback(text, text, text), public.my_feedback(int), public.staff_feedback(text, int),
  public.set_feedback(bigint, text, text) to authenticated;
revoke execute on function public.trim_feedback() from authenticated;
