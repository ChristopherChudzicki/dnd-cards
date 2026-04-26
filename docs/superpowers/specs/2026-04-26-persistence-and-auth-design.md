# Persistence and Auth — Design Spec

**Date:** 2026-04-26
**Status:** approved (pending implementation plan)
**Supersedes (in part):** [`docs/superpowers/handoffs/2026-04-21-persistence-and-auth.md`](../handoffs/2026-04-21-persistence-and-auth.md) — handoff doc preserved as historical context.

## Summary

Move the dnd-cards app from localStorage-only persistence to Supabase-backed multi-deck storage with OAuth sign-in (Google + GitHub). Decks are publicly viewable by URL; only the owner can edit. The app stays on Vite + React + TS — no Next.js migration. Deploys statically to Vercel; Supabase is the entire backend.

## Goals

- Free-tier deployment (Vercel + Supabase).
- Persistent storage that survives device changes.
- Multi-deck per user.
- Public read-only sharing via URL.
- OAuth sign-in (no passwords).
- Server-side schema validation as defense-in-depth (`pg_jsonschema`).
- Card-by-card explicit save (matches the existing transactional editor pattern).

## Non-goals (v1)

- Realtime / multi-tab live sync.
- Card reordering UI (`position` column exists for forward-compat, no UI in v1).
- Logged-out local-only mode (logged-out users can view shared decks but cannot create).
- Migration of any existing localStorage data (per user direction; the app hasn't been deployed yet).
- A public "browse all decks" directory — share-by-URL only.
- E2E tests (Playwright/Cypress).

## Hard constraints (carried forward)

1. **Print fidelity.** No new hydration steps or layout shifts that compromise `em`-based card sizing or `@page` print CSS.
2. **Card discriminated union stays stable.** `Card = ItemCard | SpellCard | AbilityCard`; persistence layer is shape-agnostic via JSONB payload.
3. **JSON import/export must keep working** as the offline backup path (`parseDeckJson` / `serializeDeck`).
4. **Existing test conventions** — Fishery + faker, no unnecessary factory overrides.

## Architecture

```
Browser (Vite SPA, deployed on Vercel)            Supabase
─────────────────────────────────────             ───────────────────────
React + TanStack Router                           Postgres
TanStack Query                                      ├ decks
  ├ queries:    useDecks, useDeck,                  └ cards (JSONB payload)
  │             useDeckCards                       Auth (Google + GitHub OAuth)
  └ mutations:  createDeck, renameDeck,            RLS policies
                deleteDeck, saveCard,                ├ select: public
                deleteCard                           └ write: owner-only
React useState (in-flight editor draft)           pg_jsonschema CHECK on cards.payload
@supabase/supabase-js client                      Postgres trigger maintains updated_at
```

Key boundaries:

- `api/supabase.ts` is the **only** module that imports `@supabase/supabase-js`. All consumers go through hook layers.
- `decks/queries.ts` and `decks/mutations.ts` are the entire data-access surface. Views never touch Supabase directly.
- `decks/rowMappers.ts` owns DB row ↔ TS `Card` mapping. The DB row carries `{ id, deck_id, position, payload, … }`; the TS `Card` carries `{ id, kind, name, … }`. The mapper fuses `id` from the row into the `Card` and splits a `Card` back out for writes.
- `auth/AuthProvider.tsx` subscribes to Supabase's `onAuthStateChange` and exposes `useSession()`. `RequireOwner` is a tiny route guard built on top.

## Stack decisions

| Decision | Choice | Reason |
|---|---|---|
| Frontend framework | Vite + React + TS (unchanged) | Next.js migration explicitly deferred. |
| Hosting | Vercel static | Free tier; no server runtime needed. |
| Backend | Supabase | Free tier; one product covers DB + auth + RLS. |
| Auth providers | Google + GitHub OAuth | Covers nearly everyone the user would hand this to; one extra OAuth app vs Google-only. |
| Logged-out UX | Read-only access to shared deck URLs | Matches "OK if everything is public" comment; trivial to ship. |
| Discovery | Share-by-URL only | No public directory. Personal-app vibe; trivially extensible later. |
| Realtime | None | Single user; manual refresh is fine for v1. |
| Save granularity | Card-by-card explicit save | Matches existing transactional editor (`draft` → Save). |
| localStorage | Removed | Save commits to Supabase per-card; existing JSON export remains as backup. |
| Soft delete | No (hard delete with `confirm()`) | Single-user app; complexity not worth it. |
| Card storage | JSONB blob (`cards.payload`) | 1:1 with existing Zod union; no schema drift when adding new card kinds. |
| Server-side validation | `pg_jsonschema` CHECK constraint | Defense-in-depth; JSON Schema generated from Zod via codegen. |
| State management | TanStack Query for server state; local `useState` for editor draft | Existing editor already uses `useState` for the draft; with server state in TanStack Query, Zustand has no role left. Drop the dep. |

## Data model

### Tables

```sql
-- decks
create table decks (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  name        text not null check (length(name) between 1 and 200),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index decks_owner_id_idx on decks(owner_id);

-- cards
create table cards (
  id          uuid primary key default gen_random_uuid(),
  deck_id     uuid not null references decks(id) on delete cascade,
  position    integer not null default 0,
  payload     jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint cards_payload_valid
    check (json_matches_schema('<<generated JSON Schema>>', payload))
);
create index cards_deck_id_idx on cards(deck_id);
```

Notes:

- Card `id` switches from nanoid (current) to uuid. Internal-only — `apiRef.slug` is unaffected.
- `payload` is the full TS `Card` *minus* its own `id` (which is now redundant with the row's `id` column).
- `position` is forward-compat. v1 sorts by `created_at asc` and writes `position = 0`.
- `updated_at` is bumped by a Postgres trigger using `moddatetime` (or a tiny custom trigger) on each table.

### RLS policies

```sql
alter table decks enable row level security;
alter table cards enable row level security;

-- decks: anyone reads; only owner writes
create policy decks_select_all   on decks for select using (true);
create policy decks_insert_owner on decks for insert with check (owner_id = auth.uid());
create policy decks_update_owner on decks for update using (owner_id = auth.uid());
create policy decks_delete_owner on decks for delete using (owner_id = auth.uid());

-- cards: read if parent deck readable; write if user owns parent deck
create policy cards_select_all on cards for select using (true);
create policy cards_write_owner on cards for all
  using      (exists (select 1 from decks d where d.id = cards.deck_id and d.owner_id = auth.uid()))
  with check (exists (select 1 from decks d where d.id = cards.deck_id and d.owner_id = auth.uid()));
```

### JSON Schema synchronization

- Source of truth: Zod `cardSchema` in `src/decks/schema.ts` (renamed from `src/deck/schema.ts`).
- Codegen: `npm run gen:schema` runs Zod's native `toJSONSchema` and writes `supabase/schemas/card-payload.json`. (The plan originally specified the `zod-to-json-schema` library, but that lib is incompatible with Zod v4 and is no longer needed; Zod 4 ships its own JSON Schema export.)
- The schema file is committed. Migrations that change the `cards_payload_valid` constraint reference it.
- CI guard: `gen:schema` must produce a no-op diff. Drift fails the build, forcing the developer to ship a constraint-swap migration.

## Routes

| Route | Auth requirement | Purpose |
|---|---|---|
| `/` | none | Logged-in: deck list. Logged-out: splash + sign-in CTA. |
| `/login` | logged-out | "Sign in with Google" / "Sign in with GitHub" buttons. Honors `?next=`. |
| `/auth/callback` | n/a | Exchanges OAuth code for session, redirects. |
| `/deck/$deckId` | none (read), owner (write controls) | Deck view. Public read. Edit/delete/new-card buttons only render for the owner. |
| `/deck/$deckId/edit/$cardId` | owner | Card editor (today's `EditorView` rehoused). |
| `/print/deck/$deckId` | none | Print-optimized view. |

## Key flows

1. **First-time sign-in.** `/login` → OAuth provider → `/auth/callback` → land on `/` → empty deck list with "Create deck" CTA → click creates a deck → navigate to `/deck/$id`.
2. **Create card.** `/deck/$id` → "New card" → optimistic insert of stub card → navigate to `/deck/$id/edit/$cardId` → editor draft pre-populated → Save mutates `cards.payload` and invalidates `useDeckCards`.
3. **Browse from API.** Existing `BrowseApiModal` flow, but the "selected card" mutation now hits Supabase via `useSaveCard`.
4. **Cancel a brand-new card.** Same logic as today: if the stub matches `isPristineNewCard`, fire `useDeleteCard` on cancel; otherwise just navigate away.
5. **Share a deck.** Owner copies the deck URL. Recipient (logged-out or different user) sees the deck read-only with no edit controls; print works.
6. **Delete a deck.** Trash icon on `/` → `confirm()` → `useDeleteDeck` mutation → optimistic removal → cascade deletes cards.
7. **Sign out.** Header dropdown → `supabase.auth.signOut()` → land on `/`.
8. **Export JSON.** On `/deck/$id`, owner clicks "Export JSON" → existing `serializeDeck` runs against the loaded deck → file downloads. Unchanged from today.
9. **Import JSON.** Lives on `/` (deck list page) as "Import JSON" → file picker → `parseDeckJson` validates → on success, **create a new deck** named after the file (sans extension) and bulk-insert the cards via `useCreateDeck` + `useSaveCard` calls. New uuids are generated per card row (the imported `id` values are not reused — that would conflict on re-import). Import never overwrites an existing deck. (Today's `replaceDeck` flow had only one deck to clobber; under multi-deck, "create new" is the only sane mapping.)
   - JSON export format stays `{ version: 1, cards: Card[] }` — unchanged. A v2 format that includes the deck name is a future enhancement, out of scope.

**Pristine-stub edge case.** If a user creates a stub card and closes the tab before saving, the stub stays in the deck. We accept this for v1 (same risk profile as today; the user can delete it). No server-side garbage collection.

## File layout

```
src/
  api/
    supabase.ts              [NEW] supabase-js client singleton
    QueryProvider.tsx        [unchanged]
  auth/
    AuthProvider.tsx         [NEW] subscribes to onAuthStateChange; exposes useSession()
    LoginView.tsx            [NEW]
    AuthCallback.tsx         [NEW]
    RequireOwner.tsx         [NEW] route guard
  cards/
    types.ts                 [unchanged] TS Card discriminated union
    AutoFitCard.tsx          [unchanged]
    ItemEditor.tsx           [unchanged]
  decks/                     [NEW dir — promoted from deck/]
    queries.ts               [NEW] useDecks, useDeck, useDeckCards
    mutations.ts             [NEW] useCreateDeck, useRenameDeck, useDeleteDeck,
                                    useSaveCard, useDeleteCard
    rowMappers.ts            [NEW] cardToRow / rowToCard (strips/fuses payload.id)
    schema.ts                [moved from deck/] Zod cardSchema (source of truth)
    io.ts                    [unchanged] JSON import/export escape hatch
    store.ts                 [DELETED] Zustand drops out — server state is in TanStack Query, draft is local useState
  views/
    HomeView.tsx             [NEW] deck list / sign-in splash
    DeckView.tsx             [edit] reads from useDeck + useDeckCards
    EditorView.tsx           [edit] save via useSaveCard
    BrowseApiModal.tsx       [edit] add via useSaveCard
  app/
    router.tsx               [edit] new routes + auth guards
    Root.tsx                 [edit] AuthProvider + header session UI
supabase/
  config.toml                     [NEW] supabase CLI config (project_id, auth, db ports)
  migrations/
    20260426000000_init.sql       [NEW] decks + cards + RLS + triggers
    20260426000001_jsonschema.sql [NEW] pg_jsonschema + CHECK
  schemas/
    card-payload.json             [generated] Zod → JSON Schema
  tests/
    rls.test.sql                  [NEW] pgTAP RLS coverage
    jsonschema.test.sql           [NEW] pgTAP CHECK coverage
scripts/
  gen-card-schema.ts              [NEW] zod → JSON Schema codegen
package.json                       [edit] add deps + scripts
.env.local.example                 [NEW] VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
docs/superpowers/runbooks/
  supabase-setup.md               [NEW] one-time manual setup runbook
```

## Error handling

- **Network/Supabase down.** TanStack Query `error` state surfaces in the UI with retry. Mutation errors render as toasts. Editor `draft` is preserved client-side until save succeeds.
- **Stale session.** Supabase auto-refreshes JWTs. Failed refresh → `onAuthStateChange` fires `SIGNED_OUT` → AuthProvider redirects to `/login?next=…`. In-flight mutations get a 401 surfaced as "Please sign in again."
- **RLS rejection.** UI hides write controls for non-owners; if a write somehow reaches the server it 401/403s. Treated as a backstop.
- **Schema validation failure.** Client Zod catches it first with field-level errors; server `pg_jsonschema` is the backstop and surfaces a generic "Failed to save — please refresh and try again."
- **Zod ↔ JSON Schema drift.** CI runs `gen:schema` and fails on diff.
- **Concurrent saves.** Last-write-wins on `cards.payload`, but saves use an `updated_at` `.eq()` filter to detect stale writes; on mismatch surface "This card was updated elsewhere; reload to see latest."
- **Owner deletes deck mid-view.** Next query returns empty/404 → show "This deck no longer exists."
- **Image URL load failure.** Already handled via existing fallback-icon work; untouched.

## Security model

- **Anon key is public** (Vite env var) — by design. RLS is the security boundary.
- **`owner_id` is enforced server-side** via the `decks_insert_owner` policy `with check (owner_id = auth.uid())`. The client sends `owner_id`, but it must match the JWT.
- **Service-role key never ships to the browser.** Migrations run via `supabase db push` from a developer machine or CI.
- **CORS / redirect URLs** configured both in `supabase/config.toml` (local) and in the Supabase dashboard (cloud). Allowed origins: `http://localhost:5173` + the Vercel domain. OAuth provider redirect lists include both `http://localhost:54321/auth/v1/callback` and `https://<cloud-ref>.supabase.co/auth/v1/callback`.

## Configuration / deployment

**Two environments:**

| Env | Purpose | URL | Backend |
|---|---|---|---|
| Local | Day-to-day dev + tests | `http://localhost:5173` | `supabase start` (Docker) → `http://localhost:54321` |
| Production | Live app | Vercel domain | Cloud Supabase project |

There is no "staging" environment in v1 — the cloud project doubles as prod.

**Env vars (the SPA only ever reads these two, by design):**

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Local values come from `.env.local` (gitignored); `supabase start` prints them on boot. Vercel values are set in the project's env settings. `.env.local.example` is committed as a template.

**Local development (the primary path):**

- One-time install: Docker Desktop + the Supabase CLI.
- `supabase init` (already done by the migration scaffold) creates `supabase/config.toml`.
- `supabase start` boots the local stack (Postgres on `:54322`, API gateway on `:54321`, Studio UI on `:54323`).
- `supabase db reset` rebuilds the local DB from `supabase/migrations/*.sql` — fast, destructive, idempotent.
- `supabase db test` runs the pgTAP suite against the local DB.
- `supabase db push` pushes migrations to the cloud (linked) project for production.

**OAuth in local dev:** the same Google + GitHub OAuth apps are reused for local. In each provider's developer console, the app's authorized redirect URLs include both `https://<cloud-project-ref>.supabase.co/auth/v1/callback` *and* `http://localhost:54321/auth/v1/callback`. Provider-specific client IDs/secrets get pasted into `supabase/config.toml` under the `[auth.external.google]` / `[auth.external.github]` sections (these go into a gitignored override file, e.g. `supabase/.env`, not committed).

**Setup runbook** (`docs/superpowers/runbooks/supabase-setup.md`) covers, in order:
1. Install Docker + Supabase CLI.
2. `supabase start` and verify Studio loads.
3. Create Google OAuth app; add both redirect URLs; paste credentials into local config.
4. Same for GitHub.
5. Create the cloud Supabase project; `supabase link`; `supabase db push`.
6. In the Supabase dashboard, enable Google + GitHub providers and paste the same OAuth credentials.
7. Set Vercel env vars; first deploy.

## Testing strategy

### Frontend (Vitest + RTL + MSW + Fishery + faker)

- **Existing tests rewritten, not deleted.** `EditorView.test.tsx` and `DeckView.test.tsx` switch from Zustand-state assertions to MSW-mocked Supabase responses + mutation-state assertions. Same coverage targets.
- **Factories.** `makeDeckRow`, `makeCardRow` (DB shape) added; existing `makeCard` retained for component-prop tests.
- **Auth helper.** `signInTestUser()` installs a fake session into the Supabase client mock so `useSession()` returns logged-in without OAuth.
- **MSW handlers.** Baseline handler set in `src/test/handlers.ts` covering the common happy paths; per-test overrides for error/edge cases.
- **New tests:**
  - `decks/queries.test.ts` — happy paths + error paths.
  - `decks/mutations.test.ts` — invalidation, optimistic updates, conflict / 401 / 4xx error handling.
  - `decks/rowMappers.test.ts` — round-trip a `Card` through `cardToRow` / `rowToCard`.
  - `auth/LoginView.test.tsx` — both buttons trigger correct `signInWithOAuth` calls.
  - `auth/AuthCallback.test.tsx` — code exchange + redirect (with `?next=` honored).
  - `auth/RequireOwner.test.tsx` — three branches (owner, non-owner, logged-out).

### Database (pgTAP via `supabase db test`)

- `supabase/tests/rls.test.sql`:
  - logged-out user can SELECT but not INSERT/UPDATE/DELETE
  - user A cannot UPDATE user B's deck
  - cascade delete works
- `supabase/tests/jsonschema.test.sql`:
  - valid `ItemCard` accepted
  - missing `kind` rejected
  - mismatched discriminator rejected
  - `name` / `body` length boundaries enforced

### Deferred

- E2E (Playwright / Cypress). Manual smoke test against the cloud project is the v1 verification story.

## Open items (post-v1, not in scope)

- Card reordering UI.
- Soft delete / undo.
- Realtime multi-tab sync.
- Public deck directory.
- Per-deck privacy toggle.
- Server-side garbage collection of pristine stub cards.
- Migration to Next.js (the user may revisit as a separate exploration).

## Reference

- Original handoff: [`docs/superpowers/handoffs/2026-04-21-persistence-and-auth.md`](../handoffs/2026-04-21-persistence-and-auth.md)
- v1 design: [`docs/superpowers/specs/2026-04-19-dnd-cards-design.md`](2026-04-19-dnd-cards-design.md)
- API integration: [`docs/superpowers/specs/2026-04-19-dnd5eapi-integration-design.md`](2026-04-19-dnd5eapi-integration-design.md)
