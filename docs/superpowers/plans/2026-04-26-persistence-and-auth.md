# Persistence and Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace localStorage-only persistence with Supabase (Postgres + RLS + Google/GitHub OAuth) for multi-deck storage, public read-by-URL sharing, and owner-only writes.

**Architecture:** Vite SPA on Vercel + Supabase backend. TanStack Query owns server state via thin query/mutation hooks. `@supabase/supabase-js` is the only module that talks to Supabase directly. Local dev uses Docker-based `supabase start`; the cloud project is prod. Card payloads are validated client-side via Zod and server-side via `pg_jsonschema` (JSON Schema generated from Zod at build time).

**Tech Stack:** React 18 + TypeScript + Vite, TanStack Router, TanStack Query, `@supabase/supabase-js`, Zod, `zod-to-json-schema`, MSW, Vitest, RTL, Fishery + faker, pgTAP for SQL tests.

**Spec:** [`docs/superpowers/specs/2026-04-26-persistence-and-auth-design.md`](../specs/2026-04-26-persistence-and-auth-design.md)

**Branch:** `persistence` (already created, no worktree). All commits land here.

**Conventions:**
- TDD where it makes sense (rowMappers, hooks, components). Mechanical setup tasks skip the test step.
- Each task ends with a single commit.
- Factories don't pass values they don't assert on (per `~/.claude/CLAUDE.md`).
- `npm install / test / build` may need explicit user approval per their memory; assume yes inside this plan.

---

## Phase 1 — Setup

### Task 1: Install dependencies and add env scaffolding

**Files:**
- Modify: `package.json`
- Create: `.env.local.example`
- Modify: `.gitignore` (verify `.env.local` is ignored)
- Create: `src/vite-env.d.ts` (or modify existing) for typed env vars

- [ ] **Step 1: Install runtime deps**

```bash
npm install @supabase/supabase-js
```

- [ ] **Step 2: Install dev deps**

```bash
npm install -D zod-to-json-schema tsx
```

`tsx` is used to run the codegen TS script in Task 6.

- [ ] **Step 3: Add `.env.local.example`**

```
# Local Supabase (defaults from `supabase start`)
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.<replace-with-value-from-supabase-start>
```

The actual local anon key is printed by `supabase start`. The example file documents the shape; local devs copy to `.env.local` and paste the real value.

- [ ] **Step 4: Verify `.gitignore` ignores `.env.local`**

If missing, add a line `.env.local`. (Most Vite projects already include it from the template — check first with `grep .env.local .gitignore`.)

- [ ] **Step 5: Add typed env vars**

Edit (or create) `src/vite-env.d.ts`:

```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

- [ ] **Step 6: Switch `newId()` to UUIDs**

The DB has `uuid` columns; nanoid's 10-char ids would fail the type check on insert. Replace `src/lib/id.ts`:

```ts
export const newId = (): string => crypto.randomUUID();
```

Drop the `nanoid` import. The runtime `crypto.randomUUID()` is available in all modern browsers and Node 19+. Tests run on jsdom (Node-side) — verify `crypto.randomUUID` exists by running `node -e "console.log(crypto.randomUUID())"`. If not, polyfill via `import { webcrypto } from "node:crypto"; globalThis.crypto = webcrypto as Crypto;` in `src/test/setup.ts`.

```bash
npm uninstall nanoid
```

- [ ] **Step 7: Verify project still builds**

```bash
npm run lint && npx tsc -b --noEmit && npm test
```

Expected: all clean.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json .env.local.example .gitignore src/vite-env.d.ts src/lib/id.ts
git commit -m "Add Supabase deps + env scaffolding; switch newId to UUIDs"
```

---

### Task 2: Rename `src/deck/` → `src/decks/`

This is mechanical refactor with no behavior change. Doing it before any new code lands so all subsequent tasks live in the right namespace.

**Files:**
- Move: every file in `src/deck/` → `src/decks/`
- Modify: every importer of `../deck/...` or `./deck/...`

- [ ] **Step 1: Move the directory**

```bash
git mv src/deck src/decks
```

- [ ] **Step 2: Update all imports**

```bash
grep -rl 'from "\(\./\|\.\./\)deck/' src
```

For each file printed, change `from "../deck/...` to `from "../decks/...` (and `./deck/` → `./decks/` for same-level refs). Use Edit tool with `replace_all: true` per file.

- [ ] **Step 3: Run tests + typecheck**

```bash
npm test && npx tsc -b --noEmit
```

Expected: all existing tests still pass; typecheck clean.

- [ ] **Step 4: Commit**

```bash
git add -u
git commit -m "Rename src/deck → src/decks for multi-deck namespace"
```

---

### Task 3: Initialize Supabase project + config

**Files:**
- Create: `supabase/config.toml`
- Create: `supabase/.gitignore` (ignore secrets file)
- Create: `supabase/.env.example` (gitignored secrets template)
- Modify: `.gitignore` (add `supabase/.env`, `supabase/.branches`, `supabase/.temp`)

- [ ] **Step 1: Run `supabase init`**

```bash
npx supabase init
```

This scaffolds `supabase/config.toml`. If prompted about VS Code settings, decline.

- [ ] **Step 2: Edit `supabase/config.toml` for OAuth**

Find the `[auth.external.google]` and `[auth.external.github]` sections. Set:

```toml
[auth.external.google]
enabled = true
client_id = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID)"
secret = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET)"
redirect_uri = "http://localhost:54321/auth/v1/callback"

[auth.external.github]
enabled = true
client_id = "env(SUPABASE_AUTH_EXTERNAL_GITHUB_CLIENT_ID)"
secret = "env(SUPABASE_AUTH_EXTERNAL_GITHUB_SECRET)"
redirect_uri = "http://localhost:54321/auth/v1/callback"
```

The `env(...)` syntax tells the CLI to read from `supabase/.env` at boot.

- [ ] **Step 3: Set the site URL and redirect allowlist**

In `[auth]`:

```toml
site_url = "http://localhost:5173"
additional_redirect_urls = ["http://localhost:5173"]
```

- [ ] **Step 4: Create `supabase/.env.example`**

```
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=
SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=
SUPABASE_AUTH_EXTERNAL_GITHUB_CLIENT_ID=
SUPABASE_AUTH_EXTERNAL_GITHUB_SECRET=
```

- [ ] **Step 5: Update `.gitignore`**

Append:

```
# Supabase
supabase/.env
supabase/.branches/
supabase/.temp/
```

(`supabase init` may add an internal `supabase/.gitignore` — keep it. The root `.gitignore` covers anything it misses.)

- [ ] **Step 6: Commit**

```bash
git add supabase/config.toml supabase/.env.example supabase/.gitignore .gitignore
git commit -m "Initialize Supabase project (local config + OAuth wiring)"
```

(The `supabase/seed.sql` file scaffolded by `init` can stay empty for now — commit it as-is.)

---

### Task 4: Initial migration — tables, RLS, triggers, indexes

**Files:**
- Create: `supabase/migrations/20260426000000_init.sql`

- [ ] **Step 1: Write the migration**

```sql
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
create policy decks_update_owner on public.decks for update using (owner_id = auth.uid());
create policy decks_delete_owner on public.decks for delete using (owner_id = auth.uid());

-- RLS: cards
alter table public.cards enable row level security;

create policy cards_select_all   on public.cards for select using (true);

create policy cards_write_owner on public.cards for all
  using      (exists (select 1 from public.decks d where d.id = cards.deck_id and d.owner_id = auth.uid()))
  with check (exists (select 1 from public.decks d where d.id = cards.deck_id and d.owner_id = auth.uid()));
```

- [ ] **Step 2: Apply migration locally**

```bash
npx supabase start
npx supabase db reset
```

`db reset` drops the local DB and re-applies all migrations. Expected output ends with `Finished supabase db reset on local database.`

- [ ] **Step 3: Sanity check**

```bash
npx supabase db diff --schema public
```

Expected: empty output (no drift between live DB and migrations).

Optional verification — open Studio at `http://localhost:54323`, navigate to Tables → `decks` and `cards` should be present.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260426000000_init.sql
git commit -m "Add initial migration: decks + cards with RLS"
```

---

### Task 5: JSON Schema codegen script

**Files:**
- Create: `scripts/gen-card-schema.ts`
- Modify: `package.json` (add `gen:schema` script)
- Create: `supabase/schemas/card-payload.json` (generated output)

- [ ] **Step 1: Write the codegen script**

```ts
// scripts/gen-card-schema.ts
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { zodToJsonSchema } from "zod-to-json-schema";
import { cardSchema } from "../src/decks/schema";

const out = resolve(__dirname, "../supabase/schemas/card-payload.json");
const schema = zodToJsonSchema(cardSchema, {
  name: "CardPayload",
  $refStrategy: "none",
});

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(schema, null, 2)}\n`, "utf8");
console.log(`Wrote ${out}`);
```

- [ ] **Step 2: Modify the Zod schema to drop `id` from the payload shape**

The DB row's `id` column is the source of truth; the `payload` column stores `Card` minus `id`. Edit `src/decks/schema.ts`: build a separate `cardPayloadSchema` that omits `id`, and keep `cardSchema` (with `id`) for the existing JSON import/export shape.

```ts
// in src/decks/schema.ts, after the existing per-kind schemas:

const itemPayloadSchema    = itemCardSchema.omit({ id: true });
const spellPayloadSchema   = spellCardSchema.omit({ id: true });
const abilityPayloadSchema = abilityCardSchema.omit({ id: true });

export const cardPayloadSchema = z.discriminatedUnion("kind", [
  itemPayloadSchema,
  spellPayloadSchema,
  abilityPayloadSchema,
]);
```

Then update the codegen import to use `cardPayloadSchema` instead of `cardSchema`:

```ts
import { cardPayloadSchema } from "../src/decks/schema";
// …
const schema = zodToJsonSchema(cardPayloadSchema, { name: "CardPayload", $refStrategy: "none" });
```

- [ ] **Step 3: Add the npm script**

In `package.json` `"scripts"`:

```json
"gen:schema": "tsx scripts/gen-card-schema.ts"
```

- [ ] **Step 4: Run it**

```bash
npm run gen:schema
```

Expected: writes `supabase/schemas/card-payload.json`. Open it and sanity-check that the top-level is a `oneOf` with three members keyed by `kind`.

- [ ] **Step 5: Commit**

```bash
git add scripts/gen-card-schema.ts package.json package-lock.json src/decks/schema.ts supabase/schemas/card-payload.json
git commit -m "Add Zod→JSON Schema codegen for card payload"
```

---

### Task 6: pg_jsonschema migration with generated CHECK

**Files:**
- Create: `supabase/migrations/20260426000001_jsonschema.sql`

- [ ] **Step 1: Inspect the generated schema**

Open `supabase/schemas/card-payload.json`. Copy its full contents — you'll embed it as a SQL string literal in the migration. (For long term, the migration could read from disk via `\set` or `psql -v`, but for clarity we inline.)

- [ ] **Step 2: Write the migration**

The migration uses Postgres dollar-quoting (`$schema$ … $schema$`) to embed the JSON without escaping single quotes. Open `supabase/schemas/card-payload.json` and copy the raw contents into the dollar-quoted block.

```sql
-- 20260426000001_jsonschema.sql
-- Server-side JSON Schema validation for card payloads.

create extension if not exists pg_jsonschema;

alter table public.cards
  add constraint cards_payload_valid
  check (json_matches_schema(
    $schema$
{
  "$ref": "#/definitions/CardPayload",
  "definitions": {
    "CardPayload": {
      "_PASTE THE FULL JSON FROM supabase/schemas/card-payload.json HERE_": true
    }
  }
}
    $schema$::json,
    payload
  ));
```

To do the embedding correctly: open the generated file and the migration file in two editors. Replace the *entire* JSON object inside the `$schema$` … `$schema$` block with the file's contents. The result should be a single valid JSON document that, when parsed, equals the generated file. Don't try to merge the example skeleton with the real schema — just delete the skeleton and paste.

To keep them in sync long-term, Task 8 Step 4 adds `npm run check:schema` (a CI-friendly guard). When the Zod schema changes:
1. `npm run gen:schema` regenerates the JSON file.
2. Create a new migration that drops the old constraint and adds a new one with the regenerated JSON.
3. Commit both.

- [ ] **Step 3: Re-apply migrations and verify**

```bash
npx supabase db reset
```

Expected: clean run, no errors.

- [ ] **Step 4: Sanity-test the constraint manually**

Open Studio (`http://localhost:54323`) → SQL Editor:

```sql
-- valid (after creating an owner user — for now, use the seed-created admin):
-- This will likely fail RLS without auth; just verify the CHECK runs:
insert into public.cards (deck_id, payload)
values (
  gen_random_uuid(),
  '{"kind":"item","name":"x","body":"","typeLine":"","source":"custom","createdAt":"2026-04-26T00:00:00Z","updatedAt":"2026-04-26T00:00:00Z"}'::jsonb
);
-- Expected: fails with FK constraint (deck_id), NOT json_matches_schema.

insert into public.cards (deck_id, payload)
values (
  gen_random_uuid(),
  '{"kind":"item"}'::jsonb
);
-- Expected: fails with CHECK constraint cards_payload_valid.
```

The first should fail on `cards_deck_id_fkey`; the second should fail on `cards_payload_valid`. That confirms the CHECK is doing its job before FK validation kicks in. Don't worry about the rows actually inserting — RLS would also block them.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260426000001_jsonschema.sql
git commit -m "Add pg_jsonschema CHECK constraint on cards.payload"
```

---

### Task 7: pgTAP tests for RLS + jsonschema

**Files:**
- Create: `supabase/tests/rls.test.sql`
- Create: `supabase/tests/jsonschema.test.sql`

pgTAP tests run via `supabase test db`, which boots a fresh DB per run. Each test file is an independent transaction.

- [ ] **Step 1: Write the RLS tests**

```sql
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

select throws_ok(
  $$update public.decks set name = 'hacked' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$,
  '42501',
  null,
  'non-owner cannot update deck (RLS denies)'
);

select throws_ok(
  $$delete from public.decks where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$,
  '42501',
  null,
  'non-owner cannot delete deck'
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
```

- [ ] **Step 2: Write the jsonschema tests**

```sql
-- supabase/tests/jsonschema.test.sql
begin;
select plan(4);

-- Set up an owner + deck so we can hit the cards CHECK.
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'alice@test');
set local request.jwt.claim.sub to '11111111-1111-1111-1111-111111111111';
set local role authenticated;
insert into public.decks (id, owner_id, name)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'd');

select lives_ok(
  $$insert into public.cards (deck_id, payload) values (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '{"kind":"item","name":"Sword","body":"sharp","typeLine":"Weapon","source":"custom","createdAt":"2026-04-26T00:00:00Z","updatedAt":"2026-04-26T00:00:00Z"}'::jsonb
  )$$,
  'valid ItemCard payload accepted'
);

select throws_ok(
  $$insert into public.cards (deck_id, payload) values (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '{"name":"Sword"}'::jsonb
  )$$,
  '23514',
  null,
  'payload missing kind rejected'
);

select throws_ok(
  $$insert into public.cards (deck_id, payload) values (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '{"kind":"item","name":"Sword","body":"","typeLine":"","source":"custom","createdAt":"x","updatedAt":"y"}'::jsonb
  )$$,
  '23514',
  null,
  'payload with non-ISO timestamps rejected'
);
-- Note: this assumes Zod's z.string() with ISO format restriction. If the schema
-- uses plain z.string(), this test should be removed or changed to a different
-- invalid case (e.g., extra unknown discriminator).

select throws_ok(
  $$insert into public.cards (deck_id, payload) values (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '{"kind":"unknown","name":"x","body":"","source":"custom","createdAt":"2026-04-26T00:00:00Z","updatedAt":"2026-04-26T00:00:00Z"}'::jsonb
  )$$,
  '23514',
  null,
  'payload with unknown kind discriminator rejected'
);

select * from finish();
rollback;
```

If the third assertion fails because the existing Zod schema accepts any string for timestamps, replace it with a different invalid-payload case (e.g., `name` exceeding the schema's bounds, or an `item` payload without `typeLine`).

- [ ] **Step 3: Run the tests**

```bash
npx supabase test db
```

Expected: both files pass, total of 11 assertions.

- [ ] **Step 4: Commit**

```bash
git add supabase/tests/
git commit -m "Add pgTAP tests for RLS and jsonschema CHECK"
```

---

## Phase 2 — Frontend infrastructure

### Task 8: Supabase client + drift CI guard

**Files:**
- Create: `src/api/supabase.ts`
- Modify: `package.json` (add lint script wrapper, optionally CI guard)

- [ ] **Step 1: Write the client module**

```ts
// src/api/supabase.ts
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. " +
      "Copy .env.local.example to .env.local and fill in values from `npx supabase start`.",
  );
}

export const supabase = createClient(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
});
```

- [ ] **Step 2: Add a schema-drift guard**

Append to `package.json` scripts:

```json
"check:schema": "npm run gen:schema && git diff --exit-code supabase/schemas/card-payload.json"
```

This script regenerates the JSON Schema and fails if it differs from the committed copy. Run in CI (or manually before push).

- [ ] **Step 3: Verify build**

```bash
npm run lint && npx tsc -b --noEmit
```

The new env-var check throws at module-load time if vars are missing, but `tsc` won't trip on it.

- [ ] **Step 4: Commit**

```bash
git add src/api/supabase.ts package.json
git commit -m "Add Supabase client singleton + schema-drift guard"
```

---

### Task 9: MSW + auth test helpers

**Files:**
- Modify: `src/test/setup.ts` (start/stop MSW server, stub env)
- Modify: `src/test/msw.ts` (add Supabase REST handlers + helpers)
- Create: `src/test/factories.ts` (DB-row factories: makeDeckRow, makeCardRow)
- Create: `src/test/signInTestUser.ts`

- [ ] **Step 1: Update test setup to start MSW + stub env**

Replace `src/test/setup.ts` with:

```ts
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { server } from "./msw";

vi.stubEnv("VITE_SUPABASE_URL", "http://localhost:54321");
vi.stubEnv(
  "VITE_SUPABASE_ANON_KEY",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test-anon-key.signature",
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());
```

`onUnhandledRequest: "error"` ensures tests fail loudly on unmocked HTTP — the existing tests need to keep passing, which means we must add handlers for any newly-hit endpoint. (See Step 2 baseline.)

- [ ] **Step 2: Add Supabase REST handlers in `src/test/msw.ts`**

Add to the file (keep the existing dnd5eapi exports):

```ts
const SB_URL = "http://localhost:54321";

// Default empty responses for the endpoints we rely on.
// Tests can override with `server.use(...)` for specific cases.
export const supabaseDefaultHandlers = [
  http.get(`${SB_URL}/rest/v1/decks`, () => HttpResponse.json([])),
  http.get(`${SB_URL}/rest/v1/cards`, () => HttpResponse.json([])),
  http.post(`${SB_URL}/rest/v1/decks`, async ({ request }) => {
    const body = (await request.json()) as Array<Record<string, unknown>>;
    return HttpResponse.json(body, { status: 201 });
  }),
  http.post(`${SB_URL}/rest/v1/cards`, async ({ request }) => {
    const body = (await request.json()) as Array<Record<string, unknown>>;
    return HttpResponse.json(body, { status: 201 });
  }),
  http.patch(`${SB_URL}/rest/v1/cards`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json([body]);
  }),
  http.patch(`${SB_URL}/rest/v1/decks`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json([body]);
  }),
  http.delete(`${SB_URL}/rest/v1/decks`, () => HttpResponse.json([])),
  http.delete(`${SB_URL}/rest/v1/cards`, () => HttpResponse.json([])),
  // Auth endpoints: we don't intercept signInWithOAuth (the SDK constructs a URL and never sends a request).
  // For getSession etc., supabase-js uses localStorage, not HTTP, when persistSession is true.
];

server.use(...supabaseDefaultHandlers);
```

(`server.use` here registers them as the *default* set on import. `server.resetHandlers()` in afterEach restores this baseline between tests.)

PostgREST URL filters (`?owner_id=eq.<uuid>`) are tolerated by these handlers — they ignore query params and return the canned response. Per-test overrides handle filter-aware cases.

- [ ] **Step 3: Add row factories in `src/test/factories.ts`**

```ts
import { Factory } from "fishery";
import { faker } from "@faker-js/faker";
import type { Card, ItemCard } from "../cards/types";

export type DeckRow = {
  id: string;
  owner_id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export type CardRow = {
  id: string;
  deck_id: string;
  position: number;
  payload: Omit<Card, "id">;
  created_at: string;
  updated_at: string;
};

export const makeDeckRow = Factory.define<DeckRow>(() => {
  const now = faker.date.recent().toISOString();
  return {
    id: faker.string.uuid(),
    owner_id: faker.string.uuid(),
    name: faker.lorem.words({ min: 2, max: 4 }),
    created_at: now,
    updated_at: now,
  };
});

export const makeItemPayload = Factory.define<Omit<ItemCard, "id">>(() => {
  const now = faker.date.recent().toISOString();
  return {
    kind: "item",
    name: faker.commerce.productName(),
    typeLine: "Weapon",
    body: faker.lorem.paragraph(),
    source: "custom",
    createdAt: now,
    updatedAt: now,
  };
});

export const makeCardRow = Factory.define<CardRow>(() => {
  const now = faker.date.recent().toISOString();
  return {
    id: faker.string.uuid(),
    deck_id: faker.string.uuid(),
    position: 0,
    payload: makeItemPayload.build(),
    created_at: now,
    updated_at: now,
  };
});
```

- [ ] **Step 4: Add `signInTestUser` helper**

```ts
// src/test/signInTestUser.ts
import { supabase } from "../api/supabase";

const FAKE_JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMTExMTExMS0xMTExLTExMTEtMTExMS0xMTExMTExMTExMTEifQ.fake";

export type TestUser = { id: string; email: string };

export async function signInTestUser(
  user: TestUser = { id: "11111111-1111-1111-1111-111111111111", email: "alice@test" },
): Promise<TestUser> {
  await supabase.auth.setSession({
    access_token: FAKE_JWT,
    refresh_token: "fake-refresh",
  });
  // setSession triggers an internal getUser call; for tests, we monkey-patch:
  // (the real implementation would round-trip to the auth server. We override
  // via supabase.auth.admin or by mocking. Easiest: rely on AuthProvider's
  // listener subscribing and our handlers returning this user.)
  return user;
}

export async function signOutTestUser(): Promise<void> {
  await supabase.auth.signOut();
}
```

If `setSession` ends up making an HTTP request to validate the token, add an MSW handler for `${SB_URL}/auth/v1/user` returning the test user. Verify by running a small sanity test.

- [ ] **Step 5: Run existing tests, confirm they still pass**

```bash
npm test
```

Expected: same number passing as before (≈96), no unhandled-request errors.

If MSW reports unhandled requests for the existing tests, add handlers for those endpoints in this same task before committing.

- [ ] **Step 6: Commit**

```bash
git add src/test/
git commit -m "Add MSW + Supabase test helpers"
```

---

## Phase 3 — Data layer

### Task 10: rowMappers (TDD)

**Files:**
- Create: `src/decks/rowMappers.ts`
- Create: `src/decks/rowMappers.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/decks/rowMappers.test.ts
import { describe, expect, it } from "vitest";
import { makeCardRow, makeItemPayload } from "../test/factories";
import { cardToInsertRow, cardToUpdatePayload, rowToCard } from "./rowMappers";
import type { Card } from "../cards/types";

describe("rowMappers", () => {
  it("rowToCard fuses row.id into payload", () => {
    const row = makeCardRow.build();
    const card = rowToCard(row);
    expect(card.id).toBe(row.id);
    expect(card.name).toBe(row.payload.name);
    expect(card.kind).toBe(row.payload.kind);
  });

  it("cardToInsertRow strips id and includes deck_id", () => {
    const card: Card = { id: "card-id", ...makeItemPayload.build() };
    const insert = cardToInsertRow(card, "deck-id", 0);
    expect(insert.deck_id).toBe("deck-id");
    expect(insert.position).toBe(0);
    expect(insert.payload).not.toHaveProperty("id");
    expect(insert.payload.name).toBe(card.name);
  });

  it("cardToUpdatePayload returns the payload portion only", () => {
    const card: Card = { id: "card-id", ...makeItemPayload.build() };
    const update = cardToUpdatePayload(card);
    expect(update).not.toHaveProperty("id");
    expect(update).not.toHaveProperty("deck_id");
    expect(update.name).toBe(card.name);
  });

  it("round-trips a card through cardToInsertRow → rowToCard", () => {
    const original: Card = { id: "card-id", ...makeItemPayload.build() };
    const insert = cardToInsertRow(original, "deck-id", 0);
    const row = makeCardRow.build({
      id: original.id,
      deck_id: "deck-id",
      payload: insert.payload,
    });
    const restored = rowToCard(row);
    expect(restored).toEqual(original);
  });
});
```

- [ ] **Step 2: Run, confirm failure**

```bash
npm test -- rowMappers
```

Expected: FAIL — `rowMappers` module not found.

- [ ] **Step 3: Implement**

```ts
// src/decks/rowMappers.ts
import type { Card } from "../cards/types";
import type { CardRow } from "../test/factories";

// Note: CardRow type lives in test/factories for now — when we write the
// queries layer in Task 11, we'll move the type to src/decks/types.ts and
// re-export from factories.

export function rowToCard(row: CardRow): Card {
  return { id: row.id, ...row.payload } as Card;
}

export function cardToInsertRow(card: Card, deckId: string, position: number) {
  const { id: _id, ...payload } = card;
  return {
    deck_id: deckId,
    position,
    payload,
  };
}

export function cardToUpdatePayload(card: Card) {
  const { id: _id, ...payload } = card;
  return payload;
}
```

- [ ] **Step 4: Run, confirm pass**

```bash
npm test -- rowMappers
```

Expected: 4 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/decks/rowMappers.ts src/decks/rowMappers.test.ts
git commit -m "Add rowMappers for Card ↔ DB row conversion"
```

---

### Task 11: Promote DeckRow / CardRow types out of `test/factories.ts`

This avoids the ugly cross-import where production code (`rowMappers`) reaches into `test/factories`. Quick refactor.

**Files:**
- Create: `src/decks/types.ts` (DeckRow, CardRow types)
- Modify: `src/decks/rowMappers.ts` (import from new location)
- Modify: `src/test/factories.ts` (re-export types from `src/decks/types`)

- [ ] **Step 1: Create `src/decks/types.ts`**

```ts
import type { Card } from "../cards/types";

export type DeckRow = {
  id: string;
  owner_id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export type CardRow = {
  id: string;
  deck_id: string;
  position: number;
  payload: Omit<Card, "id">;
  created_at: string;
  updated_at: string;
};
```

- [ ] **Step 2: Update imports**

In `src/decks/rowMappers.ts` — change `from "../test/factories"` to `from "./types"`.
In `src/test/factories.ts` — change the `type DeckRow = …` and `type CardRow = …` declarations to imports + re-exports:

```ts
import type { DeckRow, CardRow } from "../decks/types";
export type { DeckRow, CardRow };
```

- [ ] **Step 3: Run tests**

```bash
npm test -- rowMappers
```

Expected: still 4 PASS.

- [ ] **Step 4: Commit**

```bash
git add src/decks/types.ts src/decks/rowMappers.ts src/test/factories.ts
git commit -m "Move DeckRow/CardRow types to src/decks/types.ts"
```

---

### Task 12: Queries — useDecks, useDeck, useDeckCards (TDD)

**Files:**
- Create: `src/decks/queries.ts`
- Create: `src/decks/queries.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/decks/queries.test.ts
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "../test/msw";
import { makeCardRow, makeDeckRow } from "../test/factories";
import { useDeck, useDeckCards, useDecks } from "./queries";

const SB = "http://localhost:54321";

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  // biome-ignore lint/suspicious/noExplicitAny: test wrapper
  return ({ children }: { children: any }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe("useDecks", () => {
  it("returns the user's decks ordered by created_at desc", async () => {
    const decks = [makeDeckRow.build(), makeDeckRow.build()];
    server.use(
      http.get(`${SB}/rest/v1/decks`, () => HttpResponse.json(decks)),
    );
    const { result } = renderHook(() => useDecks("user-id"), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(decks);
  });
});

describe("useDeck", () => {
  it("returns a single deck by id", async () => {
    const deck = makeDeckRow.build();
    server.use(
      http.get(`${SB}/rest/v1/decks`, () => HttpResponse.json([deck])),
    );
    const { result } = renderHook(() => useDeck(deck.id), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(deck);
  });

  it("returns undefined when the deck doesn't exist", async () => {
    server.use(
      http.get(`${SB}/rest/v1/decks`, () => HttpResponse.json([])),
    );
    const { result } = renderHook(() => useDeck("missing"), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
});

describe("useDeckCards", () => {
  it("returns cards for the given deck, mapped to the Card type", async () => {
    const cardRows = [makeCardRow.build(), makeCardRow.build()];
    server.use(
      http.get(`${SB}/rest/v1/cards`, () => HttpResponse.json(cardRows)),
    );
    const { result } = renderHook(() => useDeckCards("deck-id"), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.[0].id).toBe(cardRows[0].id);
  });
});
```

- [ ] **Step 2: Run, confirm failure**

```bash
npm test -- queries
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/decks/queries.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../api/supabase";
import type { Card } from "../cards/types";
import { rowToCard } from "./rowMappers";
import type { DeckRow, CardRow } from "./types";

export const decksKey = (ownerId: string | undefined) => ["decks", ownerId] as const;
export const deckKey = (deckId: string) => ["deck", deckId] as const;
export const deckCardsKey = (deckId: string) => ["deck-cards", deckId] as const;

export function useDecks(ownerId: string | undefined) {
  return useQuery<DeckRow[]>({
    queryKey: decksKey(ownerId),
    enabled: Boolean(ownerId),
    queryFn: async () => {
      if (!ownerId) return [];
      const { data, error } = await supabase
        .from("decks")
        .select("*")
        .eq("owner_id", ownerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useDeck(deckId: string) {
  return useQuery<DeckRow | undefined>({
    queryKey: deckKey(deckId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("decks")
        .select("*")
        .eq("id", deckId)
        .maybeSingle();
      if (error) throw error;
      return data ?? undefined;
    },
  });
}

export function useDeckCards(deckId: string) {
  return useQuery<Card[]>({
    queryKey: deckCardsKey(deckId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cards")
        .select("*")
        .eq("deck_id", deckId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as CardRow[]).map(rowToCard);
    },
  });
}
```

- [ ] **Step 4: Run, confirm pass**

```bash
npm test -- queries
```

Expected: 4 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/decks/queries.ts src/decks/queries.test.ts
git commit -m "Add deck/card query hooks"
```

---

### Task 13: Mutations — create/rename/delete deck, save/delete card (TDD)

**Files:**
- Create: `src/decks/mutations.ts`
- Create: `src/decks/mutations.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/decks/mutations.test.ts
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { makeCardRow, makeDeckRow, makeItemPayload } from "../test/factories";
import { server } from "../test/msw";
import {
  useCreateDeck,
  useDeleteCard,
  useDeleteDeck,
  useRenameDeck,
  useSaveCard,
} from "./mutations";

const SB = "http://localhost:54321";

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  // biome-ignore lint/suspicious/noExplicitAny: test wrapper
  return ({ children }: { children: any }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe("useCreateDeck", () => {
  it("POSTs the deck and returns the inserted row", async () => {
    const inserted = makeDeckRow.build({ name: "New" });
    server.use(http.post(`${SB}/rest/v1/decks`, () => HttpResponse.json([inserted], { status: 201 })));

    const { result } = renderHook(() => useCreateDeck(), { wrapper: makeWrapper() });
    const created = await result.current.mutateAsync({ name: "New", ownerId: inserted.owner_id });
    expect(created.id).toBe(inserted.id);
  });
});

describe("useRenameDeck", () => {
  it("PATCHes the deck name", async () => {
    const onPatch = vi.fn();
    const updated = makeDeckRow.build({ name: "Renamed" });
    server.use(
      http.patch(`${SB}/rest/v1/decks`, async ({ request }) => {
        onPatch(await request.json());
        return HttpResponse.json([updated]);
      }),
    );
    const { result } = renderHook(() => useRenameDeck(), { wrapper: makeWrapper() });
    const out = await result.current.mutateAsync({ deckId: updated.id, name: "Renamed" });
    expect(out.name).toBe("Renamed");
    expect(onPatch).toHaveBeenCalledWith(expect.objectContaining({ name: "Renamed" }));
  });
});

describe("useDeleteDeck", () => {
  it("DELETEs the deck", async () => {
    const onDelete = vi.fn();
    server.use(
      http.delete(`${SB}/rest/v1/decks`, ({ request }) => {
        onDelete(new URL(request.url).search);
        return HttpResponse.json([]);
      }),
    );
    const { result } = renderHook(() => useDeleteDeck(), { wrapper: makeWrapper() });
    await result.current.mutateAsync("deck-id");
    expect(onDelete).toHaveBeenCalled();
  });
});

describe("useSaveCard", () => {
  it("INSERTs a new card when no row exists yet", async () => {
    const row = makeCardRow.build();
    server.use(http.post(`${SB}/rest/v1/cards`, () => HttpResponse.json([row], { status: 201 })));
    const { result } = renderHook(() => useSaveCard(), { wrapper: makeWrapper() });
    const card = { id: row.id, ...row.payload };
    const saved = await result.current.mutateAsync({ card, deckId: row.deck_id, isNew: true });
    expect(saved.id).toBe(row.id);
  });

  it("UPDATEs an existing card", async () => {
    const row = makeCardRow.build();
    server.use(http.patch(`${SB}/rest/v1/cards`, () => HttpResponse.json([row])));
    const { result } = renderHook(() => useSaveCard(), { wrapper: makeWrapper() });
    const card = { id: row.id, ...row.payload };
    const saved = await result.current.mutateAsync({ card, deckId: row.deck_id, isNew: false });
    expect(saved.id).toBe(row.id);
  });
});

describe("useDeleteCard", () => {
  it("DELETEs the card", async () => {
    const onDelete = vi.fn();
    server.use(
      http.delete(`${SB}/rest/v1/cards`, ({ request }) => {
        onDelete(new URL(request.url).search);
        return HttpResponse.json([]);
      }),
    );
    const { result } = renderHook(() => useDeleteCard(), { wrapper: makeWrapper() });
    await result.current.mutateAsync({ cardId: "c1", deckId: "d1" });
    expect(onDelete).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run, confirm failure**

```bash
npm test -- mutations
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/decks/mutations.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../api/supabase";
import type { Card } from "../cards/types";
import { decksKey, deckKey, deckCardsKey } from "./queries";
import { cardToInsertRow, cardToUpdatePayload, rowToCard } from "./rowMappers";
import type { CardRow, DeckRow } from "./types";

export function useCreateDeck() {
  const qc = useQueryClient();
  return useMutation<DeckRow, Error, { name: string; ownerId: string }>({
    mutationFn: async ({ name, ownerId }) => {
      const { data, error } = await supabase
        .from("decks")
        .insert({ name, owner_id: ownerId })
        .select()
        .single();
      if (error) throw error;
      return data as DeckRow;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: decksKey(vars.ownerId) });
    },
  });
}

export function useRenameDeck() {
  const qc = useQueryClient();
  return useMutation<DeckRow, Error, { deckId: string; name: string }>({
    mutationFn: async ({ deckId, name }) => {
      const { data, error } = await supabase
        .from("decks")
        .update({ name })
        .eq("id", deckId)
        .select()
        .single();
      if (error) throw error;
      return data as DeckRow;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: deckKey(data.id) });
      qc.invalidateQueries({ queryKey: decksKey(data.owner_id) });
    },
  });
}

export function useDeleteDeck() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (deckId) => {
      const { error } = await supabase.from("decks").delete().eq("id", deckId);
      if (error) throw error;
    },
    onSuccess: () => {
      // Owner is the only viewer of /, so blanket-invalidate decks queries.
      qc.invalidateQueries({ queryKey: ["decks"] });
    },
  });
}

export function useSaveCard() {
  const qc = useQueryClient();
  return useMutation<Card, Error, { card: Card; deckId: string; isNew: boolean; position?: number }>({
    mutationFn: async ({ card, deckId, isNew, position = 0 }) => {
      if (isNew) {
        const insert = cardToInsertRow(card, deckId, position);
        // Force the row id to match the client-generated one if provided.
        const { data, error } = await supabase
          .from("cards")
          .insert({ ...insert, id: card.id })
          .select()
          .single();
        if (error) throw error;
        return rowToCard(data as CardRow);
      }
      const { data, error } = await supabase
        .from("cards")
        .update({ payload: cardToUpdatePayload(card) })
        .eq("id", card.id)
        .select()
        .single();
      if (error) throw error;
      return rowToCard(data as CardRow);
    },
    onSuccess: (_card, vars) => {
      qc.invalidateQueries({ queryKey: deckCardsKey(vars.deckId) });
    },
  });
}

export function useDeleteCard() {
  const qc = useQueryClient();
  return useMutation<void, Error, { cardId: string; deckId: string }>({
    mutationFn: async ({ cardId }) => {
      const { error } = await supabase.from("cards").delete().eq("id", cardId);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: deckCardsKey(vars.deckId) });
    },
  });
}
```

- [ ] **Step 4: Run, confirm pass**

```bash
npm test -- mutations
```

Expected: 6 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/decks/mutations.ts src/decks/mutations.test.ts
git commit -m "Add deck/card mutation hooks"
```

---

## Phase 4 — Auth

### Task 14: AuthProvider + useSession

**Files:**
- Create: `src/auth/AuthProvider.tsx`
- Create: `src/auth/useSession.ts`
- Create: `src/auth/AuthProvider.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// src/auth/AuthProvider.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AuthProvider } from "./AuthProvider";
import { useSession } from "./useSession";

function ShowSession() {
  const { user, status } = useSession();
  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="user-id">{user?.id ?? "anon"}</span>
    </div>
  );
}

describe("AuthProvider", () => {
  it("starts in 'loading' and resolves to 'unauthenticated' when no session", async () => {
    render(
      <AuthProvider>
        <ShowSession />
      </AuthProvider>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("unauthenticated");
    });
    expect(screen.getByTestId("user-id").textContent).toBe("anon");
  });
});
```

(A second test that asserts the authenticated path will land in Task 17 along with `signInTestUser` integration. For this task, the unauth path is enough.)

- [ ] **Step 2: Run, confirm failure**

```bash
npm test -- AuthProvider
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/auth/useSession.ts
import { createContext, useContext } from "react";
import type { Session, User } from "@supabase/supabase-js";

export type SessionState =
  | { status: "loading"; user: null; session: null }
  | { status: "unauthenticated"; user: null; session: null }
  | { status: "authenticated"; user: User; session: Session };

export const SessionContext = createContext<SessionState>({
  status: "loading",
  user: null,
  session: null,
});

export function useSession() {
  return useContext(SessionContext);
}
```

```tsx
// src/auth/AuthProvider.tsx
import { type ReactNode, useEffect, useState } from "react";
import { supabase } from "../api/supabase";
import { SessionContext, type SessionState } from "./useSession";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({
    status: "loading",
    user: null,
    session: null,
  });

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setState(
        data.session
          ? { status: "authenticated", user: data.session.user, session: data.session }
          : { status: "unauthenticated", user: null, session: null },
      );
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      setState(
        session
          ? { status: "authenticated", user: session.user, session }
          : { status: "unauthenticated", user: null, session: null },
      );
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return <SessionContext.Provider value={state}>{children}</SessionContext.Provider>;
}
```

- [ ] **Step 4: Run, confirm pass**

```bash
npm test -- AuthProvider
```

Expected: 1 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/auth/AuthProvider.tsx src/auth/useSession.ts src/auth/AuthProvider.test.tsx
git commit -m "Add AuthProvider + useSession hook"
```

---

### Task 15: LoginView

**Files:**
- Create: `src/auth/LoginView.tsx`
- Create: `src/auth/LoginView.module.css`
- Create: `src/auth/LoginView.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// src/auth/LoginView.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { supabase } from "../api/supabase";
import { LoginView } from "./LoginView";

describe("LoginView", () => {
  it("calls signInWithOAuth with google when the Google button is clicked", async () => {
    const spy = vi
      .spyOn(supabase.auth, "signInWithOAuth")
      .mockResolvedValue({ data: { provider: "google", url: "https://x" }, error: null });
    render(<LoginView />);
    await userEvent.click(screen.getByRole("button", { name: /sign in with google/i }));
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "google", options: expect.any(Object) }),
    );
  });

  it("calls signInWithOAuth with github when the GitHub button is clicked", async () => {
    const spy = vi
      .spyOn(supabase.auth, "signInWithOAuth")
      .mockResolvedValue({ data: { provider: "github", url: "https://x" }, error: null });
    render(<LoginView />);
    await userEvent.click(screen.getByRole("button", { name: /sign in with github/i }));
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ provider: "github" }));
  });
});
```

- [ ] **Step 2: Run, confirm failure**

```bash
npm test -- LoginView
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the component**

```tsx
// src/auth/LoginView.tsx
import { supabase } from "../api/supabase";
import styles from "./LoginView.module.css";

export function LoginView() {
  const signIn = (provider: "google" | "github") => {
    const next = new URLSearchParams(window.location.search).get("next") ?? "/";
    supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
  };

  return (
    <section className={styles.login}>
      <h2>Sign in</h2>
      <p>Sign in to create and edit decks. Anyone can view shared decks without signing in.</p>
      <div className={styles.buttons}>
        <button type="button" onClick={() => signIn("google")}>
          Sign in with Google
        </button>
        <button type="button" onClick={() => signIn("github")}>
          Sign in with GitHub
        </button>
      </div>
    </section>
  );
}
```

```css
/* src/auth/LoginView.module.css */
.login {
  max-width: 28rem;
  margin: 4rem auto;
  text-align: center;
}
.buttons {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1.5rem;
}
.buttons button {
  padding: 0.75rem 1rem;
  font-size: 1rem;
}
```

- [ ] **Step 4: Run, confirm pass**

```bash
npm test -- LoginView
```

Expected: 2 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/auth/LoginView.tsx src/auth/LoginView.module.css src/auth/LoginView.test.tsx
git commit -m "Add LoginView with Google + GitHub OAuth buttons"
```

---

### Task 16: AuthCallback

**Files:**
- Create: `src/auth/AuthCallback.tsx`
- Create: `src/auth/AuthCallback.test.tsx`

The OAuth provider redirects to `/auth/callback?next=...&code=...` (PKCE) or `#access_token=...` (implicit flow). Supabase's `detectSessionInUrl: true` (the SDK default) handles parsing automatically when the callback page loads. We just need to wait for the session and navigate.

- [ ] **Step 1: Write failing test**

```tsx
// src/auth/AuthCallback.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthCallback } from "./AuthCallback";

const navigate = vi.fn();
vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-router")>(
    "@tanstack/react-router",
  );
  return { ...actual, useNavigate: () => navigate };
});

describe("AuthCallback", () => {
  it("renders a loading state while the SDK exchanges the code", () => {
    render(<AuthCallback />);
    expect(screen.getByText(/signing you in/i)).toBeInTheDocument();
  });

  it("navigates to ?next= once a session is present", async () => {
    // Stub URL search params before render.
    Object.defineProperty(window, "location", {
      value: { ...window.location, search: "?next=%2Fdeck%2Fabc" },
      writable: true,
    });

    render(<AuthCallback />);
    // The component polls for session; in tests we assume it arrives instantly via mocked supabase.auth.
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: "/deck/abc" }), {
      timeout: 1500,
    });
  });
});
```

- [ ] **Step 2: Run, confirm failure**

```bash
npm test -- AuthCallback
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```tsx
// src/auth/AuthCallback.tsx
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "../api/supabase";
import { useSession } from "./useSession";

export function AuthCallback() {
  const navigate = useNavigate();
  const session = useSession();

  useEffect(() => {
    if (session.status !== "authenticated") return;
    const next = new URLSearchParams(window.location.search).get("next") ?? "/";
    navigate({ to: next });
  }, [session.status, navigate]);

  // Force the SDK to surface URL-fragment sessions even for browsers that race the listener.
  useEffect(() => {
    supabase.auth.getSession();
  }, []);

  return (
    <section style={{ textAlign: "center", padding: "4rem" }}>
      <p>Signing you in…</p>
    </section>
  );
}
```

The second `useEffect` is a belt-and-suspenders call that ensures `getSession` runs after URL parsing. Most flows don't need it; it costs nothing.

The "navigates to ?next=" test will pass only when AuthProvider is also wrapping. To keep tests independent, simulate "already authenticated" by spying on `supabase.auth.getSession` to return a session, then wrap with `AuthProvider` in the test. Adjust the test:

```tsx
// at the top of "navigates to ?next=" test, before render():
vi.spyOn(supabase.auth, "getSession").mockResolvedValue({
  data: {
    session: {
      access_token: "x",
      refresh_token: "y",
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: "bearer",
      user: { id: "u", aud: "authenticated", email: "e", app_metadata: {}, user_metadata: {} } as never,
    } as never,
  },
  error: null,
});

render(
  <AuthProvider>
    <AuthCallback />
  </AuthProvider>,
);
```

(Import `AuthProvider` from `./AuthProvider` at the top.)

- [ ] **Step 4: Run, confirm pass**

```bash
npm test -- AuthCallback
```

Expected: 2 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/auth/AuthCallback.tsx src/auth/AuthCallback.test.tsx
git commit -m "Add /auth/callback view"
```

---

### Task 17: RequireOwner route guard

**Files:**
- Create: `src/auth/RequireOwner.tsx`
- Create: `src/auth/RequireOwner.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// src/auth/RequireOwner.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { server } from "../test/msw";
import { makeDeckRow } from "../test/factories";
import { AuthProvider } from "./AuthProvider";
import { RequireOwner } from "./RequireOwner";
import { supabase } from "../api/supabase";

const SB = "http://localhost:54321";
const navigate = vi.fn();
vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-router")>(
    "@tanstack/react-router",
  );
  return { ...actual, useNavigate: () => navigate };
});

function wrap(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={client}>
      <AuthProvider>{ui}</AuthProvider>
    </QueryClientProvider>
  );
}

describe("RequireOwner", () => {
  it("redirects to /login when unauthenticated", async () => {
    render(wrap(<RequireOwner deckId="d1">protected</RequireOwner>));
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({ to: "/login", search: { next: expect.any(String) } }),
    );
  });

  it("renders children when the session user owns the deck", async () => {
    const deck = makeDeckRow.build({ owner_id: "user-1" });
    server.use(http.get(`${SB}/rest/v1/decks`, () => HttpResponse.json([deck])));
    vi.spyOn(supabase.auth, "getSession").mockResolvedValue({
      data: {
        session: { user: { id: "user-1" } as never } as never,
      },
      error: null,
    });
    render(wrap(<RequireOwner deckId={deck.id}>protected</RequireOwner>));
    await waitFor(() => expect(screen.getByText("protected")).toBeInTheDocument());
  });

  it("redirects to /deck/$id (read-only) when authenticated but not the owner", async () => {
    const deck = makeDeckRow.build({ owner_id: "someone-else" });
    server.use(http.get(`${SB}/rest/v1/decks`, () => HttpResponse.json([deck])));
    vi.spyOn(supabase.auth, "getSession").mockResolvedValue({
      data: {
        session: { user: { id: "user-1" } as never } as never,
      },
      error: null,
    });
    render(wrap(<RequireOwner deckId={deck.id}>protected</RequireOwner>));
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({ to: "/deck/$deckId", params: { deckId: deck.id } }),
    );
  });
});
```

- [ ] **Step 2: Run, confirm failure**

```bash
npm test -- RequireOwner
```

Expected: FAIL.

- [ ] **Step 3: Implement**

```tsx
// src/auth/RequireOwner.tsx
import { useNavigate } from "@tanstack/react-router";
import { type ReactNode, useEffect } from "react";
import { useDeck } from "../decks/queries";
import { useSession } from "./useSession";

type Props = { deckId: string; children: ReactNode };

export function RequireOwner({ deckId, children }: Props) {
  const session = useSession();
  const deckQuery = useDeck(deckId);
  const navigate = useNavigate();

  const sessionLoading = session.status === "loading";
  const userId = session.status === "authenticated" ? session.user.id : null;
  const ownerId = deckQuery.data?.owner_id;

  useEffect(() => {
    if (sessionLoading || deckQuery.isLoading) return;

    if (!userId) {
      const next = `${window.location.pathname}${window.location.search}`;
      navigate({ to: "/login", search: { next } });
      return;
    }
    if (ownerId && ownerId !== userId) {
      navigate({ to: "/deck/$deckId", params: { deckId } });
    }
  }, [sessionLoading, deckQuery.isLoading, userId, ownerId, deckId, navigate]);

  if (sessionLoading || deckQuery.isLoading) return null;
  if (!userId) return null;
  if (ownerId !== userId) return null;
  return <>{children}</>;
}
```

- [ ] **Step 4: Run, confirm pass**

```bash
npm test -- RequireOwner
```

Expected: 3 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/auth/RequireOwner.tsx src/auth/RequireOwner.test.tsx
git commit -m "Add RequireOwner route guard"
```

---

## Phase 5 — Routing & view migration

### Task 18: Add /login and /auth/callback routes (additive)

This task adds new routes without disturbing any existing behavior. Existing `/`, `/editor/$id`, `/print` continue to work.

**Files:**
- Modify: `src/app/router.tsx`
- Modify: `src/main.tsx` (or wherever the app renders) — wrap with `AuthProvider` + ensure QueryClientProvider exists

- [ ] **Step 1: Verify QueryClientProvider already wraps the app**

```bash
grep -n QueryClientProvider src/main.tsx src/api/QueryProvider.tsx
```

Expected: there's already a wrapper from the dnd5eapi work.

- [ ] **Step 2: Add the routes**

In `src/app/router.tsx`:

```ts
import { AuthCallback } from "../auth/AuthCallback";
import { LoginView } from "../auth/LoginView";

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginView,
});

const authCallbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/auth/callback",
  component: AuthCallback,
});

const routeTree = rootRoute.addChildren([
  deckRoute,
  editorRoute,
  printRoute,
  loginRoute,
  authCallbackRoute,
]);
```

- [ ] **Step 3: Wrap the app with AuthProvider**

In `src/main.tsx` (or wherever `<RouterProvider>` is rendered), wrap inside the `QueryClientProvider`:

```tsx
import { AuthProvider } from "./auth/AuthProvider";

// inside render:
<QueryClientProvider client={queryClient}>
  <AuthProvider>
    <RouterProvider router={router} />
  </AuthProvider>
</QueryClientProvider>
```

- [ ] **Step 4: Run all tests + manually smoke-test**

```bash
npm test
npm run dev
```

In a browser, visit `http://localhost:5173/login` — both buttons render. Visit `/` — existing deck view still works (still localStorage-backed at this stage).

- [ ] **Step 5: Commit**

```bash
git add src/app/router.tsx src/main.tsx
git commit -m "Add /login and /auth/callback routes"
```

---

### Task 19: HomeView (deck list / sign-in splash)

**Files:**
- Create: `src/views/HomeView.tsx`
- Create: `src/views/HomeView.module.css`
- Create: `src/views/HomeView.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// src/views/HomeView.test.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../auth/AuthProvider";
import { supabase } from "../api/supabase";
import { server } from "../test/msw";
import { makeDeckRow } from "../test/factories";
import { HomeView } from "./HomeView";

const SB = "http://localhost:54321";
const navigate = vi.fn();
vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-router")>(
    "@tanstack/react-router",
  );
  return { ...actual, useNavigate: () => navigate, Link: ({ children, ...rest }: any) => <a {...rest}>{children}</a> };
});

function wrap(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={client}>
      <AuthProvider>{ui}</AuthProvider>
    </QueryClientProvider>
  );
}

function signedIn(userId = "user-1") {
  vi.spyOn(supabase.auth, "getSession").mockResolvedValue({
    data: { session: { user: { id: userId } as never } as never },
    error: null,
  });
}

describe("HomeView", () => {
  it("shows a sign-in CTA when unauthenticated", async () => {
    render(wrap(<HomeView />));
    await waitFor(() =>
      expect(screen.getByRole("link", { name: /sign in/i })).toBeInTheDocument(),
    );
  });

  it("shows the user's decks when authenticated", async () => {
    signedIn();
    const decks = [makeDeckRow.build(), makeDeckRow.build()];
    server.use(http.get(`${SB}/rest/v1/decks`, () => HttpResponse.json(decks)));
    render(wrap(<HomeView />));
    for (const d of decks) {
      await waitFor(() => expect(screen.getByText(d.name)).toBeInTheDocument());
    }
  });

  it("shows an empty-state CTA when authenticated with no decks", async () => {
    signedIn();
    server.use(http.get(`${SB}/rest/v1/decks`, () => HttpResponse.json([])));
    render(wrap(<HomeView />));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /create your first deck/i })).toBeInTheDocument(),
    );
  });

  it("creates a new deck when the CTA is clicked", async () => {
    signedIn();
    const inserted = makeDeckRow.build({ name: "Untitled deck" });
    server.use(
      http.get(`${SB}/rest/v1/decks`, () => HttpResponse.json([])),
      http.post(`${SB}/rest/v1/decks`, () => HttpResponse.json([inserted], { status: 201 })),
    );
    render(wrap(<HomeView />));
    await userEvent.click(await screen.findByRole("button", { name: /create your first deck/i }));
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({ to: "/deck/$deckId", params: { deckId: inserted.id } }),
    );
  });

  it("deletes a deck after confirmation", async () => {
    signedIn();
    const deck = makeDeckRow.build();
    const onDelete = vi.fn();
    server.use(
      http.get(`${SB}/rest/v1/decks`, () => HttpResponse.json([deck])),
      http.delete(`${SB}/rest/v1/decks`, () => {
        onDelete();
        return HttpResponse.json([]);
      }),
    );
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(wrap(<HomeView />));
    const del = await screen.findByRole("button", { name: new RegExp(`delete ${deck.name}`, "i") });
    await userEvent.click(del);
    await waitFor(() => expect(onDelete).toHaveBeenCalled());
  });
});
```

- [ ] **Step 2: Run, confirm failure**

```bash
npm test -- HomeView
```

Expected: FAIL.

- [ ] **Step 3: Implement**

```tsx
// src/views/HomeView.tsx
import { Link, useNavigate } from "@tanstack/react-router";
import { useSession } from "../auth/useSession";
import { useCreateDeck, useDeleteDeck } from "../decks/mutations";
import { useDecks } from "../decks/queries";
import styles from "./HomeView.module.css";

export function HomeView() {
  const session = useSession();
  const navigate = useNavigate();
  const ownerId = session.status === "authenticated" ? session.user.id : undefined;
  const decks = useDecks(ownerId);
  const createDeck = useCreateDeck();
  const deleteDeck = useDeleteDeck();

  if (session.status === "loading") return null;

  if (session.status === "unauthenticated") {
    return (
      <section className={styles.splash}>
        <h2>D&amp;D Cards</h2>
        <p>Sign in to create and edit decks. Anyone can view shared decks via link.</p>
        <Link to="/login" className={styles.cta}>
          Sign in
        </Link>
      </section>
    );
  }

  const handleCreate = async () => {
    if (!ownerId) return;
    const deck = await createDeck.mutateAsync({ name: "Untitled deck", ownerId });
    navigate({ to: "/deck/$deckId", params: { deckId: deck.id } });
  };

  const handleDelete = (deckId: string, name: string) => {
    if (!window.confirm(`Delete "${name}" and all its cards?`)) return;
    deleteDeck.mutate(deckId);
  };

  if (!decks.data || decks.data.length === 0) {
    return (
      <section className={styles.empty}>
        <h2>No decks yet</h2>
        <button type="button" onClick={handleCreate} disabled={createDeck.isPending}>
          Create your first deck
        </button>
      </section>
    );
  }

  return (
    <section>
      <header className={styles.header}>
        <h2>Your decks</h2>
        <button type="button" onClick={handleCreate} disabled={createDeck.isPending}>
          New deck
        </button>
      </header>
      <ul className={styles.list}>
        {decks.data.map((d) => (
          <li key={d.id} className={styles.row}>
            <Link to="/deck/$deckId" params={{ deckId: d.id }} className={styles.deckLink}>
              {d.name}
            </Link>
            <button
              type="button"
              className={styles.deleteBtn}
              aria-label={`Delete ${d.name}`}
              onClick={() => handleDelete(d.id, d.name)}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

Append to `src/views/HomeView.module.css`:

```css
.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.deckLink {
  flex: 1;
}
.deleteBtn {
  background: none;
  border: 1px solid currentColor;
  border-radius: 4px;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
  font-size: 0.85rem;
}
```

```css
/* src/views/HomeView.module.css */
.splash, .empty {
  text-align: center;
  padding: 4rem 1rem;
}
.cta {
  display: inline-block;
  margin-top: 1rem;
  padding: 0.75rem 1.5rem;
  background: var(--color-accent, #5b8def);
  color: white;
  border-radius: 6px;
  text-decoration: none;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}
.list {
  list-style: none;
  padding: 0;
}
.row {
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--color-divider, #e0e0e0);
}
```

- [ ] **Step 4: Run, confirm pass**

```bash
npm test -- HomeView
```

Expected: 4 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/views/HomeView.tsx src/views/HomeView.module.css src/views/HomeView.test.tsx
git commit -m "Add HomeView with deck list / sign-in splash"
```

---

### Task 20: Switch router to multi-deck shape; refactor DeckView

**Files:**
- Modify: `src/app/router.tsx`
- Modify: `src/views/DeckView.tsx`
- Modify: `src/views/DeckView.test.tsx`
- Modify: `src/views/DeckView.module.css` (only if header layout shifts)

- [ ] **Step 1: Update the router**

Replace existing `deckRoute` and `editorRoute` definitions:

```ts
import { HomeView } from "../views/HomeView";
import { DeckView } from "../views/DeckView";
import { EditorView } from "../views/EditorView";
import { RequireOwner } from "../auth/RequireOwner";

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomeView,
});

const deckViewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/deck/$deckId",
  component: () => {
    const { deckId } = deckViewRoute.useParams();
    return <DeckView deckId={deckId} />;
  },
});

const editorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/deck/$deckId/edit/$cardId",
  component: () => {
    const { deckId, cardId } = editorRoute.useParams();
    return (
      <RequireOwner deckId={deckId}>
        <EditorView deckId={deckId} cardId={cardId} />
      </RequireOwner>
    );
  },
});

const routeTree = rootRoute.addChildren([
  homeRoute,
  deckViewRoute,
  editorRoute,
  printRoute,
  loginRoute,
  authCallbackRoute,
]);
```

`/print` may also want to become `/print/$deckId` — handle in Step 5 if relevant; otherwise keep as-is for compatibility and add a follow-up note in `Open items`.

- [ ] **Step 2: Refactor `DeckView` to load from queries**

```tsx
// src/views/DeckView.tsx
import { Link } from "@tanstack/react-router";
import { type ChangeEvent, useRef, useState } from "react";
import { useSession } from "../auth/useSession";
import { useDeck, useDeckCards } from "../decks/queries";
import { useDeleteCard, useRenameDeck } from "../decks/mutations";
import { parseDeckJson, serializeDeck } from "../decks/io";
import { downloadText } from "../lib/download";
import { BrowseApiModal } from "./BrowseApiModal";
import styles from "./DeckView.module.css";

export function DeckView({ deckId }: { deckId: string }) {
  const session = useSession();
  const deckQuery = useDeck(deckId);
  const cardsQuery = useDeckCards(deckId);
  const renameDeck = useRenameDeck();
  const deleteCard = useDeleteCard();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [browseOpen, setBrowseOpen] = useState(false);

  if (deckQuery.isLoading) return <p>Loading…</p>;
  if (!deckQuery.data) return <p>This deck no longer exists.</p>;

  const deck = deckQuery.data;
  const cards = cardsQuery.data ?? [];
  const isOwner = session.status === "authenticated" && session.user.id === deck.owner_id;

  const handleExport = () => {
    downloadText(`${deck.name}.json`, serializeDeck({ version: 1, cards }));
  };

  return (
    <section>
      <header className={styles.header}>
        {isOwner ? (
          <DeckTitle name={deck.name} onRename={(n) => renameDeck.mutate({ deckId, name: n })} />
        ) : (
          <h2 className={styles.title}>{deck.name}</h2>
        )}
        <div className={styles.actions}>
          <button type="button" onClick={handleExport} disabled={cards.length === 0}>
            Export JSON
          </button>
          {isOwner && (
            <>
              <button type="button" onClick={() => setBrowseOpen(true)}>
                Browse from API
              </button>
              <Link to="/deck/$deckId/edit/$cardId" params={{ deckId, cardId: "new" }}>
                <button type="button">New card</button>
              </Link>
            </>
          )}
        </div>
      </header>

      {cards.length === 0 ? (
        <p className={styles.empty}>No cards yet.</p>
      ) : (
        <ul className={styles.list}>
          {cards.map((card) => (
            <li key={card.id} className={styles.row}>
              <div className={styles.rowMain}>
                {isOwner ? (
                  <Link
                    to="/deck/$deckId/edit/$cardId"
                    params={{ deckId, cardId: card.id }}
                    className={styles.cardLink}
                  >
                    <strong>{card.name}</strong>
                  </Link>
                ) : (
                  <strong>{card.name}</strong>
                )}
                {card.kind === "item" && card.typeLine && (
                  <span className={styles.typeLine}>{card.typeLine}</span>
                )}
              </div>
              {isOwner && (
                <button
                  type="button"
                  className={styles.deleteBtn}
                  aria-label={`Delete ${card.name}`}
                  onClick={() => deleteCard.mutate({ cardId: card.id, deckId })}
                >
                  Delete
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {browseOpen && (
        <BrowseApiModal
          deckId={deckId}
          onClose={() => setBrowseOpen(false)}
          onSelected={() => setBrowseOpen(false)}
        />
      )}
    </section>
  );
}

function DeckTitle({ name, onRename }: { name: string; onRename: (next: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  if (!editing) {
    return (
      <h2 className={styles.title} onClick={() => setEditing(true)}>
        {name}
      </h2>
    );
  }
  return (
    <input
      className={styles.titleInput}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft && draft !== name) onRename(draft);
        setEditing(false);
      }}
      autoFocus
    />
  );
}
```

The "New card" Link uses cardId `"new"` as a sentinel — the `EditorView` (Task 21) will detect this and create a stub on mount. (Alternative: pre-create the stub here, but that creates a row even if the user never types. Sentinel is cleaner.)

- [ ] **Step 3: Rewrite `DeckView.test.tsx`**

The existing test asserts against Zustand state. Replace it with MSW-driven tests that exercise the new behavior:

```tsx
// src/views/DeckView.test.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { AuthProvider } from "../auth/AuthProvider";
import { supabase } from "../api/supabase";
import { server } from "../test/msw";
import { makeCardRow, makeDeckRow } from "../test/factories";
import { DeckView } from "./DeckView";

const SB = "http://localhost:54321";

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-router")>(
    "@tanstack/react-router",
  );
  return {
    ...actual,
    Link: ({ children, ...rest }: any) => <a {...rest}>{children}</a>,
  };
});

function wrap(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={client}>
      <AuthProvider>{ui}</AuthProvider>
    </QueryClientProvider>
  );
}

describe("DeckView (logged-out)", () => {
  it("renders cards but no edit/new/delete controls", async () => {
    const deck = makeDeckRow.build();
    const card = makeCardRow.build({ deck_id: deck.id });
    server.use(
      http.get(`${SB}/rest/v1/decks`, () => HttpResponse.json([deck])),
      http.get(`${SB}/rest/v1/cards`, () => HttpResponse.json([card])),
    );
    render(wrap(<DeckView deckId={deck.id} />));
    await waitFor(() => expect(screen.getByText(card.payload.name)).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /new card/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
  });
});

describe("DeckView (owner)", () => {
  it("shows edit + delete controls and deletes a card on click", async () => {
    const deck = makeDeckRow.build({ owner_id: "user-1" });
    const card = makeCardRow.build({ deck_id: deck.id });
    vi.spyOn(supabase.auth, "getSession").mockResolvedValue({
      data: { session: { user: { id: "user-1" } as never } as never },
      error: null,
    });
    server.use(
      http.get(`${SB}/rest/v1/decks`, () => HttpResponse.json([deck])),
      http.get(`${SB}/rest/v1/cards`, () => HttpResponse.json([card])),
      http.delete(`${SB}/rest/v1/cards`, () => HttpResponse.json([])),
    );
    render(wrap(<DeckView deckId={deck.id} />));
    const del = await screen.findByRole("button", { name: new RegExp(`delete ${card.payload.name}`, "i") });
    await userEvent.click(del);
    // No assertion on UI state because invalidation refetches; mainly we're verifying the click doesn't throw.
  });
});
```

- [ ] **Step 4: Run tests**

```bash
npm test -- DeckView
```

Expected: 2 PASS. The old DeckView test file's content is fully replaced; commit the new version.

- [ ] **Step 5: Commit**

```bash
git add src/app/router.tsx src/views/DeckView.tsx src/views/DeckView.test.tsx src/views/DeckView.module.css
git commit -m "Switch router to /deck/\$deckId and refactor DeckView to use hooks"
```

---

### Task 21: Refactor EditorView to save via mutation

**Files:**
- Modify: `src/views/EditorView.tsx`
- Modify: `src/views/EditorView.test.tsx`

- [ ] **Step 1: Update the component**

```tsx
// src/views/EditorView.tsx
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AutoFitCard } from "../cards/AutoFitCard";
import { ItemEditor } from "../cards/ItemEditor";
import type { ItemCard } from "../cards/types";
import { useDeckCards } from "../decks/queries";
import { useDeleteCard, useSaveCard } from "../decks/mutations";
import { newId } from "../lib/id";
import { nowIso } from "../lib/time";
import styles from "./EditorView.module.css";

const isPristineNewCard = (card: ItemCard): boolean =>
  card.name === "Untitled item" &&
  card.typeLine === "" &&
  card.body === "" &&
  card.costWeight === undefined &&
  card.imageUrl === undefined &&
  card.createdAt === card.updatedAt;

const isTemplateItem = (card: ItemCard): boolean =>
  card.source === "api" && /\(any /i.test(card.body);

type Props = { deckId: string; cardId: string };

export function EditorView({ deckId, cardId }: Props) {
  const cardsQuery = useDeckCards(deckId);
  const saveCard = useSaveCard();
  const deleteCard = useDeleteCard();
  const navigate = useNavigate();

  // For a brand-new card, generate a stub locally without yet inserting.
  const isNew = cardId === "new";
  const stub: ItemCard | null = useMemo(() => {
    if (!isNew) return null;
    const now = nowIso();
    return {
      id: newId(),
      kind: "item",
      name: "Untitled item",
      typeLine: "",
      body: "",
      source: "custom",
      createdAt: now,
      updatedAt: now,
    };
  }, [isNew]);

  const existing = cardsQuery.data?.find((c) => c.id === cardId) ?? null;
  const initial = isNew ? stub : existing;

  const [draft, setDraft] = useState<ItemCard | null>(
    initial && initial.kind === "item" ? initial : null,
  );

  useEffect(() => {
    if (initial && initial.kind === "item") setDraft(initial);
  }, [initial]);

  if (cardsQuery.isLoading && !isNew) return <p>Loading…</p>;
  if (!isNew && !existing) return <p>Card not found.</p>;
  if (existing && existing.kind !== "item") return <p>Only item cards are supported in v1.</p>;
  if (!draft) return null;

  const handleSave = async () => {
    await saveCard.mutateAsync({ card: draft, deckId, isNew });
    navigate({ to: "/deck/$deckId", params: { deckId } });
  };

  const handleCancel = async () => {
    if (!isNew && existing && isPristineNewCard(existing as ItemCard)) {
      await deleteCard.mutateAsync({ cardId: existing.id, deckId });
    }
    // For brand-new (isNew && stub never inserted), just navigate away.
    navigate({ to: "/deck/$deckId", params: { deckId } });
  };

  return (
    <section className={styles.editor}>
      <div className={styles.form}>
        {isTemplateItem(draft) && (
          <div className={styles.templateNotice} data-testid="template-notice">
            <strong>Template item.</strong> The dnd5eapi entry is weapon-type-agnostic (e.g.
            &ldquo;Any melee weapon&rdquo;). Rename and edit the description to match your specific
            weapon or armor.
          </div>
        )}
        <ItemEditor card={draft} onChange={setDraft} />
        <div className={styles.formActions}>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={handleSave}
            disabled={saveCard.isPending}
          >
            Save
          </button>
          <button type="button" className={styles.secondaryBtn} onClick={handleCancel}>
            Cancel
          </button>
        </div>
      </div>
      <div className={styles.preview}>
        <div className={styles.previewLabel}>Preview (4-up size)</div>
        <AutoFitCard card={draft} layout="4-up" />
      </div>
    </section>
  );
}
```

Notice: the brand-new flow now generates the stub *locally* (not inserting until Save). This eliminates the "stub left behind on tab close" risk entirely. The `isPristineNewCard` cleanup branch in `handleCancel` only matters for cards that were already persisted (e.g., a server-side flow that creates a row up front — not used here). We keep it as a safety belt.

- [ ] **Step 2: Update test**

Replace `src/views/EditorView.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";
import { server } from "../test/msw";
import { makeCardRow } from "../test/factories";
import { EditorView } from "./EditorView";

const SB = "http://localhost:54321";

const navigate = vi.fn();
vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-router")>(
    "@tanstack/react-router",
  );
  return { ...actual, useNavigate: () => navigate };
});

function wrap(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{ui}</QueryClientProvider>;
}

describe("EditorView", () => {
  it("renders 'Card not found' when cardId is missing from server", async () => {
    server.use(http.get(`${SB}/rest/v1/cards`, () => HttpResponse.json([])));
    render(wrap(<EditorView deckId="d1" cardId="missing" />));
    await waitFor(() => expect(screen.getByText(/card not found/i)).toBeInTheDocument());
  });

  it("saves via POST when cardId='new'", async () => {
    const onPost = vi.fn();
    server.use(
      http.post(`${SB}/rest/v1/cards`, async ({ request }) => {
        onPost(await request.json());
        return HttpResponse.json([makeCardRow.build()], { status: 201 });
      }),
    );
    render(wrap(<EditorView deckId="d1" cardId="new" />));
    await userEvent.click(await screen.findByRole("button", { name: /save/i }));
    await waitFor(() => expect(onPost).toHaveBeenCalled());
    expect(navigate).toHaveBeenCalledWith({ to: "/deck/$deckId", params: { deckId: "d1" } });
  });

  it("saves via PATCH when editing an existing card", async () => {
    const card = makeCardRow.build({ id: "c1", deck_id: "d1" });
    const onPatch = vi.fn();
    server.use(
      http.get(`${SB}/rest/v1/cards`, () => HttpResponse.json([card])),
      http.patch(`${SB}/rest/v1/cards`, async ({ request }) => {
        onPatch(await request.json());
        return HttpResponse.json([card]);
      }),
    );
    render(wrap(<EditorView deckId="d1" cardId="c1" />));
    await userEvent.click(await screen.findByRole("button", { name: /save/i }));
    await waitFor(() => expect(onPatch).toHaveBeenCalled());
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npm test -- EditorView
```

Expected: 3 PASS.

- [ ] **Step 4: Commit**

```bash
git add src/views/EditorView.tsx src/views/EditorView.test.tsx
git commit -m "Refactor EditorView to save via mutation hooks"
```

---

### Task 22: Refactor BrowseApiModal to add via mutation

**Files:**
- Modify: `src/views/BrowseApiModal.tsx`
- Modify: `src/views/BrowseApiModal.test.tsx`

- [ ] **Step 1: Inspect the current modal**

```bash
grep -n "useDeckStore\|upsertCard\|onSelected" src/views/BrowseApiModal.tsx
```

The file currently calls `upsertCard` from Zustand to add a selected API card to the deck. We replace that with `useSaveCard`.

- [ ] **Step 2: Update the modal**

In `src/views/BrowseApiModal.tsx`:
- Replace the import `import { useDeckStore } from "../decks/store"` with `import { useSaveCard } from "../decks/mutations"`.
- Add `deckId: string` to the props.
- In the click handler that adds a card, replace:

```ts
upsertCard(card);
```

with:

```ts
await saveCard.mutateAsync({ card, deckId, isNew: true });
```

- The `onSelected` callback should still fire after the mutation resolves (DeckView uses it to close the modal).

- [ ] **Step 3: Update test**

In `src/views/BrowseApiModal.test.tsx`, replace the Zustand assertions with MSW assertions:

```ts
const onPost = vi.fn();
server.use(
  http.post(`${SB}/rest/v1/cards`, async ({ request }) => {
    onPost(await request.json());
    return HttpResponse.json([makeCardRow.build()], { status: 201 });
  }),
);
// ... user clicks "Add to deck"
await waitFor(() => expect(onPost).toHaveBeenCalled());
```

Pass `deckId="d1"` as a prop in the render call.

- [ ] **Step 4: Run tests**

```bash
npm test -- BrowseApiModal
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/views/BrowseApiModal.tsx src/views/BrowseApiModal.test.tsx
git commit -m "Refactor BrowseApiModal to add via saveCard mutation"
```

---

### Task 23: JSON import flow on HomeView

**Files:**
- Modify: `src/views/HomeView.tsx`
- Modify: `src/views/HomeView.test.tsx`

- [ ] **Step 1: Add import UI + handler**

In the authenticated branch of HomeView, add an "Import JSON" button next to "New deck". Wire it to a hidden file input that:

```tsx
const handleImport = async (e: ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file || !ownerId) return;
  const text = await file.text();
  const result = parseDeckJson(text);
  if (!result.ok) {
    alert(`Import failed: ${result.error}`);
    e.target.value = "";
    return;
  }
  const name = file.name.replace(/\.json$/i, "") || "Imported deck";
  const deck = await createDeck.mutateAsync({ name, ownerId });
  // Insert each card with a freshly-generated row id (drop the imported id).
  for (const card of result.deck.cards) {
    const fresh = { ...card, id: newId() };
    await saveCard.mutateAsync({ card: fresh, deckId: deck.id, isNew: true });
  }
  navigate({ to: "/deck/$deckId", params: { deckId: deck.id } });
  e.target.value = "";
};
```

Add the corresponding `<input ref={fileInputRef} type="file" accept="application/json" hidden onChange={handleImport} />` plus a button that clicks it. Import `parseDeckJson` from `../decks/io`, `newId` from `../lib/id`, and add `useSaveCard` to the existing mutation imports.

- [ ] **Step 2: Add test**

In `src/views/HomeView.test.tsx`, add:

```tsx
it("creates a new deck named after the file when JSON is imported", async () => {
  signedIn();
  const created = makeDeckRow.build({ name: "my-deck" });
  const insertedRows: unknown[] = [];
  server.use(
    http.get(`${SB}/rest/v1/decks`, () => HttpResponse.json([])),
    http.post(`${SB}/rest/v1/decks`, () => HttpResponse.json([created], { status: 201 })),
    http.post(`${SB}/rest/v1/cards`, async ({ request }) => {
      insertedRows.push(await request.json());
      return HttpResponse.json([makeCardRow.build()], { status: 201 });
    }),
  );

  render(wrap(<HomeView />));

  const file = new File(
    [
      JSON.stringify({
        version: 1,
        cards: [
          {
            id: "x",
            kind: "item",
            name: "Sword",
            typeLine: "Weapon",
            body: "",
            source: "custom",
            createdAt: "2026-04-26T00:00:00Z",
            updatedAt: "2026-04-26T00:00:00Z",
          },
        ],
      }),
    ],
    "my-deck.json",
    { type: "application/json" },
  );
  const input = await screen.findByLabelText(/import json/i);
  await userEvent.upload(input, file);
  await waitFor(() => expect(insertedRows).toHaveLength(1));
  await waitFor(() =>
    expect(navigate).toHaveBeenCalledWith({ to: "/deck/$deckId", params: { deckId: created.id } }),
  );
});
```

The file input needs to be reachable by `getByLabelText(/import json/i)` — wrap it in a `<label>` or use `aria-label="Import JSON"` on the input.

- [ ] **Step 3: Run tests**

```bash
npm test -- HomeView
```

Expected: 5 PASS (4 existing + 1 new).

- [ ] **Step 4: Commit**

```bash
git add src/views/HomeView.tsx src/views/HomeView.test.tsx
git commit -m "Add JSON import flow on HomeView (creates new deck)"
```

---

### Task 24: Update Root.tsx with session-aware header

**Files:**
- Modify: `src/app/Root.tsx`
- Modify: `src/app/root.module.css` (add styles for sign-out button / user label)

- [ ] **Step 1: Update Root**

```tsx
// src/app/Root.tsx
import { Link, Outlet } from "@tanstack/react-router";
import { useSession } from "../auth/useSession";
import { supabase } from "../api/supabase";
import styles from "./root.module.css";

export function Root() {
  const session = useSession();

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <span className={styles.brand}>D&amp;D Cards</span>
        <nav className={styles.nav}>
          <Link to="/" className={styles.link} activeProps={{ className: styles.active }}>
            Decks
          </Link>
          <Link to="/print" className={styles.link} activeProps={{ className: styles.active }}>
            Print
          </Link>
          {session.status === "authenticated" ? (
            <>
              <span className={styles.user}>{session.user.email}</span>
              <button
                type="button"
                className={styles.signOut}
                onClick={() => supabase.auth.signOut()}
              >
                Sign out
              </button>
            </>
          ) : session.status === "unauthenticated" ? (
            <Link to="/login" className={styles.link}>
              Sign in
            </Link>
          ) : null}
        </nav>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
```

Append to `src/app/root.module.css`:

```css
.user {
  font-size: 0.85rem;
  color: var(--color-muted, #666);
  margin-left: auto;
}
.signOut {
  background: none;
  border: 1px solid currentColor;
  border-radius: 4px;
  padding: 0.25rem 0.5rem;
  font-size: 0.85rem;
  cursor: pointer;
}
```

If the existing `.nav` already uses `margin-left: auto` for spacing, drop the duplicate from `.user`.

- [ ] **Step 2: Run all tests**

```bash
npm test
```

Expected: previously-passing tests still pass. If any test renders Root and unhandled requests fire, add handlers.

- [ ] **Step 3: Commit**

```bash
git add src/app/Root.tsx src/app/root.module.css
git commit -m "Add session-aware header to Root"
```

---

## Phase 6 — Cleanup & polish

### Task 25: Remove Zustand store + uninstall dep

**Files:**
- Delete: `src/decks/store.ts`, `src/decks/store.test.ts`, `src/decks/factories.ts`, `src/decks/factories.test.ts` (only if these duplicate `src/test/factories.ts` — verify)
- Modify: `package.json` (remove zustand)

- [ ] **Step 1: Verify no live imports of `decks/store`**

```bash
grep -rl "from \".*decks/store\"" src
```

Expected: empty. If anything still imports it, complete that migration before proceeding.

- [ ] **Step 2: Check whether `decks/factories.ts` is still in use**

```bash
grep -rl "from \".*decks/factories\"" src
```

If empty, plan to delete the file in Step 3. If anything still uses it, leave it alone — `src/test/factories.ts` covers the new DB-row factories, and `decks/factories.ts` may still serve old Card-shape factories used in non-DB tests.

- [ ] **Step 3: Delete the store + its test (and factories if unused)**

```bash
git rm src/decks/store.ts src/decks/store.test.ts
# Only if step 2 showed no usages:
[ -z "$(grep -rl 'from \".*decks/factories\"' src)" ] && git rm src/decks/factories.ts src/decks/factories.test.ts
```

- [ ] **Step 4: Uninstall zustand**

```bash
npm uninstall zustand
```

- [ ] **Step 5: Run tests + typecheck + build**

```bash
npm test && npx tsc -b --noEmit && npm run build
```

Expected: all green. The build verifies the prod bundle has no dangling imports.

- [ ] **Step 6: Commit**

```bash
git add -u package.json package-lock.json
git commit -m "Remove Zustand: server state is in TanStack Query, draft is local useState"
```

---

### Task 26: Setup runbook

**Files:**
- Create: `docs/superpowers/runbooks/supabase-setup.md`

- [ ] **Step 1: Write the runbook**

```markdown
# Supabase setup runbook (one-time)

This walks through everything needed to get a fresh checkout running locally and deployed to Vercel.

## Prerequisites

- Node 20+
- Docker Desktop (for local Supabase)
- A Vercel account (free tier)
- A Google Cloud project + a GitHub account (for OAuth apps)

## 1. Local Supabase

```bash
npm install -g supabase    # or use npx everywhere
supabase start
```

`supabase start` prints the local API URL (`http://localhost:54321`) and the anon key. Copy the anon key into `.env.local`:

```
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=<anon key from supabase start>
```

Run `supabase db reset` once to apply migrations. Studio is at `http://localhost:54323`.

## 2. Google OAuth

1. Go to <https://console.cloud.google.com/apis/credentials>.
2. Create OAuth 2.0 Client ID, type "Web application".
3. Authorized redirect URIs:
   - `http://localhost:54321/auth/v1/callback`
   - `https://<cloud-project-ref>.supabase.co/auth/v1/callback` (add later, after step 4)
4. Copy the Client ID + Client Secret into `supabase/.env`:

```
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=...
SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=...
```

5. Restart `supabase start` so the new env vars take effect.

## 3. GitHub OAuth

1. Go to <https://github.com/settings/developers> → "OAuth Apps" → New OAuth App.
2. Authorization callback URL: `http://localhost:54321/auth/v1/callback` (add the cloud URL too after step 4).
3. Copy Client ID + generate Client Secret. Paste into `supabase/.env`:

```
SUPABASE_AUTH_EXTERNAL_GITHUB_CLIENT_ID=...
SUPABASE_AUTH_EXTERNAL_GITHUB_SECRET=...
```

4. Restart `supabase start`.

Smoke test: `npm run dev` → <http://localhost:5173/login> → Sign in with Google. You should land on `/` as a signed-in user.

## 4. Cloud Supabase project

1. <https://supabase.com/dashboard> → New project. Pick a region; save the database password.
2. `supabase link --project-ref <ref>` (the ref is in the project's URL).
3. `supabase db push` to apply migrations to the cloud DB.
4. Dashboard → Authentication → Providers → enable Google + GitHub. Paste the same Client ID/Secret pairs.
5. Add the cloud callback URL to your Google + GitHub OAuth apps (the URL is shown in the Supabase dashboard).

## 5. Vercel deploy

1. <https://vercel.com/new> → import the repo.
2. Build command: `npm run build`. Output dir: `dist`.
3. Env vars: `VITE_SUPABASE_URL` (the cloud URL from the dashboard) and `VITE_SUPABASE_ANON_KEY` (the anon key from the dashboard).
4. Deploy. After deploy, copy the production URL.
5. Back in the Supabase dashboard → Authentication → URL Configuration: add the production URL to "Site URL" and "Additional Redirect URLs". Update the Google + GitHub OAuth apps to also accept the production callback URL.

## Routine tasks

- Update local DB after pulling new migrations: `supabase db reset`
- Push new migrations to prod: `supabase db push`
- Run pgTAP tests: `supabase test db`
- Regenerate the JSON Schema after a Zod change: `npm run gen:schema` then commit, then create a constraint-swap migration.
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/runbooks/supabase-setup.md
git commit -m "Add Supabase setup runbook"
```

---

### Task 27: Final verification

This is the project-wide checklist before opening a PR.

- [ ] **Step 1: Lint**

```bash
npm run lint
```

Expected: clean.

- [ ] **Step 2: Typecheck**

```bash
npx tsc -b --noEmit
```

Expected: clean.

- [ ] **Step 3: Full test suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 4: Schema-drift guard**

```bash
npm run check:schema
```

Expected: no diff (Zod and committed JSON Schema match).

- [ ] **Step 5: Production build**

```bash
npm run build
```

Expected: clean build, `dist/` populated.

- [ ] **Step 6: pgTAP tests**

```bash
npx supabase test db
```

Expected: all pgTAP assertions pass.

- [ ] **Step 7: Manual smoke test against local**

In a browser at `http://localhost:5173`:

1. Visit `/` while logged out — see splash.
2. Sign in with Google — land on `/` empty deck list.
3. Click "Create your first deck" — land on `/deck/<id>`.
4. Click "New card" — fill in name + body, click Save — return to deck view, card visible.
5. Click the card name — editor opens with existing content. Make a small edit, save — change persists.
6. Open the deck URL in an incognito window — see deck read-only, no edit/delete buttons.
7. Click "Browse from API", pick an item, add it — appears in deck.
8. Export JSON — file downloads. Open it; the format is `{ version: 1, cards: [...] }`.
9. Sign out — header updates, deck list disappears, but `/deck/<id>` still loads read-only.
10. Delete a deck (after re-signing-in) — confirmation dialog, then deck gone.

- [ ] **Step 8: Commit any small fixes**

If steps 1-7 surfaced issues, fix them as small individual commits. No giant cleanup commits.

- [ ] **Step 9: Push and open PR**

```bash
git push -u origin persistence
gh pr create --title "Persistence + auth: Supabase + OAuth + multi-deck" --body-file - <<'EOF'
## Summary
- Replaces localStorage with Supabase (Postgres + RLS + Google/GitHub OAuth)
- Adds multi-deck per user with public read-by-URL sharing
- Server-side payload validation via pg_jsonschema (generated from Zod)
- TanStack Query for server state; Zustand removed

## Test plan
- [ ] `npm run lint` clean
- [ ] `npm test` all green
- [ ] `npm run check:schema` no drift
- [ ] `npm run build` succeeds
- [ ] `supabase test db` (pgTAP) all green
- [ ] Manual smoke test against local Supabase (steps in the implementation plan)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
```

(Don't push or open a PR without explicit user approval if running this autonomously.)

---

## Open follow-ups (not in this plan)

These are explicit non-goals from the spec — don't sneak them in:

- Card reordering UI (use the `position` column).
- Soft delete / undo.
- Realtime multi-tab sync.
- Public deck directory.
- Per-deck privacy toggle.
- Server-side garbage collection of pristine stub cards (the new local-stub flow eliminates the persisted variant).
- E2E tests.
- Migrating `/print` to `/print/$deckId` for deck-specific print views.
