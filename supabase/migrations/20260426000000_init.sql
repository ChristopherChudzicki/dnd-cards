-- 20260426000000_init.sql
-- Decks + cards with RLS and updated_at triggers.

create extension if not exists moddatetime;

-- decks
create table public.decks (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  name        text not null check (length(name) between 1 and 200),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index decks_owner_id_idx on public.decks(owner_id);

create trigger decks_set_updated_at
  before update on public.decks
  for each row execute procedure moddatetime(updated_at);

-- cards
create table public.cards (
  id          uuid primary key default gen_random_uuid(),
  deck_id     uuid not null references public.decks(id) on delete cascade,
  position    integer not null default 0,
  payload     jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index cards_deck_id_idx on public.cards(deck_id);

create trigger cards_set_updated_at
  before update on public.cards
  for each row execute procedure moddatetime(updated_at);

-- RLS: decks
alter table public.decks enable row level security;

create policy decks_select_all   on public.decks for select using (true);
create policy decks_insert_owner on public.decks for insert with check (owner_id = auth.uid());
create policy decks_update_owner on public.decks for update
  using      (owner_id = auth.uid())
  with check (owner_id = auth.uid());
create policy decks_delete_owner on public.decks for delete using (owner_id = auth.uid());

-- RLS: cards
alter table public.cards enable row level security;

create policy cards_select_all on public.cards for select using (true);

create policy cards_insert_owner on public.cards for insert
  with check (exists (select 1 from public.decks d where d.id = cards.deck_id and d.owner_id = auth.uid()));

create policy cards_update_owner on public.cards for update
  using      (exists (select 1 from public.decks d where d.id = cards.deck_id and d.owner_id = auth.uid()))
  with check (exists (select 1 from public.decks d where d.id = cards.deck_id and d.owner_id = auth.uid()));

create policy cards_delete_owner on public.cards for delete
  using (exists (select 1 from public.decks d where d.id = cards.deck_id and d.owner_id = auth.uid()));
