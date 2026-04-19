# D&D Cards — v1 Design

**Date:** 2026-04-19
**Status:** Approved, pending written review

## Context

We're building a website for generating D&D 5e cards — starting with item cards. The defining constraint is legibility: the primary user is visually impaired and needs large, clean, minimally stylized cards. Several existing tools produce cards that are hard to read; this one prioritizes readability over decorative flourish.

A natural consequence of large fonts is fewer cards per page. We'll target 2 or 4 cards per US Letter sheet.

## v1 Scope

**In scope:**

- Create, edit, and delete **item cards** from scratch.
- Live preview while editing.
- Print-ready page layout: 2 or 4 cards per US Letter page.
- Browser print via `window.print()` + `@page` CSS.
- JSON import/export for the whole deck.
- localStorage autosave.

**Explicitly deferred (with clean seams left in the v1 design):**

- **dnd5eapi.co browse/import** — expected as the next milestone, likely the same day. The card schema and storage are shaped to accept API-sourced cards without refactoring.
- Spell cards and ability cards — the `Card` type is a discriminated union from day one; adding them later is additive.
- Auth, deck sharing, multi-deck management, card backs, rich image library, Markdown body.

## Stack

- **Vite + React + TypeScript** (strict).
- **TanStack Router** for routing (typed routes, good pairing with TanStack Query when we add the API).
- **Zustand** for deck state (single source of truth; persists to localStorage). UI state stays in route params or component state. Not TanStack Query — the source of truth is local, not server-owned.
- **Plain CSS with CSS variables** for the type scale. No Tailwind or UI kit; we own font sizing explicitly, which matters for legibility.
- **Vitest + React Testing Library** for tests.
- **Biome** for lint + format (replaces ESLint + Prettier).

## Data model

```ts
type CardId = string;

type BaseCard = {
  id: CardId;
  name: string;
  body: string;                // multiline; paragraphs split on blank lines; plaintext in v1
  imageUrl?: string;           // optional; small, top-right
  source: "custom" | "api";    // v1 always "custom"; seam for phase 2
  apiRef?: { system: "dnd5eapi"; slug: string };
  createdAt: string;           // ISO timestamp
  updatedAt: string;           // ISO timestamp
};

type ItemCard = BaseCard & {
  kind: "item";
  typeLine: string;            // free-form, e.g. "Wondrous item, uncommon"
  costWeight?: string;         // free-form, e.g. "500 gp · 15 lb"
};

// Declared but not implemented in v1:
type SpellCard   = BaseCard & { kind: "spell" };
type AbilityCard = BaseCard & { kind: "ability" };

type Card = ItemCard | SpellCard | AbilityCard;

type Deck = {
  version: 1;
  cards: Card[];
};
```

**Notes:**

- The renderer and editor branch on `kind`. In v1, only `"item"` is handled; other kinds throw a clear "not yet implemented" error if they appear in imported JSON.
- `source` + `apiRef` are unused in v1 but present in the type so JSON written today survives phase 2 unchanged.
- `version` on `Deck` enables schema migrations later.
- `typeLine` and `costWeight` are free-form strings. This matches how the DMG renders items and keeps the v1 editor minimal. Structured fields (rarity, attunement, etc.) can be added later and derived into `typeLine` without breaking stored decks.

## Screens

Three routes, top nav switches between them. No sidebar.

### `/` — Deck view

- Top bar: deck name, `Import JSON`, `Export JSON`, `New card` buttons.
- Main area: a simple list (not grid) of cards. Each row shows name, a snippet of the type line, and edit/delete affordances. Clicking the row opens the editor.
- Empty state: "No cards yet. Create one or import JSON."
- Link to `/print`.

### `/editor/:id` — Editor

- Two-column layout:
  - **Left:** form — name, type line, body (textarea), cost/weight, image URL.
  - **Right:** live `<Card>` preview at its target print size (4-up by default; a small toggle previews 2-up).
- Autosave to localStorage on every change via the Zustand store.
- "Done" returns to `/`.
- **New-card flow:** `/` → click "New" → creates a card with defaults (`kind: "item"`, `name: "Untitled item"`, `typeLine: ""`, `body: ""`, `source: "custom"`, fresh `id`/timestamps), routes to `/editor/<new-id>`.

### `/print` — Print view

- Top bar (visible on screen, hidden in print):
  - Cards-per-page dropdown (2 or 4).
  - Print button (`window.print()`).
- Below: the actual paginated pages, rendered exactly as they'll print.
- Each page is a fixed-size `.page` element (`8.5in × 11in`) with a `0.5in` margin and `break-after: page`.
- Each page contains fixed-size `.card-slot` elements at the right dimensions for the current layout.

## Card layout

Same structure at both sizes, scaled.

- **Header** — name (bold) + type line (italic). Small square image slot pinned to the top-right corner of the header area; the title takes the remaining width to its left.
- **Divider** — thin neutral rule.
- **Body** — full-width below the header, plaintext with paragraph breaks on blank lines. Does not wrap around the image. Auto-scales if content is long (see next section).
- **Footer** — optional cost · weight strip under a thin divider. Hidden if empty.

**Typography.** All sizes are declared in `em` relative to a per-layout base font-size set on the card container. Base sizes:

- **4-up (3.75″ × 5″):** base `17px`. Title `1.2em` bold · type line `0.9em` italic · body `1em` · footer `0.85em`.
- **2-up (7.5″ × 5″):** base `24px`. Same relative scale (title `1.2em` etc.).

Title is ~1.2× body. Bold carries the emphasis; the size difference is intentionally modest.

Font: `system-ui, -apple-system, "Segoe UI", sans-serif`. Black on white. Thin neutral dividers. No decorative borders, no rarity color stripe in v1.

## Auto-fit (long content)

Encapsulated in a single `<AutoFitCard>` component.

- Card is always rendered at its true print size (inline `width`/`height` in inches).
- The card container's base `font-size` is set via a CSS variable (`17px` for 4-up, `24px` for 2-up). Auto-fit multiplies this base by a `--scale` variable with three steps: `1 | 0.9 | 0.8`. Because all child sizes are in `em`, scaling the base scales everything together — including title, type line, and body.
- After layout, a `ResizeObserver` + `scrollHeight > clientHeight` check on the body element walks: step `1` → `0.9` → `0.8`. Stops when content fits or we hit `0.8`.
- If content still overflows at `0.8`, CSS clips it and the editor shows a non-printing warning ("Card content is too long to fit even at the smallest size").
- Public API: `<Card card={card} layout="4-up" | "2-up" />`. Callers don't know about scaling.
- Unit-testable via jsdom + `scrollHeight` mock.

## Print mechanics

- `@page { size: letter; margin: 0.5in; }` — we own the margins. Browser-rendered headers/footers (URL, page number) must be disabled by the user in the print dialog; a "Printing tips" line in the print view notes this.
- `@media print`: hide nav and the cards-per-page dropdown; show only `.page` elements; each page has `break-after: page`.
- `window.print()` from a button; no PDF library.
- Cards are fixed-size inside fixed-size pages, so a card cannot straddle a page break as long as the math matches. No `break-inside: avoid` gymnastics.

## Storage & JSON

- **Zustand store:** `deck: Deck`, plus actions `upsertCard`, `removeCard`, `importDeck`, `replaceDeck`.
- **localStorage autosave:** Zustand `persist` middleware writes on every state change. Key: `dnd-cards:deck:v1`. (No debounce; localStorage writes are cheap and decks are small.)
- **Import:** file picker → `JSON.parse` → Zod schema validation → replace deck. Malformed input shows a clear error and does not clobber the existing deck.
- **Export:** serialize `deck` to JSON and download as `deck.json`.
- **Schema versioning:** `deck.version: 1`. Import rejects unknown versions with "made by a newer version of this app." When the version bumps, we add `migrate(oldDeck) -> Deck`.

## File layout (target)

```
src/
  app/              router, layout, app-level wiring
  deck/
    store.ts        Zustand store + persistence
    schema.ts       Zod schemas (Card union, Deck)
    io.ts           JSON import/export
    factories.ts    Fishery factories for tests (deckFactory)
  cards/
    types.ts        Card union + Deck type
    Card.tsx        pure renderer (takes Card + layout)
    AutoFitCard.tsx wrapper that measures and scales
    ItemEditor.tsx  form for ItemCard
    factories.ts    Fishery factories (itemCardFactory, …)
  views/
    DeckView.tsx    / route
    EditorView.tsx  /editor/:id route
    PrintView.tsx   /print route
  lib/              small utilities (uuid, debounce, download)
```

## Testing

Vitest + React Testing Library. No e2e / Playwright in v1.

**Test data — factory-driven.** We use **Fishery** + **@faker-js/faker** for test data. Hand-rolled factories are fine for 1–2 shapes, but we'll have at least `ItemCard`, `Deck`, and soon `SpellCard` / `AbilityCard`; Fishery's sequences, transients, and association helpers earn their keep here.

- Factories live in `src/cards/factories.ts` and `src/deck/factories.ts`.
- Each factory produces fully-valid, realistic-but-varied data by default (e.g., `itemCardFactory.build()` returns a plausible magic item with a faker-generated name, type line, and body).
- **Tests only override fields they actually assert on.** If a test doesn't care about `name`, it doesn't pass `name`. If it asserts on `typeLine`, it overrides `typeLine` explicitly. This keeps test intent obvious at a glance and prevents misleading values (e.g., `name: "test"` in a test that isn't about names).
- Fishery's sequence helper generates deterministic unique `id`s across a test run.

**What we test:**

- `deck` store: add/edit/delete, JSON round-trip, Zod rejects malformed input, version-mismatch handling.
- `ItemEditor`: typing updates the preview.
- `AutoFitCard`: given mocked body `scrollHeight`, picks the correct scale step.
- Snapshot tests on `Card` rendering to catch accidental visual regressions.

## Out of scope (v1) — phase-2 seams

These are called out explicitly so the v1 design doesn't foreclose them:

- **API import (dnd5eapi):** `Card.source` and `Card.apiRef` fields are already in the schema. Phase 2 adds a `New from API` button, a search/browse UI, a fetch layer (likely with TanStack Query), and a mapper from `dnd5eapi` responses into `ItemCard`. No schema change.
- **Spell and ability cards:** `SpellCard` and `AbilityCard` are declared in the union but throw on render/edit. Phase 2 fleshes out their fields, renderer, and editor.
- **Markdown body:** schema is already a string; phase 2 swaps the plaintext renderer for `react-markdown`.
