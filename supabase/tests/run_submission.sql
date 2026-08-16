-- Run with: supabase db execute --file supabase/tests/run_submission.sql
-- Companion to runs_constraints.sql. That file covers the column CHECKs, which
-- are enforced regardless of who inserts. This file covers the submission
-- *gate* added in 20260817000001 — the parts that only exist because a browser
-- must not be able to author its own score — plus the read lockdown from
-- 20260817000002.
--
-- Each block prints PASS via RAISE NOTICE, or raises a should_have_failed_*
-- exception if the guard it is probing did not fire.
--
-- Roles matter here. The checks under test key off auth.uid(), so the blocks
-- below switch to `authenticated` and set request.jwt.claims the way PostgREST
-- would. Anything run as the table owner bypasses RLS and the grants, and would
-- silently pass without proving anything.

begin;

insert into auth.users (id, email, encrypted_password, email_confirmed_at, aud, role)
values ('00000000-0000-0000-0000-0000000000a1', 'gate-a@test.local', '', now(), 'authenticated', 'authenticated');
insert into public.profiles (id, nickname, avatar_key)
values ('00000000-0000-0000-0000-0000000000a1', 'gate_alice', 'tower/archer');

insert into auth.users (id, email, encrypted_password, email_confirmed_at, aud, role)
values ('00000000-0000-0000-0000-0000000000b2', 'gate-b@test.local', '', now(), 'authenticated', 'authenticated');
insert into public.profiles (id, nickname, avatar_key)
values ('00000000-0000-0000-0000-0000000000b2', 'gate_bob', 'tower/nova_cannon');

-- Sessions are seeded as owner with explicit started_at so the wall-clock
-- checks are deterministic instead of depending on how long the test takes.
insert into public.run_sessions (id, user_id, started_at) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', now() - interval '5 seconds'),
  ('aaaaaaaa-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a1', now() - interval '40 minutes'),
  ('bbbbbbbb-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b2', now() - interval '40 minutes');

-- Note on session 0002 being reused across several failing blocks below: an
-- uncaught raise inside submit_run() aborts its subtransaction, so the
-- consumed_at write rolls back with it and the session stays open. That is the
-- documented trade-off in 05-operations.md §8.1 — a rejected submit does not
-- burn the player's session.

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}';

-- ---------------------------------------------------------------------------
-- The direct-insert path is closed
-- ---------------------------------------------------------------------------

do $$ begin
  insert into public.runs (user_id, wave_reached, remaining_hp, initial_hp, result, towers_placed, duration_sec, gold_earned)
  values ('00000000-0000-0000-0000-0000000000a1', 50, 25, 25, 'victory', 5, 900, 10);
  raise exception 'should_have_failed_direct_insert';
exception when insufficient_privilege then
  raise notice 'PASS: direct INSERT into runs denied for authenticated';
end $$;

-- ---------------------------------------------------------------------------
-- Session claiming
-- ---------------------------------------------------------------------------

do $$ begin
  perform public.submit_run(
    'ffffffff-ffff-ffff-ffff-ffffffffffff', 10, 0, 25, 'defeat', 5, 120, 10);
  raise exception 'should_have_failed_unknown_session';
exception when invalid_parameter_value then
  raise notice 'PASS: unknown session rejected';
end $$;

-- A session belonging to someone else must not be claimable, even though the
-- caller is a perfectly valid authenticated user.
do $$ begin
  perform public.submit_run(
    'bbbbbbbb-0000-0000-0000-000000000001', 10, 0, 25, 'defeat', 5, 120, 10);
  raise exception 'should_have_failed_foreign_session';
exception when invalid_parameter_value then
  raise notice 'PASS: another user''s session rejected';
end $$;

-- ---------------------------------------------------------------------------
-- Plausibility
-- ---------------------------------------------------------------------------

-- The headline attack: a session opened 5 seconds ago cannot have produced a
-- wave-50 clear.
do $$ begin
  perform public.submit_run(
    'aaaaaaaa-0000-0000-0000-000000000001', 50, 25, 25, 'victory', 5, 900, 10);
  raise exception 'should_have_failed_wallclock_floor';
exception when invalid_parameter_value then
  raise notice 'PASS: instant wave-50 blocked by wall-clock floor';
end $$;

-- 40 minutes of wall clock clears the floor, but 3x speed caps in-game time at
-- ~7200s; claiming 14000s is still impossible.
do $$ begin
  perform public.submit_run(
    'aaaaaaaa-0000-0000-0000-000000000002', 50, 25, 25, 'victory', 5, 14000, 10);
  raise exception 'should_have_failed_duration_ceiling';
exception when invalid_parameter_value then
  raise notice 'PASS: in-game duration beyond 3x wall clock blocked';
end $$;

do $$ begin
  perform public.submit_run(
    'aaaaaaaa-0000-0000-0000-000000000002', 30, 7, 25, 'defeat', 5, 900, 10);
  raise exception 'should_have_failed_defeat_with_hp';
exception when invalid_parameter_value then
  raise notice 'PASS: defeat with surviving hp blocked';
end $$;

do $$ begin
  perform public.submit_run(
    'aaaaaaaa-0000-0000-0000-000000000002', 50, 0, 25, 'victory', 5, 900, 10);
  raise exception 'should_have_failed_victory_without_hp';
exception when invalid_parameter_value then
  raise notice 'PASS: victory with zero hp blocked';
end $$;

do $$ begin
  perform public.submit_run(
    'aaaaaaaa-0000-0000-0000-000000000002', 30, 12, 25, 'victory', 5, 900, 10);
  raise exception 'should_have_failed_partial_victory';
exception when invalid_parameter_value then
  raise notice 'PASS: victory short of wave 50 blocked';
end $$;

-- ---------------------------------------------------------------------------
-- Happy path + single use
-- ---------------------------------------------------------------------------

do $$
declare v_run_id uuid;
begin
  v_run_id := public.submit_run(
    'aaaaaaaa-0000-0000-0000-000000000002', 30, 0, 25, 'defeat', 12, 1500, 4200);
  if v_run_id is null then
    raise exception 'should_have_returned_run_id';
  end if;
  raise notice 'PASS: plausible run accepted';
end $$;

-- Replaying the very same session must fail: consumed_at is set, and the claim
-- is what makes one session mean exactly one row.
do $$ begin
  perform public.submit_run(
    'aaaaaaaa-0000-0000-0000-000000000002', 30, 0, 25, 'defeat', 12, 1500, 4200);
  raise exception 'should_have_failed_session_replay';
exception when invalid_parameter_value then
  raise notice 'PASS: session is single-use';
end $$;

-- ---------------------------------------------------------------------------
-- Read lockdown (20260817000002)
-- ---------------------------------------------------------------------------

do $$
declare v_visible int;
begin
  -- alice sees her own run, and must not see bob's rows or profile.
  select count(*) into v_visible from public.runs;
  if v_visible <> 1 then
    raise exception 'should_have_seen_only_own_runs: saw %', v_visible;
  end if;

  select count(*) into v_visible from public.profiles;
  if v_visible <> 1 then
    raise exception 'should_have_seen_only_own_profile: saw %', v_visible;
  end if;

  raise notice 'PASS: runs/profiles reads scoped to the caller';
end $$;

-- The leaderboard stays public, and must not leak identifiers.
do $$
declare v_has_user_id bool;
begin
  select exists (
    select 1 from information_schema.columns
     where table_schema = 'public'
       and table_name = 'v_leaderboard'
       and column_name = 'user_id'
  ) into v_has_user_id;
  if v_has_user_id then
    raise exception 'should_not_expose_user_id_on_leaderboard';
  end if;
  raise notice 'PASS: v_leaderboard does not publish user_id';
end $$;

do $$
declare v_rows int; v_mine int;
begin
  select count(*), count(*) filter (where is_me) into v_rows, v_mine
    from public.v_leaderboard;
  -- alice has the only submitted run, so she sees it and it is flagged hers.
  if v_rows < 1 or v_mine <> 1 then
    raise exception 'leaderboard_is_me_wrong: rows=% mine=%', v_rows, v_mine;
  end if;
  raise notice 'PASS: leaderboard readable with server-computed is_me';
end $$;

-- run_sessions itself must stay entirely invisible to clients.
do $$
declare v_count int;
begin
  begin
    select count(*) into v_count from public.run_sessions;
  exception when insufficient_privilege then
    raise notice 'PASS: run_sessions not selectable (privilege)';
    return;
  end;
  if v_count <> 0 then
    raise exception 'should_not_see_run_sessions: saw %', v_count;
  end if;
  raise notice 'PASS: run_sessions not selectable (no policy, zero rows)';
end $$;

reset role;

rollback;
