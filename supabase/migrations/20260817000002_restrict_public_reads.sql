-- Security finding 2 (Low-Medium): every user's auth UUID and full run history
-- were readable with nothing but the public anon key.
--
-- `runs_read_all` and `profiles_read_all` were both `using (true)`, and
-- v_leaderboard selected r.user_id straight through. So an unauthenticated
-- client could enumerate public.profiles to get the auth.users UUID of every
-- registered player, then pull their complete play history from public.runs.
-- Neither is a credential, but a stable per-person identifier joined to a
-- behavioural log is more than a leaderboard needs to publish.
--
-- The fix separates the two audiences:
--   * base tables  -> owner-only reads (you can read your own rows)
--   * v_leaderboard -> the single public window, exposing display fields only
--
-- The view flips from security_invoker to definer for exactly that reason: it
-- must out-live the base-table lockdown to keep showing public nicknames, and
-- it can only do that by running with the owner's privileges. Every column it
-- exposes is listed explicitly below — user_id is gone, replaced by an is_me
-- flag computed server-side so the client can still highlight its own row
-- without ever learning anyone else's identifier.

-- ---------------------------------------------------------------------------
-- Base tables: own rows only
-- ---------------------------------------------------------------------------

drop policy if exists "runs_read_all" on public.runs;
create policy "runs_select_own"
  on public.runs for select
  using (auth.uid() = user_id);

-- Nickname uniqueness is still enforced, and still surfaces to the client, via
-- the unique constraint's 23505 on insert (authStore.createProfile) — that path
-- never needed to read other people's rows.
drop policy if exists "profiles_read_all" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- v_leaderboard: the only public window
-- ---------------------------------------------------------------------------

drop view if exists public.v_leaderboard;

create view public.v_leaderboard
with (security_invoker = false) as
select
  p.nickname,
  p.avatar_key,
  r.wave_reached,
  r.remaining_hp,
  r.result,
  r.submitted_at as achieved_at,
  -- auth.uid() still resolves inside a definer view (it reads the request's
  -- JWT claims, not the executing role), so the caller gets a correct is_me
  -- without user_id ever crossing the wire.
  (r.user_id = auth.uid()) as is_me,
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
