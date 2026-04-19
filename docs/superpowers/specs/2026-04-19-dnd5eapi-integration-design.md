# dnd5eapi Integration — Design

**Date:** 2026-04-19
**Status:** Approved, pending written review
**Relates to:** [v1 design](./2026-04-19-dnd-cards-design.md) — this is the phase-2 "API import" slice.

## Context

The v1 app ships with custom-only card creation. The v1 spec reserved `source: "custom" | "api"` and `apiRef` fields on `BaseCard` so a later slice could add API-sourced cards without a schema migration. This document defines that slice for dnd5eapi magic items.

## Scope

**In scope**
- Browse + search **magic items** from `https://www.dnd5eapi.co`.
- Support both **2024** and **2014** rulesets; 2024 is the default.
- On selection, create a new card in the deck with data from the API and land in the editor so the user can tweak before saving.
- Fetch layer is endpoint-agnostic so the follow-up `equipment` slice is additive.

**Explicitly deferred**
- `equipment` endpoint (weapons, armor, gear) — planned as phase 2.1; design leaves the seam in place.
- Spell cards, ability cards.
- Re-fetch / refresh of API data for previously-saved cards.
- Attaching external (non-API) images.

## User experience

**Entry point.** Deck view gains a second button next to **"New card"**: **"Browse from API"**. The existing "New card" behavior is unchanged.

**The modal.** Clicking "Browse from API" opens a modal centered over the deck view:

- Header: title "Browse magic items" + a **ruleset toggle** (2014 / 2024, default 2024) + close button.
- Search input (auto-focused) — plain text, case-insensitive substring match over item names.
- Below: result list. Each row is `name` (primary) + `equipment_category.name · rarity.name` (secondary). Rows are clickable.
- Loading state covers the full result area while the index is fetching.
- Error state replaces the list on fetch failure with a short message + retry button.
- Empty-query state shows the full list (no filter).

**Selection flow.**
1. User clicks a result row.
2. We fetch the detail for that slug (separate query).
3. While the detail is loading, the row shows an inline spinner; the rest of the modal remains interactive.
4. On detail success: the mapper produces an `ItemCard`; `upsertCard(card)` is called; modal closes; navigation goes to `/editor/$id` (same landing as "New card"). The user can edit then Save or Cancel; Cancel still removes a pristine new card.
5. On detail failure: the row shows an error icon + retry; the modal stays open.

**Dismissal.** Close button, Escape key, or clicking the backdrop closes the modal without side effects.

## Schema change

The `apiRef` type gains a `ruleset` field so saved cards remember which ruleset they came from.

```ts
apiRef?: { system: "dnd5eapi"; slug: string; ruleset: "2014" | "2024" };
```

The existing `Deck.version: 1` is unchanged. Existing persisted decks have no `apiRef` at all (every card is `source: "custom"`), so no migration is needed — the field is optional. Zod validation adds `ruleset` to the discriminated `apiRef` shape.

## Fetch layer

**Library.** `@tanstack/react-query` wired at the app root with a single `QueryClient`.

**Client.** `src/api/apiClient.ts` — small `fetch` wrapper: base URL `https://www.dnd5eapi.co`, 10s timeout via `AbortSignal.timeout`, JSON parsing, and a typed error shape `{ status: number | "network" | "timeout"; message: string }`. No retry logic (TanStack Query handles retries for us).

**Endpoints.** `src/api/endpoints/magicItems.ts`:
```ts
export type Ruleset = "2014" | "2024";

export type MagicItemIndexEntry = { index: string; name: string; url: string };
export type MagicItemIndex = { count: number; results: MagicItemIndexEntry[] };

export type MagicItemDetail2024 = {
  index: string;
  name: string;
  equipment_category: { index: string; name: string; url: string };
  rarity: { name: string };
  attunement: boolean;
  desc: string;         // single string, paragraphs separated by "\n"
  image?: string;       // relative path, e.g. "/api/images/magic-items/bag-of-holding.png"
  variants: unknown[];
  variant: boolean;
};

export type MagicItemDetail2014 = {
  index: string;
  name: string;
  equipment_category: { index: string; name: string; url: string };
  rarity: { name: string };
  desc: string[];       // array of paragraphs; first entry includes the type line
  image?: string;
  variants: unknown[];
  variant: boolean;
};

export type MagicItemDetail =
  | ({ ruleset: "2014" } & MagicItemDetail2014)
  | ({ ruleset: "2024" } & MagicItemDetail2024);

export const fetchMagicItemIndex = (ruleset: Ruleset): Promise<MagicItemIndex> => …;
export const fetchMagicItemDetail = (ruleset: Ruleset, slug: string): Promise<MagicItemDetail> => …;
```

**Hooks.** `src/api/hooks.ts`:
```ts
export const useMagicItemIndex = (ruleset: Ruleset) =>
  useQuery({
    queryKey: ["magic-items", ruleset, "index"],
    queryFn: () => fetchMagicItemIndex(ruleset),
    staleTime: 24 * 60 * 60 * 1000, // 24h
  });

export const useMagicItemDetail = (ruleset: Ruleset, slug: string | null) =>
  useQuery({
    enabled: slug !== null,
    queryKey: ["magic-items", ruleset, "detail", slug],
    queryFn: () => fetchMagicItemDetail(ruleset, slug as string),
    staleTime: 24 * 60 * 60 * 1000,
  });
```

The hooks are the only API the modal uses. The endpoint + client layers are not imported elsewhere.

## Mapping

`src/api/mappers/magicItems.ts` exports a single pure function per ruleset, both producing `ItemCard`.

**Shared logic.**
- `id = newId()` (nanoid).
- `name = detail.name`.
- `imageUrl = detail.image ? absoluteUrl(detail.image) : undefined`. `absoluteUrl` prepends `https://www.dnd5eapi.co`.
- `source = "api"`, `apiRef = { system: "dnd5eapi", slug: detail.index, ruleset }`.
- `createdAt = updatedAt = nowIso()`.
- `typeLine` composed: `${detail.equipment_category.name}, ${detail.rarity.name.toLowerCase()}` plus `" (requires attunement)"` when attunement is true.

**2014-specific.**
- `attunement`: detected by checking if `desc[0]` contains `"requires attunement"` (case-insensitive).
- `body`: `desc.join("\n\n")`. We include the first paragraph even though it overlaps `typeLine` because it may contain attunement-requirement details ("requires attunement by a spellcaster", etc.) that are worth keeping on the card. The user can edit if they want.

**2024-specific.**
- `attunement`: `detail.attunement`.
- `body`: `detail.desc` as-is. Paragraph splitting is handled by the existing `<Card>` renderer (splits on blank-line-ish boundaries); the 2024 `  \n ` separator pattern will produce one big paragraph in v1. That's acceptable for first ship; we can improve the splitter later.

## Code layout

```
src/
  api/
    apiClient.ts             fetch wrapper
    QueryProvider.tsx        wraps the app with a single QueryClientProvider
    endpoints/
      magicItems.ts          types + fetchers
    hooks.ts                 useMagicItemIndex, useMagicItemDetail
    mappers/
      magicItems.ts          detail -> ItemCard (both rulesets)
  views/
    BrowseApiModal.tsx       the modal UI
    BrowseApiModal.module.css
```

No existing files move. `DeckView.tsx` grows the "Browse from API" button + a `useState` to open the modal. `App.tsx` is wrapped in `QueryProvider`.

## Testing

**Mappers (pure, fixture-driven).** Real curl responses captured as `src/api/mappers/__fixtures__/*.json`. Tests assert the output is a valid `ItemCard` (via `itemCardSchema.safeParse`) and spot-check specific fields (name, composed typeLine, image URL, attunement detection).

**`apiClient`.** Unit tests stub `fetch`; assert URL construction (base + path), timeout handling, error-shape mapping for 404 / 500 / network / timeout.

**Hooks.** Render within a test `QueryClientProvider`; use `msw` to intercept network calls; assert loading → success and loading → error transitions.

**Modal.** Render via `renderWithRouter` + test `QueryClientProvider` + `msw` handlers. Cover:
- Shows loading state while index fetches.
- Search filters the list.
- Switching ruleset refetches.
- Clicking a row creates a card in the deck store with correct `source`, `apiRef`, and derived `typeLine` / `body`.
- Esc closes the modal without side effects.

**Factories.** Fishery + faker:
- `magicItemIndexEntryFactory`
- `magicItemIndexFactory` (composes N entries)
- `magicItemDetail2014Factory`, `magicItemDetail2024Factory`

Live under `src/api/factories.ts` to keep API test data co-located with its types.

**No** live-network tests. MSW is the boundary.

## Error handling

- **Index fetch fails.** Modal shows: "Couldn't load the magic-items list. [Retry]" Retrying calls `refetch()`.
- **Detail fetch fails.** Row shows an inline error + retry; list remains usable.
- **Ruleset toggle mid-fetch.** Each ruleset has its own query key, so toggling while a fetch is in flight simply switches which cache entry is being rendered; the original fetch completes into its own cache entry and is ignored. The UI reflects whichever ruleset the user most recently selected.
- **Rate-limit (HTTP 429).** Treated like any 4xx: retry button shown. We don't add exponential-backoff retry logic for v1; dnd5eapi's 100/min limit is generous enough for manual browsing.

## Non-goals / future seams

- **`equipment` endpoint.** Adding it means: a new `endpoints/equipment.ts`, a new `mappers/equipment.ts`, and a source tab in the modal ("Magic items | Equipment"). No changes to hooks, apiClient, or mapper interfaces.
- **Search beyond name.** Substring name match only; no fuzzy, no tokens, no rarity filter. Fine for ~360 items.
- **Image proxy / caching.** We rely on the browser to cache image GETs.
- **Offline / install.** No service worker in v1.
