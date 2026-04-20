-- P1 fix (cubic-dev-ai): BEFORE INSERT trigger had a TOCTOU race — two
-- concurrent inserts for the same user both read the same `prev_submitted`,
-- both passed the cooldown check, and both committed, bypassing the limit.
--
-- Fix: take a transaction-scoped advisory lock keyed by user_id so concurrent
-- inserts for the same user serialize through the rate-limit check. Other
-- users are not blocked. Lock auto-releases at commit/rollback.
create or replace function public.runs_before_insert()
returns trigger language plpgsql as $$
declare
  prev_submitted timestamptz;
  prev_duration  int;
begin
  new.submitted_at := now();

  -- hashtext(int4) → pg_advisory_xact_lock(int4) variant; per-user scope so
  -- different users don't contend. Using text cast of uuid keeps the hash
  -- stable across sessions.
  perform pg_advisory_xact_lock(hashtext(new.user_id::text));

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
