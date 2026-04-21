-- Grid Line Defense: initial ranking schema
-- profiles + runs + v_leaderboard, RLS, rate-limit trigger
create extension if not exists citext;

create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  nickname   citext unique not null check (char_length(nickname) between 2 and 16),
  avatar_key text not null check (char_length(avatar_key) <= 64),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.runs (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  wave_reached   int  not null check (wave_reached between 0 and 50),
  remaining_hp   int  not null check (remaining_hp between 0 and 25),
  initial_hp     int  not null check (initial_hp between 1 and 25),
  result         text not null check (result in ('victory','defeat')),
  towers_placed  int  not null check (towers_placed between 0 and 200),
  duration_sec   int  not null check (duration_sec between 10 and 14400),
  gold_earned    int  not null check (gold_earned between 0 and 1000000),
  submitted_at   timestamptz not null default now(),
  check (remaining_hp <= initial_hp)
);

create index runs_user_submitted_idx on public.runs (user_id, submitted_at desc);
create index runs_leaderboard_idx    on public.runs (wave_reached desc, remaining_hp desc);
-- Composite index aligned with v_leaderboard's inner DISTINCT ON ordering so
-- per-user best selection can use an index-only plan at scale.
create index runs_user_best_idx
  on public.runs (user_id, wave_reached desc, remaining_hp desc, submitted_at asc);

alter table public.profiles enable row level security;
alter table public.runs     enable row level security;

-- Deliberately no DELETE/UPDATE policies on public.runs: once submitted, a run
-- is immutable. Deletion requires admin/service_role. profiles may be updated
-- by the owner only (nickname/avatar) but never deleted through the client.

create policy "profiles_read_all"
  on public.profiles for select using (true);
create policy "profiles_insert_self"
  on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_self"
  on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "runs_read_all"
  on public.runs for select using (true);
create policy "runs_insert_self"
  on public.runs for insert with check (auth.uid() = user_id);

-- Rate limit: a user may not insert two runs closer together than
-- clamp(30, prev_duration / 2, 180) seconds. The upper cap of 180s keeps
-- legitimate back-to-back short runs playable — after a 10-minute run the
-- cooldown is still 180s, not 300s. Failed inserts never persist, so only
-- successful prior runs gate the next submission (burst attacks still fail
-- on the second attempt and never populate the lookup).
create or replace function public.runs_before_insert()
returns trigger language plpgsql as $$
declare
  prev_submitted timestamptz;
  prev_duration  int;
begin
  new.submitted_at := now();

  select submitted_at, duration_sec
    into prev_submitted, prev_duration
    from public.runs
   where user_id = new.user_id
   order by submitted_at desc
   limit 1;

  if prev_submitted is not null
     and now() - prev_submitted < make_interval(
       secs => least(180, greatest(30, prev_duration / 2))
     ) then
    raise exception 'rate_limit: too soon since last run';
  end if;

  return new;
end $$;

create trigger runs_before_insert_trg
  before insert on public.runs
  for each row execute function public.runs_before_insert();

-- security_invoker = true (Postgres 15+): view runs with caller's privileges,
-- so underlying runs/profiles RLS stays authoritative for future policy changes.
-- Tie-break policy: within identical (wave_reached, remaining_hp), the earlier
-- submission wins both the per-user best selection and the rank assignment.
-- This makes the leaderboard deterministic and gives a first-achieved
-- advantage for ties (intentional — encourages early pushes).
create view public.v_leaderboard with (security_invoker = true) as
select
  r.user_id,
  p.nickname,
  p.avatar_key,
  r.wave_reached,
  r.remaining_hp,
  r.result,
  r.submitted_at as achieved_at,
  row_number() over (
    order by r.wave_reached desc, r.remaining_hp desc, r.submitted_at asc
  ) as rank
from (
  select distinct on (user_id) *
  from public.runs
  order by user_id, wave_reached desc, remaining_hp desc, submitted_at asc
) r
join public.profiles p on p.id = r.user_id;

grant select on public.v_leaderboard to anon, authenticated;
