# Icon picker — design

Date: 2026-04-30
Status: spec
Branch: `cc/post-ui-followups`

## Goal

Replace the lucide-based item-card icons with [game-icons.net](https://game-icons.net) icons, rendered black-on-white for print fidelity. Add finer-grained heuristic rules (axe, hammer, bow, trident — currently all "sword") and let users override the auto-pick from a searchable picker dialog. Add a developer-only debugger route that renders the rule list and lets you simulate matches against arbitrary `name` + `typeLine` inputs.

The only data field added is `iconKey: string | undefined` on `BaseCard`. Undefined means "use heuristic"; a string is an explicit override (kebab game-icons name, e.g. `"trident"`).

## In scope

- Card icon rendering swaps from `lucide-react` to Iconify game-icons. Lucide stays for app chrome (TrashIcon, PencilIcon, OAuth providers, UserMenu).
- New `iconKey?: string` on `BaseCard` (Zod schema + Postgres JSON Schema constraint).
- `IconPickerDialog` primitive in `src/lib/ui/` — modal with a 10-column icon grid, search input, and "Show all" toggle.
- New "Icon" form row in `ItemEditor` that opens the picker.
- Lazy-loaded chunk for the full ~4000-icon set, used by both the picker (when "Show all" is on) and the card render path (when `iconKey` is non-curated).
- Heuristic refactor (`pickIconKey` returns kebab strings instead of components; finer weapon-subtype rules).
- New route `/debug/icons` rendering `ICON_RULES` as a static table plus a two-input simulator.
- New Supabase migration that drops and re-adds the `cards_payload_valid` JSON Schema constraint with `iconKey` allowed.

## Out of scope (explicit non-goals)

- No color customization. Icons are always black on white.
- No spell/ability rendering changes. The renderers don't exist yet; the `iconKey` field exists on those types via `BaseCard` but no UI sets it.
- No image upload. Custom images remain link-only via the existing `imageUrl` field.
- No changes to `PrintView` or to print CSS (`@page` rules, `Card.module.css` print sizing). The icon swap propagates through `Card`/`AutoFitCard` automatically.
- No editor chrome (badges, hover affordances) on the preview card. Print fidelity demands the preview match exactly what gets printed.
- No "human-readable label" for icon names. Surfaces show the kebab key as-is (e.g. `"war-pick"`).
- No spec-time effort to nail the final fallback icon name or the exact 100-key curated list. These get finalized during implementation against the actual Iconify game-icons exports.

## Off-limits files this work touches

By default, `src/cards/` is off-limits without explicit user approval (per `CLAUDE.md`). This work has been authorized and edits these files:

- `src/cards/Card.tsx` — render path swap.
- `src/cards/iconRules.ts` — rules return kebab keys instead of components; weapon subtypes added.
- `src/cards/iconRules.test.ts` — assertion updates.
- `src/cards/ItemEditor.tsx` — adds the Icon form row.
- `src/cards/ItemEditor.test.tsx` — assertion updates.
- `src/cards/types.ts` — adds `iconKey` to `BaseCard`.

`src/cards/AutoFitCard.tsx` is unchanged. `src/views/PrintView.tsx` is unchanged.

## Library choice: Iconify

Settled on Iconify (`@iconify/react` + `@iconify-json/game-icons`) over `react-icons/gi`. Reasoning:

- Iconify addresses icons by their **native game-icons.net kebab names** (`game-icons:trident`). No PascalCase ↔ kebab conversion, no consistency test guarding the conversion.
- Tree-shaking of the curated set is achieved via per-icon JSON imports: `import iconTrident from "@iconify-icons/game-icons/trident"`. Each curated icon is a small JSON blob; only the imported ones land in the main bundle.
- Lazy-loading the full set uses Iconify's collection-registration API: `const m = await import("@iconify-json/game-icons"); addCollection(m.default);`. Same chunking model as `react-icons` would have given us, but with Iconify's offline-mode plumbing instead of hand-rolled lookup.
- Iconify's `<Icon>` component handles missing icons by rendering nothing (no crash, no error boundary needed).

Trade vs. `react-icons/gi`: one extra npm dependency (`@iconify/react` + `@iconify-json/game-icons` vs. `react-icons` alone). Worth it to delete the kebab/PascalCase code path entirely.

## Data model

### `src/cards/types.ts`

```ts
export type BaseCard = {
  id: CardId;
  name: string;
  body: string;
  imageUrl?: string;
  source: "custom" | "api";
  apiRef?: { system: "dnd5eapi"; slug: string; ruleset: "2014" | "2024" };
  createdAt: string;
  updatedAt: string;
  iconKey?: string;       // NEW. Game-icons kebab name. Undefined = use heuristic.
};
```

The field lives on `BaseCard` (not `ItemCard` only) so the same override mechanism is available to spell/ability cards once their renderers ship. No additional code or UI uses it yet for those kinds.

### `src/decks/schema.ts`

Add `iconKey: z.string().optional()` to `baseCardSchema`. The three discriminated-union variants inherit it via `.extend(...)`.

### Migration

The existing `cards_payload_valid` constraint (`supabase/migrations/20260426000001_jsonschema.sql`) has `"additionalProperties": false` on each card variant in its embedded JSON Schema. Adding a new field to the payload without updating the schema will cause inserts to be rejected by Postgres.

Steps for the migration:

1. Edit `src/cards/types.ts` and `src/decks/schema.ts` per above.
2. Run `npm run gen:schema`. This overwrites `supabase/schemas/card-payload.json`. The diff: each `oneOf` branch gains `"iconKey": { "type": "string" }` in `properties`. The required list is unchanged.
3. Create a new migration file `supabase/migrations/<timestamp>_add_iconkey_to_cards.sql` following the drop-then-add pattern documented in `20260426000001_jsonschema.sql`'s header. Copy the previous migration verbatim, swap in the regenerated schema body inside the `$cardpayload$` heredoc, and update the leading comment.
4. Apply locally via `supabase db reset` or `supabase migration up`.
5. CI's `npm run check:schema` verifies the JSON file is in sync with `schema.ts`.

No data backfill. Existing rows have no `iconKey` field, which is the same as "auto."

## Heuristic refactor

### Shape change

```ts
// src/cards/iconRules.ts
export type IconRule = {
  pattern: RegExp;
  iconKey: string;            // was: icon: LucideIcon
  description: string;
};

export const ICON_RULES: readonly IconRule[] = [ /* … */ ];
export const FALLBACK_ICON_KEY = "perspective-dice-six-faces-random"; // placeholder, finalize during impl

export function pickIconKey(card: ItemCard): string {
  const haystack = `${card.name} ${card.typeLine}`;
  for (const rule of ICON_RULES) {
    if (rule.pattern.test(haystack)) return rule.iconKey;
  }
  return FALLBACK_ICON_KEY;
}
```

The matching strategy is unchanged: each rule's regex runs against `name + " " + typeLine` (concatenated), first match wins. Empty-typeLine custom items naturally fall through to name-only matching since the empty string contributes nothing.

### Rule expansion

The existing single weapon rule splits into specific subtypes plus a generic fallback. Order matters — specific rules first, generic catch-all last:

| Pattern (illustrative; finalize during impl) | iconKey |
|---|---|
| `axe\|battleaxe\|greataxe\|handaxe\|tomahawk` | `battle-axe` |
| `hammer\|warhammer\|maul` | `war-hammer` |
| `\bbow\b\|longbow\|shortbow` | `bow-arrow` |
| `crossbow` | `crossbow` |
| `trident\|spear\|polearm\|halberd\|glaive\|pike\|lance` | `trident` |
| (existing weapon catch-all: `\bweapons?\b\|sword\|blade\|dagger\|...`) | `broadsword` |
| (existing armor) | `shield` |
| (existing ring) | `ring` |
| (existing potion) | `potion-ball` |
| (existing scroll) | `scroll-unfurled` |
| (existing rod/wand/staff) | `wizard-staff` |
| (existing ammunition) | `arrow-cluster` |

Final regex tightening (e.g., ensuring `trident` doesn't accidentally match `spider` due to substring overlap) happens during implementation. All rule changes are covered by `iconRules.test.ts`.

## Components

```
src/cards/
  iconRules.ts                # MODIFIED — rules return iconKey strings
  iconRules.test.ts           # MODIFIED — assertions update
  Card.tsx                    # MODIFIED — uses ResolvedIcon + Suspense
  Card.test.tsx               # MODIFIED — adds iconKey override path
  ItemEditor.tsx              # MODIFIED — adds Icon form row
  ItemEditor.test.tsx         # MODIFIED — covers form row
  types.ts                    # MODIFIED — iconKey on BaseCard
  curatedIcons.ts             # NEW — list of curated kebab keys
  curatedIcons.test.ts        # NEW — assertion that each key is a real Iconify export
  resolveIcon.ts              # NEW — render primitive: kebab key → Iconify <Icon>
  resolveIcon.test.ts         # NEW

src/lib/ui/
  IconPreview.tsx             # NEW — renders a single icon black-on-white in a sized box
  IconPreview.module.css
  IconPreview.test.tsx
  IconPickerDialog.tsx        # NEW — modal dialog with search + grid + Show-all toggle
  IconPickerDialog.module.css
  IconPickerDialog.test.tsx

src/views/
  IconDebugView.tsx           # NEW — /debug/icons
  IconDebugView.module.css
  IconDebugView.test.tsx

src/decks/
  schema.ts                   # MODIFIED — adds iconKey to baseCardSchema
  schema.test.ts              # MODIFIED

src/app/
  router.tsx                  # MODIFIED — adds /debug/icons route

supabase/
  schemas/card-payload.json   # REGENERATED via npm run gen:schema
  migrations/<ts>_add_iconkey_to_cards.sql   # NEW
```

### `resolveIcon.ts`

The single source of truth for "kebab key → renderable component."

```ts
import { Icon, addCollection } from "@iconify/react";
import iconTrident from "@iconify-icons/game-icons/trident";
import iconBroadsword from "@iconify-icons/game-icons/broadsword";
// …~100 per-icon imports for the curated set

const CURATED: Record<string, IconifyIcon> = {
  trident: iconTrident,
  broadsword: iconBroadsword,
  // …
};

let fullSetPromise: Promise<void> | null = null;
function ensureFullSet(): Promise<void> {
  fullSetPromise ??= import("@iconify-json/game-icons").then((m) => {
    addCollection(m.default);
  });
  return fullSetPromise;
}

export type ResolvedIconProps = { iconKey: string; size?: number };

export function ResolvedIcon({ iconKey, size }: ResolvedIconProps) {
  const curated = CURATED[iconKey];
  if (curated) return <Icon icon={curated} width={size} />;
  // Non-curated: kick off the lazy chunk and render Iconify's name-based variant.
  // The chunk loads asynchronously; until it lands, <Icon> renders nothing.
  void ensureFullSet();
  return <Icon icon={`game-icons:${iconKey}`} width={size} />;
}

export function isCurated(iconKey: string): boolean {
  return iconKey in CURATED;
}
```

Notes:
- `ensureFullSet` is idempotent and module-scoped — one chunk per session, regardless of how many components call it.
- `<Icon>` renders nothing while the icon registration is pending or if the icon doesn't exist after registration. This avoids crashes from stale/garbage `iconKey` values.
- The `void ensureFullSet()` call inside the render is intentional fire-and-forget. React re-renders when Iconify registers the icon (Iconify's component subscribes internally).

### `curatedIcons.ts`

```ts
export const CURATED_ICONS: readonly string[] = [
  "broadsword",
  "battle-axe",
  "war-hammer",
  "trident",
  // …~100 entries
];
```

Plain string list. The actual entries are finalized during implementation against the real Iconify exports. Target ~100 entries spanning weapons (~25), armor (~10), magic items (~15), consumables (~10), ammunition (~5), tools (~10), magical effects (~10), creature parts (~5), containers (~5).

`curatedIcons.test.ts` asserts that every entry corresponds to an actual icon in `@iconify-json/game-icons` — guards against typos and version-bump removals. The check runs against the real Iconify collection (no MSW).

### `IconPreview.tsx`

Thin wrapper around `<ResolvedIcon>` that places the icon in a fixed-size white square with thin border. Props: `iconKey: string`, `size?: "sm" | "md"` (24px / 40px). Used in:
- Picker dialog tiles.
- Form-row chip in `ItemEditor`.
- Debug-view rule table rows.

CSS uses `color: #111` and `background: #fff`. No theming hooks. No hover/focus states (it's a presentational primitive — interactive wrappers add their own).

### `IconPickerDialog.tsx`

Modal dialog built on `react-aria-components`: `DialogTrigger` + `Modal` + `Dialog` + `GridList`. Props:

```ts
type Props = {
  value: string | undefined;       // current iconKey, undefined = Auto
  onChange: (next: string | undefined) => void;
  triggerLabel: string;            // e.g., "trident" or "Auto"
};
```

Layout:

```
┌────────────────────────────────────────┐
│ Pick an icon                       [×] │
│ [ Search ]            ☐ Show all       │
│                                        │
│ ┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐
│ │⊙ ││⚔ ││🪓││🔨││🏹││🎯││🔱││🗡││  ││  │
│ └──┘└──┘└──┘└──┘└──┘└──┘└──┘└──┘└──┘└──┘
│  Auto  …                                │
│  …  (scroll for more)                   │
│                                        │
│                              [Cancel]  │
└────────────────────────────────────────┘
```

Behavior:
- Trigger button shows `triggerLabel` (the kebab key or "Auto") with a `▾` affordance.
- The dialog opens on press; first interactive element focused is the search input.
- The first tile is always the **Auto** sentinel — selecting it calls `onChange(undefined)` and closes the dialog.
- Other tiles render via `<IconPreview iconKey={key} size="sm" />`. The kebab key is the tile's `aria-label` and tooltip (no visible text label — keeps the grid dense at 10 wide).
- Search filter: case-insensitive substring match against the kebab key (`includes`). Empty search shows everything in the active dataset.
- "Show all" switch in the header: default off (curated set, ~100 icons). When flipped on for the first time, calls `ensureFullSet()`; once it resolves, the dataset is `listIcons("", "game-icons")` (Iconify's top-level export — returns every registered icon name as `"game-icons:trident"` strings, which the dialog strips to bare kebab keys). While loading, the grid shows a small "Loading…" placeholder.
- Selecting a tile calls `onChange(key)` and closes the dialog. No "Confirm" button — single-click commits.
- Keyboard: arrow keys navigate the grid in two dimensions (handled by react-aria's `GridList`). Enter selects. Escape closes. Tab cycles search → switch → grid → cancel.

### Form row in `ItemEditor.tsx`

A new field, placed above "Image URL (optional)" to keep visual-asset fields adjacent:

```
Icon (optional)
[ chip ] [ Trigger button: "trident" or "Auto" ▾ ]
Currently auto-picking: trident
```

- The chip on the left is `<IconPreview iconKey={resolvedKey} size="sm" />`, where `resolvedKey = card.iconKey ?? pickIconKey(card)`. It shows what's actually rendering on the card right now — explicit override or auto-resolved.
- The trigger button opens `IconPickerDialog` and is connected via `value` / `onChange`:
  ```tsx
  <IconPickerDialog
    value={card.iconKey}
    onChange={(next) => onChange({ ...card, iconKey: next, updatedAt: nowIso() })}
    triggerLabel={card.iconKey ?? "Auto"}
  />
  ```
- The "Currently auto-picking: …" hint renders only when `card.iconKey` is undefined and the heuristic returned a non-fallback rule. It displays the resolved kebab key.

### Card render path (`Card.tsx`)

Replaces `const Icon = pickIcon(card)`:

```tsx
const iconKey = card.iconKey ?? pickIconKey(card);
…
<div className={styles.fallbackIcon} data-testid="card-fallback-icon" aria-hidden="true">
  <ResolvedIcon iconKey={iconKey} />
</div>
```

CSS (`Card.module.css`): the existing `.fallbackIcon` class becomes:

```css
.fallbackIcon {
  /* unchanged positioning */
  background: #fff;
  color: #111;             /* was: #666 */
}
.fallbackIcon svg {
  width: 85%;
  height: 85%;
  /* stroke-width removed — Iconify game-icons are filled paths, not strokes */
}
```

No Suspense boundary needed at the component level — Iconify's `<Icon>` handles its own async resolution by rendering nothing until the icon is registered, then re-rendering. Cards never throw.

## Debugger page (`/debug/icons`)

Two stacked sections, no auth gate, no nav link from anywhere. The page is reachable only by typing the URL.

### Top: simulator

Two text inputs labeled "Name" and "Type line." Below them, a live readout:

```
Name: [Flame Tongue Trident______________]
Type line: [Weapon, rare______________________]

Match: rule #5 (trident|spear|polearm|halberd|glaive|pike|lance) — "weapon — polearm/spear"
Icon: [IconPreview size="md" iconKey="trident"]
```

If no rule matches: "No match → fallback (`<FALLBACK_ICON_KEY>`)" with the fallback icon rendered.

### Bottom: rule table

A static table iterating `ICON_RULES`:

| # | Pattern (regex source) | Description | Icon |
|---|---|---|---|
| 1 | `axe\|battleaxe\|...` | weapon — axe | [icon] |
| 2 | `hammer\|warhammer\|...` | weapon — hammer | [icon] |
| … | … | … | … |
| (fallback) | — | — | [icon] |

Both halves render directly from `ICON_RULES` (imported from `iconRules.ts`) — there is no duplicated rule list. New rules show up in both panels automatically.

### Route registration

`src/app/router.tsx` gets a new route:

```ts
const iconDebugRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/debug/icons",
  component: IconDebugView,
});
```

Added to `routeTree`. No `RequireOwner` wrapper — page is purely client-side, displays only data already in the public bundle.

## Lazy-load mechanics

- **Curated set:** ~100 per-icon JSON imports (`@iconify-icons/game-icons/<key>`) at the top of `resolveIcon.ts`. Tree-shaken by Vite into the main bundle. Each entry is a small JSON blob; total contribution is on the order of tens of kilobytes.
- **Full set:** `await import("@iconify-json/game-icons")` is a Vite dynamic import that emits a separate chunk. Triggered by either (a) the user flipping "Show all" in the picker, or (b) a `<ResolvedIcon>` rendering with a non-curated key. Once loaded, the chunk's collection is registered with Iconify globally — subsequent renders are synchronous.
- **No build-time sprite, no committed asset.** Iconify and Vite handle the chunking.

Bundle sanity check during implementation: `npm run build` and inspect the chunk for `@iconify-json/game-icons`. If it's surprisingly large (>2 MB gzipped), revisit the curated-vs-full split.

## Print considerations

No changes to `PrintView` or `@page` rules. The icon library swap propagates through `Card`/`AutoFitCard` automatically.

Trade-off: a user printing a deck *immediately* after first opening it, where the deck contains non-curated icons, may see blank slots in print for the brief window before the lazy chunk loads. In practice, the chunk loads as soon as any non-curated icon enters the deck view, well before the user navigates to print. Acceptable.

## Missing-icon behavior

Invariant: rendering a card with any `iconKey` value (valid, stale, garbage) MUST NOT crash.

The fallback chain when `card.iconKey === "removed-icon-name"`:

1. `ResolvedIcon` checks `CURATED` → not present → falls through to the lazy path.
2. Calls `ensureFullSet()` (idempotent), renders `<Icon icon="game-icons:removed-icon-name" />`.
3. Iconify's `<Icon>` renders nothing if the named icon doesn't exist in the registered collection. No throw.

In dev, log a warning once per bad `iconKey`. Iconify's top-level `iconLoaded(name): boolean` (exported from `@iconify/react`) returns `true` if the icon is registered. After `ensureFullSet()` resolves, `ResolvedIcon` checks `iconLoaded(`game-icons:${iconKey}`)` for non-curated keys; if `false`, log once via a module-level `Set<string>` to avoid log spam:

```ts
const warnedKeys = new Set<string>();
// inside ResolvedIcon, after ensureFullSet resolves
if (import.meta.env.DEV && !iconLoaded(`game-icons:${iconKey}`) && !warnedKeys.has(iconKey)) {
  warnedKeys.add(iconKey);
  console.warn(`[ResolvedIcon] Unknown iconKey "${iconKey}" — rendering nothing.`);
}
```

Production builds skip the check entirely (gated on `import.meta.env.DEV`).

The editor does not surface stale-key state to the user in v1. Deferred: a small "?" indicator in the form row chip when the stored override doesn't resolve, so users know their pick was orphaned.

## Tests

| File | Asserts |
|---|---|
| `iconRules.test.ts` (modified) | Existing tests update from `expect(pickIcon(card)).toBe(Sword)` to `expect(pickIconKey(card)).toBe("broadsword")`. New tests for finer rules: trident → `"trident"`, axe → `"battle-axe"`, hammer → `"war-hammer"`, bow → `"bow-arrow"`, crossbow → `"crossbow"`. |
| `resolveIcon.test.ts` (new) | Curated key renders the right icon (assert via Iconify's rendered SVG `data-icon` attribute or aria-label). Non-curated key triggers `ensureFullSet` (mock the dynamic import) and renders. Garbage key renders nothing without throwing. |
| `curatedIcons.test.ts` (new) | Every entry in `CURATED_ICONS` is a valid icon in `@iconify-json/game-icons`. Runs against the actual collection (no MSW). |
| `IconPreview.test.tsx` (new) | Renders for a curated key. Renders an empty placeholder for an unknown key (does not throw). |
| `IconPickerDialog.test.tsx` (new) | Opens on trigger press. Search filters visible tiles. Selecting "Auto" calls `onChange(undefined)` and closes the dialog. Selecting an icon calls `onChange(key)` and closes. "Show all" switch flips and the visible set expands; mock `import("@iconify-json/game-icons")` to return a small synthetic collection. Keyboard nav: arrow keys move within the GridList in two dimensions; Escape closes; Enter selects. |
| `Card.test.tsx` (modified) | Existing auto-picked tests pass with new key strings. New: setting `card.iconKey = "trident"` renders the trident icon. New: setting `card.iconKey = "fake-icon"` renders the card without throwing (icon slot is empty). |
| `ItemEditor.test.tsx` (modified) | New: Icon form row renders. Trigger button opens the dialog. Selecting a tile updates `card.iconKey` via `onChange`. The "Currently auto-picking: …" hint appears only when `iconKey` is undefined and the heuristic returns a non-fallback rule. |
| `IconDebugView.test.tsx` (new) | The static rule table renders one row per `ICON_RULES` entry plus a fallback row. The simulator updates the matched-rule readout in real time as the user types into Name and Type line. |
| `schema.test.ts` (modified) | `cardPayloadSchema.parse(...)` accepts a card with `iconKey`. `cardToInsertRow` / `rowToCard` round-trip preserves `iconKey`. |

Per project conventions: tests use `getByRole(...)` over text/class selectors; factories pass no values they don't assert on.

## Risks and deferred items

### Risks

- **Bundle size.** The lazy chunk for `@iconify-json/game-icons` is on the order of hundreds of kilobytes compressed. Verify during impl with `npm run build` chunk inspection.
- **Curated key drift.** A future major version of `@iconify-json/game-icons` could remove or rename icons. Mitigated by `curatedIcons.test.ts`, which fails the build if any curated key no longer exists in the collection.
- **Existing rendered cards.** Cards without `iconKey` set render heuristic-picked icons in the new game-icons style immediately on deploy. This is the desired change but it isn't opt-in.
- **Print latency on cold cache.** First-print of a deck containing non-curated icons may briefly show blank slots while the chunk loads. Mitigated in practice by chunk preloading triggered on deck-view render.
- **Debugger route is unauthenticated.** `/debug/icons` is reachable from any browser. The route only displays code (rules + icons) that is already in the public bundle, so this is not a leakage concern, but it is unprotected.

### Deferred items (not blocking implementation)

- Final `FALLBACK_ICON_KEY` selection (placeholder: `perspective-dice-six-faces-random`).
- Final 100-key `CURATED_ICONS` list — categories defined here, exact names verified during impl against Iconify exports.
- Exact regex tightening for new weapon-subtype rules (avoid e.g. `trident` rule swallowing `"spider"` via substring overlap).
- Stale-key indicator in the editor form row (small "?" badge when the stored override doesn't resolve to a real icon).
- Visual labels under picker tiles (currently icon-only with tooltip; if discoverability becomes an issue, add visible labels and reduce grid width).

## Implementation order suggestion

For the writing-plans skill to consume:

1. Schema + migration (data model lands first; everything depends on it).
2. `resolveIcon` + `curatedIcons` + `IconPreview` (rendering primitives).
3. `iconRules` refactor (heuristic returns kebab keys; tests updated).
4. `Card.tsx` swap (cards render the new icons).
5. `IconPickerDialog` (picker UI primitive).
6. `ItemEditor` form row (wires the picker to the card data).
7. `IconDebugView` + route (developer tool).
8. End-to-end manual smoke: open a deck, edit a card, override an icon, save, reload, verify persistence.
