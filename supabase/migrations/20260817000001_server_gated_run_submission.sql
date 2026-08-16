-- Security finding 1 (Medium): leaderboard scores were client-authored.
--
-- `runs_insert_self` let any authenticated client POST a row straight to
-- PostgREST, so `wave_reached = 50, remaining_hp = 25` was one HTTP call away
-- from the browser console. The CHECK constraints bounded the *range* of each
-- column and the rate-limit trigger bounded the *frequency* of inserts, but
-- nothing tied a submitted score to an actual play session.
--
-- This migration closes the direct-insert path and routes submission through
-- two SECURITY DEFINER functions:
--
--   start_run()  -> issues a single-use, server-timestamped session at the
--                   moment a run actually begins.
--   submit_run() -> claims that session exactly once and rejects payloads that
--                   are impossible for the elapsed wall-clock time or that
--                   contradict the game's own end-of-run invariants.
--
-- What this does NOT do: it is not full replay verification. A patient
-- attacker can still open a session, wait out the wall-clock floor, and submit
-- a forged score. It raises the cost from "one request" to "hold a session for
-- N real seconds per wave", and it makes internally inconsistent payloads
-- impossible. Full integrity requires re-simulating the recorded input log
-- server-side against packages/shared/src/testing/replay-runner.ts — tracked
-- separately, see docs/game-spec/05-operations.md.

-- ---------------------------------------------------------------------------
-- Run sessions
-- ---------------------------------------------------------------------------

create table public.run_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  started_at  timestamptz not null default now(),
  consumed_at timestamptz
);

-- Partial index: every hot lookup ("this user's still-open sessions") filters
-- on consumed_at is null, so the index only needs to carry live rows.
create index run_sessions_user_open_idx
  on public.run_sessions (user_id, started_at desc)
  where consumed_at is null;

alter table public.run_sessions enable row level security;

-- Deliberately zero policies. With RLS on and no policy, PostgREST sees no
-- rows and no writes for anon/authenticated; the SECURITY DEFINER functions
-- below are the only access path. The explicit REVOKE makes that intent
-- independent of whatever default grants the schema hands out.
revoke all on public.run_sessions from anon, authenticated;

-- How long an issued session stays claimable. Generous on purpose: the client
-- queues runs to localStorage when offline (authStore.flushPendingRun), and
-- that queued run still has to be able to claim its original session on the
-- next launch.
create or replace function public.run_session_ttl()
returns interval language sql immutable as $$ select interval '24 hours' $$;

-- Cap on simultaneously-open sessions per user. Without a cap a client could
-- pre-open thousands of sessions, let them age past the wall-clock floor, and
-- then redeem them as instant max-score submissions.
create or replace function public.run_session_max_open()
returns int language sql immutable as $$ select 5 $$;

-- ---------------------------------------------------------------------------
-- start_run
-- ---------------------------------------------------------------------------

create or replace function public.start_run()
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid        uuid := auth.uid();
  v_open_count int;
  v_session_id uuid;
begin
  if v_uid is null then
    raise exception 'unauthenticated: sign in before starting a run'
      using errcode = '28000';
  end if;

  -- Retire anything past its TTL so it stops counting against the open cap.
  update public.run_sessions
     set consumed_at = now()
   where user_id = v_uid
     and consumed_at is null
     and started_at < now() - public.run_session_ttl();

  select count(*) into v_open_count
    from public.run_sessions
   where user_id = v_uid
     and consumed_at is null;

  -- At the cap, retire the oldest rather than refusing to start. A legitimate
  -- player leaks sessions constantly (browser crash, tab close mid-run) and
  -- must never be locked out of playing; an attacker farming sessions stays
  -- pinned at run_session_max_open() regardless.
  if v_open_count >= public.run_session_max_open() then
    update public.run_sessions
       set consumed_at = now()
     where id = (
       select id
         from public.run_sessions
        where user_id = v_uid
          and consumed_at is null
        order by started_at asc
        limit 1
     );
  end if;

  insert into public.run_sessions (user_id)
  values (v_uid)
  returning id into v_session_id;

  return v_session_id;
end $$;

-- ---------------------------------------------------------------------------
-- submit_run
-- ---------------------------------------------------------------------------

create or replace function public.submit_run(
  p_session_id    uuid,
  p_wave_reached  int,
  p_remaining_hp  int,
  p_initial_hp    int,
  p_result        text,
  p_towers_placed int,
  p_duration_sec  int,
  p_gold_earned   int
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid        uuid := auth.uid();
  v_started_at timestamptz;
  v_wall_sec   numeric;
  v_run_id     uuid;
begin
  if v_uid is null then
    raise exception 'unauthenticated: sign in before submitting a run'
      using errcode = '28000';
  end if;

  -- Single-use claim. UPDATE ... RETURNING proves in one atomic statement that
  -- the session exists, belongs to this caller, is unconsumed and unexpired —
  -- and closes it. Two concurrent submits cannot both claim one session, so
  -- there is no check-then-act window to race.
  update public.run_sessions
     set consumed_at = now()
   where id = p_session_id
     and user_id = v_uid
     and consumed_at is null
     and started_at > now() - public.run_session_ttl()
  returning started_at into v_started_at;

  if v_started_at is null then
    raise exception 'invalid_session: unknown, expired, or already-claimed run session'
      using errcode = '22023';
  end if;

  v_wall_sec := extract(epoch from (now() - v_started_at));

  -- (1) Wall-clock floor.
  -- The shortest gap the wave scheduler can produce is delayAfterClearSec = 3
  -- (packages/shared/src/data/waves.ts) and the fastest speed setting is 3x,
  -- so no wave can consume less than ~1 second of real time. Reaching wave N
  -- therefore requires at least N seconds on the server's clock. This is what
  -- kills "open console, submit wave 50 instantly".
  if v_wall_sec < p_wave_reached::numeric then
    raise exception 'implausible_run: wave % claimed after only %s of real time',
      p_wave_reached, round(v_wall_sec)
      using errcode = '22023';
  end if;

  -- (2) In-game duration ceiling.
  -- timeSurvivedSec accumulates *scaled* delta (Game.ts update() feeds
  -- state.tick(delta) into WaveSystem.elapsedMs), so at the 3x speed cap it
  -- advances three in-game seconds per wall second. The +15s grace absorbs
  -- rounding and submit latency. A client claiming more in-game time than 3x
  -- its session could have produced is lying.
  if p_duration_sec > v_wall_sec * 3 + 15 then
    raise exception 'implausible_run: % in-game seconds claimed for %s of real time',
      p_duration_sec, round(v_wall_sec)
      using errcode = '22023';
  end if;

  -- (3) End-of-run invariants.
  -- Game.ts handleEndGame has exactly two reasons: 'all_waves_cleared'
  -- (victory) and 'base_hp_depleted' (defeat). Those pin the HP/wave shape of
  -- any honest payload.
  if p_result = 'defeat' and p_remaining_hp <> 0 then
    raise exception 'implausible_run: defeat requires depleted base hp, got %',
      p_remaining_hp
      using errcode = '22023';
  end if;

  if p_result = 'victory' and p_remaining_hp < 1 then
    raise exception 'implausible_run: victory requires surviving base hp'
      using errcode = '22023';
  end if;

  -- Victory is only reachable by clearing the full 50-wave set
  -- (getWavesForMap -> generateWaves(50)). If a shorter map is ever added this
  -- is the line that has to learn about map length.
  if p_result = 'victory' and p_wave_reached <> 50 then
    raise exception 'implausible_run: victory requires all 50 waves cleared, got %',
      p_wave_reached
      using errcode = '22023';
  end if;

  -- runs_before_insert_trg still fires here, so the per-user cooldown and its
  -- advisory-lock race fix continue to apply on top of the checks above.
  insert into public.runs (
    user_id, wave_reached, remaining_hp, initial_hp,
    result, towers_placed, duration_sec, gold_earned
  ) values (
    v_uid, p_wave_reached, p_remaining_hp, p_initial_hp,
    p_result, p_towers_placed, p_duration_sec, p_gold_earned
  )
  returning id into v_run_id;

  return v_run_id;
end $$;

-- ---------------------------------------------------------------------------
-- Close the direct-insert path
-- ---------------------------------------------------------------------------

-- The whole point of the functions above is that this is no longer reachable.
drop policy if exists "runs_insert_self" on public.runs;
revoke insert on public.runs from anon, authenticated;

revoke all on function public.start_run() from public;
revoke all on function public.submit_run(uuid, int, int, int, text, int, int, int) from public;
grant execute on function public.start_run() to authenticated;
grant execute on function public.submit_run(uuid, int, int, int, text, int, int, int) to authenticated;
