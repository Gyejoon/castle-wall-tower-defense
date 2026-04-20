-- Run with: supabase db execute --file supabase/tests/runs_constraints.sql
-- Each DO block should raise/catch as expected or print PASS via RAISE NOTICE.
begin;

insert into auth.users (id, email, encrypted_password, email_confirmed_at, aud, role)
values ('00000000-0000-0000-0000-000000000001', 'a@test.local', '', now(), 'authenticated', 'authenticated');

insert into public.profiles (id, nickname, avatar_key)
values ('00000000-0000-0000-0000-000000000001', 'alice', 'tower/archer');

do $$ begin
  insert into public.runs (user_id, wave_reached, remaining_hp, initial_hp, result, towers_placed, duration_sec, gold_earned)
  values ('00000000-0000-0000-0000-000000000001', 51, 10, 20, 'defeat', 5, 60, 10);
  raise exception 'should_have_failed_wave_51';
exception when check_violation then
  raise notice 'PASS: wave 51 blocked';
end $$;

do $$ begin
  insert into public.runs (user_id, wave_reached, remaining_hp, initial_hp, result, towers_placed, duration_sec, gold_earned)
  values ('00000000-0000-0000-0000-000000000001', 10, 25, 20, 'defeat', 5, 60, 10);
  raise exception 'should_have_failed_hp_over';
exception when check_violation then
  raise notice 'PASS: remaining_hp > initial_hp blocked';
end $$;

do $$ begin
  insert into public.runs (user_id, wave_reached, remaining_hp, initial_hp, result, towers_placed, duration_sec, gold_earned)
  values ('00000000-0000-0000-0000-000000000001', 10, -1, 20, 'defeat', 5, 60, 10);
  raise exception 'should_have_failed_hp_negative';
exception when check_violation then
  raise notice 'PASS: remaining_hp negative blocked';
end $$;

do $$ begin
  insert into public.profiles (id, nickname, avatar_key)
  values ('00000000-0000-0000-0000-000000000001', 'AliCE', 'tower/archer');
  raise exception 'should_have_failed_nickname_dup_citext';
exception when unique_violation then
  raise notice 'PASS: citext nickname dup blocked (case-insensitive)';
end $$;

rollback;
