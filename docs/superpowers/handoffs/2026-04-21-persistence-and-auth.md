# Handoff: Persistence + Auth

**Date:** 2026-04-21
**For:** the next agent picking up this thread
**Goal:** start brainstorming → spec → plan → implementation for moving the app from localStorage-only to Supabase-backed persistence with light-touch auth.

---

## Read this first

The user wants to add data persistence and auth to a working v1 app. The stack stays **Vite + React + TS** for this work — a Next.js migration was discussed and explicitly deferred ("done separately if at all"). Treat that as a decided constraint; don't re-open it without cause.

The user has used Next.js heavily at work (light server-component usage) but has NOT used Supabase or Vercel hosting before. Calibrate Supabase/Vercel explanations accordingly; you can use Next-y vocabulary freely otherwise.

## What the user said (verbatim)

> My goal is free deployment, persistence, auth. Backend models will be very simple, so supabase makes sense. I want auth, but it's OK if everything is public. Auth is more for associating data that users care about with the data. (I realize supabase allows for more permissioning than that.)
>
> I've never used supabase or vercel hosting before.

On the Vite-vs-Next.js question, the user wrote (after seeing the trade-off): *"Thanks for the pushback. I think i agree with your assessment and the nextjs migration should be done separately if at all. I have used NextJS a lot for work, but we use server components lightly. I see no real downsides for a personal app exploring that more thoroughly, but I agree with your assessment that this is unnecessary for now."*

## Where the project is now

Working v1 + a phase-2 dnd5eapi browse modal. Stable. ~96 tests passing. Lint clean. Production build succeeds.

**Stack as built:** Vite + React + TypeScript (strict), TanStack Router, TanStack Query (for the API browse), Zustand (deck state, persisted to `localStorage` under key `dnd-cards:deck:v1`), Zod (schema validation), Fishery + `@faker-js/faker` (test data), Vitest + React Testing Library + MSW, Biome (lint+format), `lucide-react` (fallback icons).

**Where state lives today:**
- One in-memory `Deck` in Zustand: `{ version: 1, cards: Card[] }`.
- Auto-persists to localStorage on every change.
- JSON import/export from the deck view as a manual escape hatch.

**Card shape (stable, do not break):**
```ts
type ItemCard = BaseCard & {
  kind: "item";
  typeLine: string;
  costWeight?: string;
};
type BaseCard = {
  id: string;
  name: string;
  body: string;
  imageUrl?: string;
  source: "custom" | "api";
  apiRef?: { system: "dnd5eapi"; slug: string; ruleset: "2014" | "2024" };
  createdAt: string;
  updatedAt: string;
};
type Card = ItemCard | SpellCard | AbilityCard; // discriminated union; only ItemCard implemented
type Deck = { version: 1; cards: Card[] };
```
Schema source of truth: [`src/cards/types.ts`](../../src/cards/types.ts) + [`src/deck/schema.ts`](../../src/deck/schema.ts).

## Hard constraints (don't disrupt)

1. **Print fidelity.** The card renderer uses `em`-relative-to-card-base font sizes, an `AutoFitCard` ResizeObserver loop, and `@page` CSS. Don't introduce hydration steps or layout shifts that compromise print sizing.
2. **Card schema is stable.** New persistence shouldn't add fields to `Card`. If you need server-side metadata (owner, deck membership), put it on the `Deck` row or in a sibling table — not on `Card`.
3. **JSON import/export must keep working.** Manual export/import is the offline backup story.
4. **Existing local decks** must not be silently lost. Migration story is an open question (see below).
5. **Tests use Fishery + faker.** Tests only override fields they actually assert on. Carry that convention forward.
6. **Discriminated union for `Card`.** The schema reserves `kind: "spell" | "ability"` for future card types. Persistence layer should be agnostic.

## Stack: stay Vite (decided)

Vercel hosts Vite static builds for free; `@supabase/supabase-js` and Supabase Auth's React helpers work fine in any browser SPA. The migration to Next.js is deferred indefinitely — the user may revisit it as a separate exploration later, but persistence/auth should ship on the existing stack.

## Open question 1 — Auth UX

User wrote: *"I want auth, but it's OK if everything is public. Auth is more for associating data that users care about with the data."*

That points to a permissive read-everywhere, write-owner model. Things to brainstorm:

- **Provider:** Email magic link (Supabase's default, lowest friction)? GitHub OAuth (the user's a GitHub user — fast for them, friendlier for sharing with friends)? Google? All three?
- **Anonymous use:** Can someone create a deck without signing in (and have it stay in localStorage), then sign in to "claim" it? Or do you require sign-in before any persistence? The "OK if everything is public" comment suggests the former is fine.
- **What does sharing look like?** A deck URL with a UUID? `/deck/$id` route? Logged-out viewing should work.
- **Session UX:** Persistent sign-in across visits (Supabase's default), or sign-in-per-session?

## Open question 2 — Data model

Likely shape (refine with the user):

```sql
-- decks
id          uuid primary key
owner_id    uuid references auth.users(id) -- nullable if you support anonymous decks
name        text not null
created_at  timestamptz not null default now()
updated_at  timestamptz not null default now()

-- cards
id            uuid primary key  -- could reuse the existing nanoid string ids; align this
deck_id       uuid references decks(id) on delete cascade
position      int not null      -- for stable ordering
payload       jsonb not null    -- the existing Card type, schema-validated client-side
created_at    timestamptz not null default now()
updated_at    timestamptz not null default now()
```

RLS policies (sketch):
- `decks`: SELECT for everyone; INSERT/UPDATE/DELETE only when `owner_id = auth.uid()`.
- `cards`: SELECT joined to decks (everyone can read if the deck is readable); INSERT/UPDATE/DELETE only if the user owns the parent deck.

Things to brainstorm:
- **One deck per user, or many?** Many is more flexible but adds a "pick a deck" UI step. The current app has implicitly one deck.
- **Card storage shape:** JSONB blob (simplest; matches existing Card type) vs structured columns (queryable but creates schema drift with the TS types).
- **Real-time:** Supabase has Realtime channels. Do we want live multi-tab sync? Probably yes for a single user's tabs.
- **Soft delete vs hard delete:** Probably hard delete; decks are user-owned not collaborative.

## Open question 3 — Migration of existing local data

There is exactly one user (the project owner) with localStorage data today, plus future first-time visitors who try things out before signing in.

Brainstorm:
- On sign-in, if there's a localStorage deck and the user has zero remote decks → import it as their first deck.
- If the user already has remote decks → leave the local data alone and offer a manual "import this local deck" button.
- After successful migration, optionally clear the local copy (or keep it as a backup).
- Continue to support manual JSON import/export for the case where the user wants to take their data elsewhere.

## Open question 4 — TanStack Query integration

We already use TanStack Query for the dnd5eapi browse. Persistence operations (load decks, save card, delete deck) are a natural fit for it on the client side.

Two patterns the next agent should pick between:
- **Pure TanStack Query:** Replace Zustand for deck state. Queries become the source of truth; mutations invalidate them.
- **Hybrid:** Keep Zustand for the in-memory editing draft (for the transactional editor pattern we already have); use TanStack Query for fetching decks from Supabase and persisting via mutations.

Hybrid fits the existing transactional editor (local draft, Save commits) more cleanly. Worth confirming with the user.

## Where things live (file pointers)

- v1 design spec: [`docs/superpowers/specs/2026-04-19-dnd-cards-design.md`](../specs/2026-04-19-dnd-cards-design.md)
- API integration spec: [`docs/superpowers/specs/2026-04-19-dnd5eapi-integration-design.md`](../specs/2026-04-19-dnd5eapi-integration-design.md)
- Implementation plans: [`docs/superpowers/plans/`](../plans/)
- Original brief: [`project_idea.md`](../../../project_idea.md)
- README: [`README.md`](../../../README.md)

Code areas the next agent will touch:
- `src/deck/store.ts` — Zustand store + localStorage persistence (the main place to swap or augment).
- `src/deck/io.ts`, `src/deck/schema.ts` — JSON serialization + Zod validation. Both useful: schema for client-side validation of remote payloads; io as the export/import escape hatch.
- `src/views/DeckView.tsx` — currently the entry point for "create card", "import JSON", "browse from API"; will likely grow a deck picker and sign-in/out controls.
- `src/App.tsx` / `src/app/router.tsx` / `src/app/Root.tsx` — needs a `/login` route (or modal), session-aware nav, and possibly a `/deck/$id` route for shareable URLs.
- `src/api/QueryProvider.tsx` — TanStack Query provider; the persistence queries can live alongside the dnd5eapi ones.

## Suggested workflow for the next agent

1. **Brainstorm with the user** (use `superpowers:brainstorming`). Walk through auth UX → data model → migration → TanStack Query pattern.
2. **Write a spec** under `docs/superpowers/specs/`.
3. **Plan** under `docs/superpowers/plans/`.
4. **Execute** task-by-task with TDD discipline matching what's already in the repo.

## Operational details to be aware of

- Dev server is currently not running. If the user wants it: `npm run dev`. The user prefers explicit approval before running install/test/build commands routinely; `npm run dev` is fair game when they ask for it.
- Memory at `~/.claude/projects/-Users-cchudzicki-dev-dnd-cards/memory/` records two relevant preferences: factory-driven tests with faker (open to fishery — already adopted), and a standing OK to run `npm install / test / build` without re-asking each time.
- The `.superpowers/` directory is gitignored and used for the visual companion if you spin one up during brainstorming. Mockups persist there if launched with `--project-dir`.
