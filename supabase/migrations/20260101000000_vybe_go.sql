-- =====================================================================
--  VYBE GO — Supabase ডাটাবেস স্কিমা
--  Supabase Dashboard → SQL Editor → New query → পুরো ফাইল পেস্ট → Run
--  (একাধিকবার চালালেও নিরাপদ)
--
--  নকশা:
--   * ইউজার = Supabase Anonymous Auth (প্রতি ডিভাইসে একটি স্থায়ী বেনামী ID)
--   * টেবিলগুলোতে RLS চালু এবং কোনো policy নেই → ক্লায়েন্ট সরাসরি টেবিল পড়তে/লিখতে পারে না
--   * সব কাজ SECURITY DEFINER ফাংশনের (RPC) মাধ্যমে, যেগুলো নিজেই যাচাই করে কে কী করতে পারে
--   * ম্যাচমেকিং একটি advisory lock দিয়ে serialize করা → দুজন একই সাথে ঢুকলেও race হয় না
--   * সার্ভার থেকে ক্লায়েন্টকে নোটিফিকেশন: realtime.send (ব্যর্থ হলে client polling ভরসা)
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- টেবিল
-- ---------------------------------------------------------------------
create table if not exists public.app_secrets (
  key   text primary key,
  value text not null
);
insert into public.app_secrets (key, value)
values ('ip_salt', md5(gen_random_uuid()::text || clock_timestamp()::text) || md5(random()::text))
on conflict (key) do nothing;

create table if not exists public.devices (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  ip_hash    text,
  updated_at timestamptz not null default now()
);

create table if not exists public.queue (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  self_gender  text not null check (self_gender in ('boy', 'girl')),
  self_country text not null,
  want_gender  text not null check (want_gender in ('any', 'boy', 'girl')),
  want_country text not null,
  created_at   timestamptz not null default now(),
  last_seen    timestamptz not null default now()
);
create index if not exists queue_created_idx on public.queue (created_at);

create table if not exists public.matches (
  id         uuid primary key default gen_random_uuid(),
  a_user     uuid not null references auth.users (id) on delete cascade,  -- আগে থেকে অপেক্ষায় ছিল (initiator)
  b_user     uuid not null references auth.users (id) on delete cascade,
  a_country  text not null,
  b_country  text not null,
  created_at timestamptz not null default now(),
  ended_at   timestamptz,
  ended_by   uuid
);
create index if not exists matches_active_a_idx on public.matches (a_user) where ended_at is null;
create index if not exists matches_active_b_idx on public.matches (b_user) where ended_at is null;

create table if not exists public.blocks (
  blocker    uuid not null references auth.users (id) on delete cascade,
  blocked    uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked)
);
create index if not exists blocks_blocked_idx on public.blocks (blocked);

create table if not exists public.reports (
  id               bigint generated always as identity primary key,
  created_at       timestamptz not null default now(),
  match_id         uuid references public.matches (id) on delete set null,
  reporter         uuid not null references auth.users (id) on delete cascade,
  reported         uuid not null references auth.users (id) on delete cascade,
  reported_ip_hash text,
  reason           text not null check (reason in ('nudity', 'harassment', 'spam', 'underage', 'violence', 'other')),
  details          text,
  evidence         text[] not null default '{}',
  unique (reporter, match_id)
);
create index if not exists reports_reported_idx on public.reports (reported, created_at);
create index if not exists reports_reporter_idx on public.reports (reporter, created_at);

create table if not exists public.bans (
  id         bigint generated always as identity primary key,
  kind       text not null check (kind in ('user', 'ip')),
  key        text not null,
  until      timestamptz not null,
  reason     text not null,
  created_at timestamptz not null default now()
);
create index if not exists bans_lookup_idx on public.bans (kind, key, until);

-- ---------------------------------------------------------------------
-- নিরাপত্তা: RLS চালু, কোনো policy নেই, anon/authenticated এর সরাসরি অধিকার বাতিল
-- (আপনি Dashboard এ service role দিয়ে সব দেখতে পারবেন)
-- ---------------------------------------------------------------------
alter table public.app_secrets enable row level security;
alter table public.devices     enable row level security;
alter table public.queue       enable row level security;
alter table public.matches     enable row level security;
alter table public.blocks      enable row level security;
alter table public.reports     enable row level security;
alter table public.bans        enable row level security;

revoke all on public.app_secrets, public.devices, public.queue, public.matches,
              public.blocks, public.reports, public.bans from anon, authenticated;

-- ---------------------------------------------------------------------
-- অভ্যন্তরীণ সহায়ক ফাংশন (ক্লায়েন্ট সরাসরি ডাকতে পারে না)
-- ---------------------------------------------------------------------
create or replace function public._client_ip()
returns text
language plpgsql
stable
as $$
declare
  headers json;
begin
  begin
    headers := nullif(current_setting('request.headers', true), '')::json;
  exception when others then
    headers := null;
  end;
  return btrim(split_part(coalesce(headers ->> 'x-forwarded-for', ''), ',', 1));
end;
$$;

create or replace function public._active_ban(p_user uuid, p_ip_hash text)
returns timestamptz
language sql
stable
as $$
  select max(b.until)
  from public.bans b
  where b.until > now()
    and ((b.kind = 'user' and b.key = p_user::text) or (b.kind = 'ip' and b.key = p_ip_hash));
$$;

create or replace function public._notify(p_user uuid, p_event text, p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  -- Realtime Broadcast: ক্লায়েন্ট 'user:<id>' চ্যানেলে শোনে। ব্যর্থ হলে নীরবে বাদ —
  -- ক্লায়েন্ট প্রতি ৮ সেকেন্ডে poll_state() দিয়ে একই তথ্য পেয়ে যায়।
  perform realtime.send(p_payload, p_event, 'user:' || p_user::text, false);
exception when others then
  null;
end;
$$;

create or replace function public._end_active_matches(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  r record;
begin
  for r in
    update public.matches
       set ended_at = now(), ended_by = p_user
     where ended_at is null and (a_user = p_user or b_user = p_user)
    returning id, a_user, b_user
  loop
    perform public._notify(
      case when r.a_user = p_user then r.b_user else r.a_user end,
      'ended',
      jsonb_build_object('match_id', r.id)
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- RPC: queue এ ঢোকা ও ম্যাচ খোঁজা
-- ---------------------------------------------------------------------
create or replace function public.join_queue(
  p_self_gender  text,
  p_self_country text,
  p_want_gender  text,
  p_want_country text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid      uuid := auth.uid();
  v_salt     text;
  v_ip       text;
  v_ip_hash  text;
  v_until    timestamptz;
  v_partner  public.queue%rowtype;
  v_match_id uuid;
  v_countries constant text[] := array[
    'Bangladesh','India','United States','United Kingdom','Canada','Japan',
    'Brazil','Germany','Turkey','Indonesia','Other'
  ];
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  if p_self_gender not in ('boy', 'girl')
     or p_want_gender not in ('any', 'boy', 'girl')
     or not (p_self_country = any (v_countries))
     or not (p_want_country = 'Global' or p_want_country = any (v_countries)) then
    raise exception 'INVALID' using errcode = '22023';
  end if;

  -- সব matchmaking একই লকে serialize হয় → race নেই
  perform pg_advisory_xact_lock(724001);

  select value into v_salt from public.app_secrets where key = 'ip_salt';
  v_ip := coalesce(nullif(public._client_ip(), ''), 'unknown');
  v_ip_hash := encode(extensions.digest(v_ip || coalesce(v_salt, ''), 'sha256'), 'hex');

  v_until := public._active_ban(v_uid, v_ip_hash);
  if v_until is not null then
    raise exception 'BANNED:%', (extract(epoch from v_until) * 1000)::bigint using errcode = 'P0001';
  end if;

  insert into public.devices (user_id, ip_hash, updated_at)
  values (v_uid, v_ip_hash, now())
  on conflict (user_id) do update set ip_hash = excluded.ip_hash, updated_at = now();

  -- আগের ম্যাচ ও queue এন্ট্রি শেষ (Next চাপলে এটাই ঘটে)
  perform public._end_active_matches(v_uid);
  delete from public.queue where user_id = v_uid;

  select q.* into v_partner
  from public.queue q
  where q.user_id <> v_uid
    and q.last_seen > now() - interval '25 seconds'
    and (q.want_gender = 'any' or q.want_gender = p_self_gender)
    and (q.want_country = 'Global' or q.want_country = p_self_country)
    and (p_want_gender = 'any' or p_want_gender = q.self_gender)
    and (p_want_country = 'Global' or p_want_country = q.self_country)
    and not exists (
      select 1 from public.blocks b
      where (b.blocker = v_uid and b.blocked = q.user_id)
         or (b.blocker = q.user_id and b.blocked = v_uid)
    )
  order by q.created_at
  limit 1
  for update skip locked;

  if found then
    delete from public.queue where user_id = v_partner.user_id;

    insert into public.matches (a_user, b_user, a_country, b_country)
    values (v_partner.user_id, v_uid, v_partner.self_country, p_self_country)
    returning id into v_match_id;

    perform public._notify(
      v_partner.user_id,
      'match',
      jsonb_build_object('match_id', v_match_id, 'initiator', true, 'partner_country', p_self_country)
    );

    return jsonb_build_object(
      'status', 'matched',
      'match_id', v_match_id,
      'initiator', false,
      'partner_country', v_partner.self_country
    );
  end if;

  insert into public.queue (user_id, self_gender, self_country, want_gender, want_country)
  values (v_uid, p_self_gender, p_self_country, p_want_gender, p_want_country);

  return jsonb_build_object('status', 'queued');
end;
$$;

-- ---------------------------------------------------------------------
-- RPC: queue ছাড়া
-- ---------------------------------------------------------------------
create or replace function public.leave_queue()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;
  delete from public.queue where user_id = auth.uid();
end;
$$;

-- ---------------------------------------------------------------------
-- RPC: হার্টবিট + হারানো ইভেন্টের বিকল্প (polling)
-- ---------------------------------------------------------------------
create or replace function public.poll_state(p_match_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid      uuid := auth.uid();
  v_in_queue boolean;
  v_active   public.matches%rowtype;
  v_ended    boolean := false;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  update public.queue set last_seen = now() where user_id = v_uid;
  v_in_queue := found;

  select * into v_active
  from public.matches
  where ended_at is null and (a_user = v_uid or b_user = v_uid)
  order by created_at desc
  limit 1;

  if p_match_id is not null then
    v_ended := not exists (
      select 1 from public.matches
      where id = p_match_id and ended_at is null and (a_user = v_uid or b_user = v_uid)
    );
  end if;

  return jsonb_build_object(
    'in_queue', v_in_queue,
    'current_ended', v_ended,
    'match', case
      when v_active.id is null then null
      else jsonb_build_object(
        'match_id', v_active.id,
        'initiator', v_active.a_user = v_uid,
        'partner_country', case when v_active.a_user = v_uid then v_active.b_country else v_active.a_country end
      )
    end
  );
end;
$$;

-- ---------------------------------------------------------------------
-- RPC: ম্যাচ শেষ করা
-- ---------------------------------------------------------------------
create or replace function public.end_match(p_match_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid   uuid := auth.uid();
  v_other uuid;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  update public.matches
     set ended_at = now(), ended_by = v_uid
   where id = p_match_id and ended_at is null and (a_user = v_uid or b_user = v_uid)
  returning case when a_user = v_uid then b_user else a_user end into v_other;

  if v_other is null then
    return false;
  end if;

  perform public._notify(v_other, 'ended', jsonb_build_object('match_id', p_match_id));
  return true;
end;
$$;

-- ---------------------------------------------------------------------
-- RPC: রিপোর্ট (+ স্বয়ংক্রিয় ব্যান)
--   নিয়ম: ২৪ ঘণ্টায় ৩ জন আলাদা ইউজার রিপোর্ট করলে ২৪ ঘণ্টার ব্যান (ইউজার + IP)
--   সংখ্যা বদলাতে নিচের v_threshold / v_hours বদলান
-- ---------------------------------------------------------------------
create or replace function public.report_user(
  p_match_id uuid,
  p_reason   text,
  p_details  text default null,
  p_evidence text[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid       uuid := auth.uid();
  v_match     public.matches%rowtype;
  v_target    uuid;
  v_ip_hash   text;
  v_count     int;
  v_until     timestamptz;
  v_banned    boolean := false;
  v_threshold constant int := 3;
  v_hours     constant int := 24;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;
  if p_reason not in ('nudity', 'harassment', 'spam', 'underage', 'violence', 'other') then
    raise exception 'INVALID' using errcode = '22023';
  end if;

  select * into v_match
  from public.matches
  where id = p_match_id
    and (a_user = v_uid or b_user = v_uid)
    and (ended_at is null or ended_at > now() - interval '5 minutes');
  if not found then
    raise exception 'NOT_IN_MATCH' using errcode = 'P0002';
  end if;

  if (select count(*) from public.reports where reporter = v_uid and created_at > now() - interval '1 hour') >= 10 then
    return jsonb_build_object('accepted', false, 'banned', false);
  end if;

  v_target := case when v_match.a_user = v_uid then v_match.b_user else v_match.a_user end;
  select ip_hash into v_ip_hash from public.devices where user_id = v_target;

  insert into public.reports (match_id, reporter, reported, reported_ip_hash, reason, details, evidence)
  values (
    p_match_id, v_uid, v_target, v_ip_hash, p_reason,
    left(p_details, 500),
    coalesce((select array_agg(left(e, 180)) from (select e from unnest(p_evidence) as e limit 10) s), '{}')
  )
  on conflict (reporter, match_id) do nothing;

  if not found then
    return jsonb_build_object('accepted', true, 'banned', false);  -- একই ম্যাচের পুনরায় রিপোর্ট
  end if;

  select count(distinct reporter) into v_count
  from public.reports
  where reported = v_target and created_at > now() - interval '24 hours';

  if v_count >= v_threshold and public._active_ban(v_target, coalesce(v_ip_hash, '')) is null then
    v_until := now() + make_interval(hours => v_hours);
    insert into public.bans (kind, key, until, reason)
    values ('user', v_target::text, v_until, 'Auto-ban: ' || v_count || ' distinct reports in 24h');
    if v_ip_hash is not null then
      insert into public.bans (kind, key, until, reason)
      values ('ip', v_ip_hash, v_until, 'Auto-ban: ' || v_count || ' distinct reports in 24h');
    end if;
    delete from public.queue where user_id = v_target;
    perform public._end_active_matches(v_target);
    perform public._notify(v_target, 'banned', jsonb_build_object('until', (extract(epoch from v_until) * 1000)::bigint));
    v_banned := true;
  end if;

  return jsonb_build_object('accepted', true, 'banned', v_banned);
end;
$$;

-- ---------------------------------------------------------------------
-- RPC: ব্লক (দুই দিকেই আর কখনো ম্যাচ হবে না) এবং ম্যাচ শেষ
-- ---------------------------------------------------------------------
create or replace function public.block_user(p_match_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_uid    uuid := auth.uid();
  v_match  public.matches%rowtype;
  v_target uuid;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  select * into v_match
  from public.matches
  where id = p_match_id
    and (a_user = v_uid or b_user = v_uid)
    and (ended_at is null or ended_at > now() - interval '5 minutes');
  if not found then
    raise exception 'NOT_IN_MATCH' using errcode = 'P0002';
  end if;

  v_target := case when v_match.a_user = v_uid then v_match.b_user else v_match.a_user end;
  insert into public.blocks (blocker, blocked) values (v_uid, v_target) on conflict do nothing;
  perform public.end_match(p_match_id);
  return true;
end;
$$;

-- ---------------------------------------------------------------------
-- RPC: অনলাইন সংখ্যা (অপেক্ষারত + কলে থাকা)
-- ---------------------------------------------------------------------
create or replace function public.online_count()
returns integer
language sql
stable
security definer
set search_path = public, extensions
as $$
  select (
    (select count(*) from public.queue where last_seen > now() - interval '30 seconds')
    + 2 * (select count(*) from public.matches where ended_at is null and created_at > now() - interval '3 hours')
  )::integer;
$$;

-- ---------------------------------------------------------------------
-- রক্ষণাবেক্ষণ: পুরনো ডেটা পরিষ্কার (README তে pg_cron দিয়ে প্রতি ঘণ্টায় চালানোর নিয়ম আছে)
-- ---------------------------------------------------------------------
create or replace function public.vybe_cleanup()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  delete from public.queue   where last_seen < now() - interval '2 minutes';
  update public.matches set ended_at = now() where ended_at is null and created_at < now() - interval '3 hours';
  delete from public.matches where ended_at < now() - interval '30 days'
    and id not in (select match_id from public.reports where match_id is not null);
  delete from public.bans    where until < now() - interval '90 days';
end;
$$;

-- ---------------------------------------------------------------------
-- অনুমতি: শুধু লগইন করা (anonymous সহ) ইউজার RPC ডাকতে পারবে
-- ---------------------------------------------------------------------
revoke execute on function public._client_ip()                          from public, anon, authenticated;
revoke execute on function public._active_ban(uuid, text)               from public, anon, authenticated;
revoke execute on function public._notify(uuid, text, jsonb)            from public, anon, authenticated;
revoke execute on function public._end_active_matches(uuid)             from public, anon, authenticated;
revoke execute on function public.vybe_cleanup()                        from public, anon, authenticated;

revoke execute on function public.join_queue(text, text, text, text)    from public, anon;
revoke execute on function public.leave_queue()                         from public, anon;
revoke execute on function public.poll_state(uuid)                      from public, anon;
revoke execute on function public.end_match(uuid)                       from public, anon;
revoke execute on function public.report_user(uuid, text, text, text[]) from public, anon;
revoke execute on function public.block_user(uuid)                      from public, anon;
revoke execute on function public.online_count()                        from public, anon;

grant execute on function public.join_queue(text, text, text, text)     to authenticated;
grant execute on function public.leave_queue()                          to authenticated;
grant execute on function public.poll_state(uuid)                       to authenticated;
grant execute on function public.end_match(uuid)                        to authenticated;
grant execute on function public.report_user(uuid, text, text, text[])  to authenticated;
grant execute on function public.block_user(uuid)                       to authenticated;
grant execute on function public.online_count()                         to authenticated;

-- ---------------------------------------------------------------------
-- অ্যাডমিনের জন্য সুবিধাজনক ভিউ (Dashboard → Table Editor/SQL Editor এ দেখুন)
-- ---------------------------------------------------------------------
create or replace view public.admin_recent_reports as
  select r.id, r.created_at, r.reason, r.details, r.evidence, r.reporter, r.reported, r.match_id
  from public.reports r
  order by r.id desc
  limit 200;
revoke all on public.admin_recent_reports from anon, authenticated;

create or replace view public.admin_active_bans as
  select b.id, b.kind, b.key, b.until, b.reason, b.created_at
  from public.bans b
  where b.until > now()
  order by b.until desc;
revoke all on public.admin_active_bans from anon, authenticated;
