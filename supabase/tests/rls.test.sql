-- supabase/tests/rls.test.sql
begin;
select plan(7);

-- Helpers: create two test users in auth.users.
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'alice@test'),
  ('22222222-2222-2222-2222-222222222222', 'bob@test');

-- Act as Alice and create a deck.
set local request.jwt.claim.sub to '11111111-1111-1111-1111-111111111111';
set local role authenticated;

insert into public.decks (id, owner_id, name)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Alice deck');

select lives_ok(
  $$insert into public.cards (deck_id, position, payload) values (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 0,
    '{"kind":"item","name":"x","body":"","typeLine":"","source":"custom","createdAt":"2026-04-26T00:00:00Z","updatedAt":"2026-04-26T00:00:00Z"}'::jsonb
  )$$,
  'owner can insert card into own deck'
);

-- Switch to Bob.
set local request.jwt.claim.sub to '22222222-2222-2222-2222-222222222222';

-- RLS silently no-ops UPDATE/DELETE for non-owners (returns 0 rows affected).
-- Assert that the deck name was NOT changed.
do $$ begin update public.decks set name = 'hacked' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'; end $$;
select is(
  (select name from public.decks where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  'Alice deck',
  'non-owner cannot update deck (RLS silently no-ops)'
);

-- Assert that the deck still exists after Bob's delete attempt.
do $$ begin delete from public.decks where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'; end $$;
select is(
  (select count(*)::int from public.decks where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  1,
  'non-owner cannot delete deck (RLS silently no-ops)'
);

-- Public read access works for any role.
set local role anon;

select is(
  (select count(*)::int from public.decks where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  1,
  'anon can SELECT decks'
);

select is(
  (select count(*)::int from public.cards where deck_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  1,
  'anon can SELECT cards'
);

select throws_ok(
  $$insert into public.decks (owner_id, name) values ('11111111-1111-1111-1111-111111111111', 'spam')$$,
  '42501',
  null,
  'anon cannot INSERT decks'
);

-- Cascade delete: when Alice deletes the deck, the card goes too.
set local role authenticated;
set local request.jwt.claim.sub to '11111111-1111-1111-1111-111111111111';

delete from public.decks where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

select is(
  (select count(*)::int from public.cards where deck_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  0,
  'cards cascade-delete with parent deck'
);

select * from finish();
rollback;
