# Icon picker — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace lucide-based item-card icons with Iconify game-icons (black-on-white), let users override the auto-pick from a searchable picker dialog, and add a developer-only debugger route at `/debug/icons`.

**Architecture:** New `iconKey?: string` on `BaseCard` (kebab game-icons name; undefined = use heuristic). Curated set (~100 icons) imported per-icon and tree-shaken into the main bundle. Full set lazy-loaded as a Vite chunk via `await import("@iconify-json/game-icons")` + `addCollection()`. Render path uses `<Icon icon="game-icons:trident" />` with native kebab addressing.

**Tech Stack:** React 18 + TypeScript + Vite, `@iconify/react@^6`, `@iconify-json/game-icons`, `react-aria-components`, Vitest + RTL + `@testing-library/user-event`, MSW (not used here — no network), Biome for lint/format.

**Spec:** `docs/superpowers/specs/2026-04-30-icon-picker-design.md`

**Conventions for the executor:**
- Per `CLAUDE.md`: ask before running `npm install`, `npm test`, `npm run dev`, or `npm run build`.
- Tests use `getByRole(...)` over text/class selectors. Factories pass no values they don't assert on.
- Biome's formatter is authoritative — accept its reformatting.
- Default to no comments in code. Only add one when the *why* is non-obvious.
- Don't push or create PRs.
- `src/cards/` is off-limits without explicit user approval, but this work is authorized for: `Card.tsx`, `Card.module.css`, `Card.test.tsx`, `iconRules.ts`, `iconRules.test.ts`, `ItemEditor.tsx`, `ItemEditor.test.tsx`, `types.ts`. Do not touch `AutoFitCard.tsx` or `PrintView.tsx`.

---

## Task 1: Add `iconKey` to the data model and migrate the JSON Schema

**Files:**
- Modify: `src/cards/types.ts`
- Modify: `src/decks/schema.ts`
- Modify: `src/decks/schema.test.ts`
- Regenerate: `supabase/schemas/card-payload.json`
- Create: `supabase/migrations/20260430081056_add_iconkey_to_cards.sql`

- [ ] **Step 1: Write failing test for the schema accepting `iconKey`**

In `src/decks/schema.test.ts`, add inside the `describe("itemCardSchema", …)` block:

```tsx
test("accepts an item card with an iconKey", () => {
  const card = {
    id: "abc",
    kind: "item" as const,
    name: "Bag of Holding",
    typeLine: "Wondrous item, uncommon",
    body: "Big bag.",
    source: "custom" as const,
    iconKey: "trident",
    createdAt: "2026-04-19T00:00:00.000Z",
    updatedAt: "2026-04-19T00:00:00.000Z",
  };
  expect(itemCardSchema.safeParse(card).success).toBe(true);
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Ask the user before running tests. Then:
```
npx vitest run src/decks/schema.test.ts -t "iconKey"
```
Expected: FAIL — Zod rejects `iconKey` as an unrecognized key.

- [ ] **Step 3: Add `iconKey` to `BaseCard` and the Zod schema**

In `src/cards/types.ts`, edit `BaseCard`:

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
  iconKey?: string;
};
```

In `src/decks/schema.ts`, edit `baseCardSchema`:

```ts
const baseCardSchema = z.object({
  id: z.string(),
  name: z.string(),
  body: z.string(),
  imageUrl: z.string().optional(),
  source: z.enum(["custom", "api"]),
  apiRef: apiRefSchema.optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  iconKey: z.string().optional(),
});
```

- [ ] **Step 4: Run the test and confirm it passes**

```
npx vitest run src/decks/schema.test.ts -t "iconKey"
```
Expected: PASS.

- [ ] **Step 5: Regenerate the JSON Schema artifact**

Ask the user before running scripts. Then:
```
npm run gen:schema
```
Expected: writes `supabase/schemas/card-payload.json`. The diff should add `"iconKey": { "type": "string" }` to each of the three `oneOf` branches' `properties`. The `required` arrays are unchanged.

Verify the diff looks correct:
```
git diff supabase/schemas/card-payload.json
```

- [ ] **Step 6: Create the new migration**

Read `supabase/migrations/20260426000001_jsonschema.sql` and copy it to `supabase/migrations/20260430081056_add_iconkey_to_cards.sql`. Replace the embedded JSON Schema (between the `$cardpayload$` markers) with the contents of the regenerated `supabase/schemas/card-payload.json`. Update the leading comment block to:

```sql
-- 20260430081056_add_iconkey_to_cards.sql
-- Re-issue cards_payload_valid with iconKey allowed on every card variant.
--
-- The embedded JSON Schema below is generated from src/decks/schema.ts via
-- `npm run gen:schema`. To update it, regenerate the JSON file and write a
-- NEW migration that follows the same drop-then-add pattern below — never
-- edit this file in place.
```

The rest of the migration body — `drop constraint if exists`, `add constraint`, `comment on constraint` — stays identical. Only the schema body and the header comment change.

- [ ] **Step 7: Run schema-drift check**

Ask the user. Then:
```
npm run check:schema
```
Expected: `No drift in supabase/schemas/card-payload.json`.

- [ ] **Step 8: Run the full test suite**

Ask the user. Then:
```
npx vitest run
```
Expected: PASS. No existing tests should regress — `iconKey` is optional everywhere.

- [ ] **Step 9: Commit**

```
git add src/cards/types.ts src/decks/schema.ts src/decks/schema.test.ts supabase/schemas/card-payload.json supabase/migrations/20260430081056_add_iconkey_to_cards.sql
git commit -m "Add iconKey field to BaseCard and migrate JSON Schema"
```

---

## Task 2: Install Iconify dependencies

**Files:**
- Modify: `package.json` and `package-lock.json` (via `npm install`)

- [ ] **Step 1: Install runtime deps**

Ask the user. Then:
```
npm install @iconify/react@^6 @iconify-json/game-icons
```
Expected: both packages added to `dependencies` in `package.json`. `node_modules/@iconify` and `node_modules/@iconify-json/game-icons` exist.

- [ ] **Step 2: Sanity check the resolver**

Quickly verify the imports work (Read tool, no command). Ask:
```
node --input-type=module -e "import('@iconify-json/game-icons/icons.json', { with: { type: 'json' } }).then(m => console.log(Object.keys(m.default).slice(0,3), 'icon count:', Object.keys(m.default.icons).length))"
```
Expected: prints `[ 'prefix', 'icons', 'aliases' ]` (or similar) and an icon count near 4000. Confirms the JSON file imports as a default with `prefix` and `icons` map. (The package's *named* top-level exports also expose these, but we use the JSON entry point for consumer code because it's the IconifyJSON shape.)

- [ ] **Step 3: Commit**

```
git add package.json package-lock.json
git commit -m "Add Iconify dependencies for game-icons"
```

---

## Task 3: Build the rendering primitives — `curatedIcons`, `resolveIcon`, `IconPreview`

**Files:**
- Create: `src/cards/curatedIcons.ts`
- Create: `src/cards/curatedIcons.test.ts`
- Create: `src/cards/resolveIcon.tsx`
- Create: `src/cards/resolveIcon.test.tsx`
- Create: `src/lib/ui/IconPreview.tsx`
- Create: `src/lib/ui/IconPreview.module.css`
- Create: `src/lib/ui/IconPreview.test.tsx`

- [ ] **Step 1: Define the curated key list**

Create `src/cards/curatedIcons.ts`:

```ts
export const CURATED_ICONS: readonly string[] = [
  // Weapons
  "broadsword",
  "battle-axe",
  "war-hammer",
  "trident",
  "bow-arrow",
  "crossbow",
  "dagger-knife",
  "spear-hook",
  "scythe",
  "flail",
  "mace-head",
  "halberd",
  "scimitar",
  "wood-club",
  "whip",
  "lance",
  "throwing-knife",
  "winged-scepter",
  "bowie-knife",
  "katana",
  // Armor
  "shield",
  "checked-shield",
  "barbute",
  "visored-helm",
  "chest-armor",
  "chain-mail",
  "leather-armor",
  "gauntlet",
  "cape",
  "boots",
  // Magic items
  "ring",
  "diamond-ring",
  "gem-pendant",
  "crystal-cluster",
  "wizard-staff",
  "magic-swirl",
  "scroll-unfurled",
  "spell-book",
  "crystal-ball",
  "magic-lamp",
  "amulet",
  "ankh",
  "rune-stone",
  "magic-portal",
  "magic-shield",
  // Consumables
  "potion-ball",
  "round-bottom-flask",
  "drink-me",
  "bottle-vapors",
  "oil-bottle",
  "meat",
  "bread",
  "fruit",
  "honey-jar",
  "fizzing-flask",
  // Ammunition
  "arrow-cluster",
  "high-shot",
  "stone-bullets",
  "thrown-spear",
  // Tools
  "lockpicks",
  "magnifying-glass",
  "rope-coil",
  "hand-saw",
  "anvil",
  "fishing-pole",
  "shovel",
  "lantern-flame",
  "torch",
  "compass",
  // Magical effects
  "fire-flower",
  "ice-cube",
  "lightning-bolt",
  "holy-symbol",
  "skull-crossed-bones",
  "evil-eyes",
  "moon",
  "sun",
  "snowflake-1",
  "tornado",
  // Creature parts
  "dragon-head",
  "wolf-head",
  "claws",
  "fangs",
  "horns-skull",
  // Containers
  "knapsack",
  "swap-bag",
  "locked-chest",
  "stash",
  "crystal-shrine",
] as const;

export type CuratedIconKey = (typeof CURATED_ICONS)[number];

export function isCurated(key: string): key is CuratedIconKey {
  return (CURATED_ICONS as readonly string[]).includes(key);
}
```

> Note for the executor: this list is a **starting point**. Some keys may not exist in the current `@iconify-json/game-icons` data — Step 2's test will fail for any that don't. When that happens, replace the bad entry with a real one from the collection. Use `Object.keys(require('@iconify-json/game-icons').icons).filter(k => k.includes('hammer'))` style queries to find substitutes.

- [ ] **Step 2: Write the curated-key validity test**

Create `src/cards/curatedIcons.test.ts`:

```ts
import gameIcons from "@iconify-json/game-icons/icons.json";
import { describe, expect, test } from "vitest";
import { CURATED_ICONS } from "./curatedIcons";

describe("CURATED_ICONS", () => {
  test("every entry exists in @iconify-json/game-icons", () => {
    const available = new Set(Object.keys(gameIcons.icons));
    const missing = CURATED_ICONS.filter((key) => !available.has(key));
    expect(missing).toEqual([]);
  });
});
```

> Note on the import path: `@iconify-json/game-icons` v1.2+ no longer has a default export at the package root — top-level is named exports only. We use the package's JSON entry point (`/icons.json`), which gives us the IconifyJSON shape directly (`{ prefix, icons, aliases? }`). Vite handles JSON imports natively, and `tsconfig.app.json` has `resolveJsonModule: true`.

- [ ] **Step 3: Run the test; fix any missing keys**

Ask the user.
```
npx vitest run src/cards/curatedIcons.test.ts
```
Expected: ideally PASS. If FAIL, the assertion's diff prints the bad keys. For each, find a replacement: spawn a quick node script `node --input-type=module -e "import('@iconify-json/game-icons').then(m => console.log(Object.keys(m.default.icons).filter(k => k.includes('SUBSTRING'))))"` and pick a real one. Update `curatedIcons.ts` and re-run until the test passes. **Do not skip this — every key in the list must be real.**

- [ ] **Step 4: Write `IconPreview` failing test**

Create `src/lib/ui/IconPreview.test.tsx`:

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { IconPreview } from "./IconPreview";

describe("<IconPreview>", () => {
  test("renders an icon for a curated key", async () => {
    render(<IconPreview iconKey="trident" label="trident" />);
    const wrapper = screen.getByLabelText("trident");
    expect(wrapper).toBeInTheDocument();
    await waitFor(() => {
      expect(wrapper.querySelector("svg")).not.toBeNull();
    });
  });

  test("renders without throwing for an unknown key", () => {
    render(<IconPreview iconKey="not-a-real-icon" label="not-a-real-icon" />);
    expect(screen.getByLabelText("not-a-real-icon")).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Verify it fails**

Ask the user.
```
npx vitest run src/lib/ui/IconPreview.test.tsx
```
Expected: FAIL — module not found.

- [ ] **Step 6: Implement `IconPreview`**

Create `src/lib/ui/IconPreview.module.css`:

```css
.preview {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  color: #111;
  border: 1px solid #ddd;
  border-radius: 0.25rem;
}

.sm {
  width: 1.5rem;
  height: 1.5rem;
}

.md {
  width: 2.5rem;
  height: 2.5rem;
}

.preview svg {
  width: 80%;
  height: 80%;
}
```

Create `src/lib/ui/IconPreview.tsx`:

```tsx
import { ResolvedIcon } from "../../cards/resolveIcon";
import styles from "./IconPreview.module.css";

export type IconPreviewSize = "sm" | "md";

type Props = {
  iconKey: string;
  label: string;
  size?: IconPreviewSize;
};

export function IconPreview({ iconKey, label, size = "sm" }: Props) {
  const sizeClass = size === "sm" ? styles.sm : styles.md;
  return (
    <span className={`${styles.preview} ${sizeClass}`} aria-label={label}>
      <ResolvedIcon iconKey={iconKey} />
    </span>
  );
}
```

> Note: `IconPreview` depends on `ResolvedIcon` from the next step. The test in Step 5 will keep failing until `ResolvedIcon` exists. Don't run tests again until Step 9.

- [ ] **Step 7: Write `ResolvedIcon` failing test**

Create `src/cards/resolveIcon.test.tsx`:

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { ResolvedIcon } from "./resolveIcon";

describe("<ResolvedIcon>", () => {
  test("renders a curated icon", async () => {
    render(<ResolvedIcon iconKey="trident" data-testid="ico" />);
    await waitFor(() => {
      expect(screen.getByTestId("ico").querySelector("svg")).not.toBeNull();
    });
  });

  test("renders without crashing for an unknown key", async () => {
    render(<ResolvedIcon iconKey="definitely-not-a-real-icon" data-testid="ico" />);
    await waitFor(() => {
      expect(screen.getByTestId("ico")).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 8: Implement `ResolvedIcon`**

Create `src/cards/resolveIcon.tsx`:

```tsx
import gameIcons from "@iconify-json/game-icons/icons.json";
import { addCollection, Icon, iconLoaded } from "@iconify/react";
import type { IconifyJSON } from "@iconify/types";
import { CURATED_ICONS, isCurated } from "./curatedIcons";

const CURATED_PREFIX = "game-icons";

const curatedCollection: IconifyJSON = {
  prefix: gameIcons.prefix,
  icons: Object.fromEntries(CURATED_ICONS.map((key) => [key, gameIcons.icons[key]])),
};
addCollection(curatedCollection);

let fullSetPromise: Promise<void> | null = null;
export function ensureFullSet(): Promise<void> {
  fullSetPromise ??= import("@iconify-json/game-icons/icons.json").then((m) => {
    addCollection(m.default as IconifyJSON);
  });
  return fullSetPromise;
}

const warned = new Set<string>();

type Props = {
  iconKey: string;
  "data-testid"?: string;
};

export function ResolvedIcon({ iconKey, "data-testid": testId }: Props) {
  if (!isCurated(iconKey)) {
    void ensureFullSet().then(() => {
      if (import.meta.env.DEV && !iconLoaded(`${CURATED_PREFIX}:${iconKey}`) && !warned.has(iconKey)) {
        warned.add(iconKey);
        console.warn(`[ResolvedIcon] Unknown iconKey "${iconKey}" — rendering nothing.`);
      }
    });
  }
  return <Icon icon={`${CURATED_PREFIX}:${iconKey}`} data-testid={testId} />;
}
```

> Note: the dynamic import for the full set also points at `/icons.json` rather than the package root, for the same reason described in the curatedIcons test note. The `as IconifyJSON` cast on the dynamic-import path papers over a slight TS-side type widening from JSON imports — runtime shape is correct.

- [ ] **Step 9: Run tests; verify they pass**

Ask the user.
```
npx vitest run src/cards/resolveIcon.test.tsx src/lib/ui/IconPreview.test.tsx src/cards/curatedIcons.test.ts
```
Expected: PASS.

- [ ] **Step 10: Commit**

```
git add src/cards/curatedIcons.ts src/cards/curatedIcons.test.ts src/cards/resolveIcon.tsx src/cards/resolveIcon.test.tsx src/lib/ui/IconPreview.tsx src/lib/ui/IconPreview.module.css src/lib/ui/IconPreview.test.tsx
git commit -m "Add icon rendering primitives (curated + lazy-full game-icons)"
```

---

## Task 4: Refactor `iconRules` to return kebab keys, expand weapon rules, swap `Card.tsx`

**Files:**
- Modify: `src/cards/iconRules.ts`
- Modify: `src/cards/iconRules.test.ts`
- Modify: `src/cards/Card.tsx`
- Modify: `src/cards/Card.module.css`
- Modify: `src/cards/Card.test.tsx`

This task does the heuristic refactor and the `Card.tsx` swap together because `Card.tsx` is the only consumer of `pickIcon` and changing one without the other breaks the build.

- [ ] **Step 1: Rewrite `iconRules.test.ts` against the new signature**

Replace the entire file contents of `src/cards/iconRules.test.ts` with:

```ts
import { describe, expect, test } from "vitest";
import { itemCardFactory } from "./factories";
import { FALLBACK_ICON_KEY, pickIconKey } from "./iconRules";

describe("pickIconKey", () => {
  test("Trident in the name picks 'trident', not 'broadsword'", () => {
    const card = itemCardFactory.build({ name: "Flame Tongue Trident", typeLine: "Weapon, rare" });
    expect(pickIconKey(card)).toBe("trident");
  });

  test("Axe variants pick 'battle-axe'", () => {
    expect(pickIconKey(itemCardFactory.build({ name: "Battleaxe", typeLine: "" }))).toBe("battle-axe");
    expect(pickIconKey(itemCardFactory.build({ name: "Greataxe of Vorpal", typeLine: "" }))).toBe("battle-axe");
    expect(pickIconKey(itemCardFactory.build({ name: "Handaxe", typeLine: "" }))).toBe("battle-axe");
  });

  test("Hammer variants pick 'war-hammer'", () => {
    expect(pickIconKey(itemCardFactory.build({ name: "Warhammer of Thunder", typeLine: "" }))).toBe("war-hammer");
    expect(pickIconKey(itemCardFactory.build({ name: "Maul +1", typeLine: "" }))).toBe("war-hammer");
  });

  test("Bow variants pick 'bow-arrow' (not the broadsword catch-all)", () => {
    expect(pickIconKey(itemCardFactory.build({ name: "Elven Longbow", typeLine: "" }))).toBe("bow-arrow");
    expect(pickIconKey(itemCardFactory.build({ name: "Shortbow", typeLine: "" }))).toBe("bow-arrow");
  });

  test("Crossbow picks 'crossbow', not 'bow-arrow'", () => {
    expect(pickIconKey(itemCardFactory.build({ name: "Crossbow of Speed", typeLine: "" }))).toBe("crossbow");
  });

  test("Generic weapon catch-all picks 'broadsword'", () => {
    const card = itemCardFactory.build({ name: "Vorpal Sword", typeLine: "Weapon, very rare" });
    expect(pickIconKey(card)).toBe("broadsword");
  });

  test("Armor typeLine picks 'shield'", () => {
    const card = itemCardFactory.build({ name: "Sentinel Shield", typeLine: "Armor (shield), uncommon" });
    expect(pickIconKey(card)).toBe("shield");
  });

  test("Rings typeLine picks 'ring'", () => {
    const card = itemCardFactory.build({ name: "Ring of Protection", typeLine: "Rings, rare" });
    expect(pickIconKey(card)).toBe("ring");
  });

  test("Potion typeLine picks 'potion-ball'", () => {
    const card = itemCardFactory.build({ name: "Potion of Healing", typeLine: "Potions, common" });
    expect(pickIconKey(card)).toBe("potion-ball");
  });

  test("Scroll typeLine picks 'scroll-unfurled'", () => {
    const card = itemCardFactory.build({ name: "Spell Scroll", typeLine: "Scrolls, uncommon" });
    expect(pickIconKey(card)).toBe("scroll-unfurled");
  });

  test("Rod/wand/staff picks 'wizard-staff'", () => {
    expect(pickIconKey(itemCardFactory.build({ name: "Rod of Absorption", typeLine: "Rods, very rare" }))).toBe("wizard-staff");
    expect(pickIconKey(itemCardFactory.build({ name: "Wand of Magic Missiles", typeLine: "Wands, uncommon" }))).toBe("wizard-staff");
    expect(pickIconKey(itemCardFactory.build({ name: "Staff of Power", typeLine: "Staves, very rare" }))).toBe("wizard-staff");
  });

  test("Ammunition typeLine picks 'arrow-cluster'", () => {
    const card = itemCardFactory.build({ name: "Arrow +1", typeLine: "Ammunition, uncommon" });
    expect(pickIconKey(card)).toBe("arrow-cluster");
  });

  test("Wondrous Items falls through to the fallback", () => {
    const card = itemCardFactory.build({ name: "Bag of Holding", typeLine: "Wondrous Items, uncommon" });
    expect(pickIconKey(card)).toBe(FALLBACK_ICON_KEY);
  });

  test("Completely unmatched item falls through to the fallback", () => {
    const card = itemCardFactory.build({ name: "Mysterious Object", typeLine: "" });
    expect(pickIconKey(card)).toBe(FALLBACK_ICON_KEY);
  });

  test("Case-insensitive matching", () => {
    const card = itemCardFactory.build({ name: "POTION OF HEALING", typeLine: "" });
    expect(pickIconKey(card)).toBe("potion-ball");
  });
});
```

- [ ] **Step 2: Run; verify failure**

Ask the user.
```
npx vitest run src/cards/iconRules.test.ts
```
Expected: FAIL — `pickIconKey` and `FALLBACK_ICON_KEY` are not exported.

- [ ] **Step 3: Rewrite `iconRules.ts`**

Replace the entire contents of `src/cards/iconRules.ts` with:

```ts
import type { ItemCard } from "./types";

export type IconRule = {
  pattern: RegExp;
  iconKey: string;
  description: string;
};

export const ICON_RULES: readonly IconRule[] = [
  {
    pattern: /\b(?:axe|battleaxe|greataxe|handaxe|tomahawk|hatchet)\b/i,
    iconKey: "battle-axe",
    description: "axe variants",
  },
  {
    pattern: /\b(?:war ?hammer|maul|sledgehammer)\b/i,
    iconKey: "war-hammer",
    description: "hammer / maul",
  },
  {
    pattern: /\bcrossbow\b/i,
    iconKey: "crossbow",
    description: "crossbow",
  },
  {
    pattern: /\b(?:bow|longbow|shortbow)\b/i,
    iconKey: "bow-arrow",
    description: "bow",
  },
  {
    pattern: /\b(?:trident|spear|polearm|halberd|glaive|pike|lance)\b/i,
    iconKey: "trident",
    description: "polearm / spear",
  },
  {
    pattern: /\b(?:weapons?|sword|blade|dagger|mace|flail|scimitar|rapier|greatsword|longsword|shortsword)\b/i,
    iconKey: "broadsword",
    description: "generic weapon / sword",
  },
  {
    pattern: /\b(?:armor|shield|plate|chainmail|mail|helm|cuirass|gauntlet|bracers)\b/i,
    iconKey: "shield",
    description: "armor / shield / helmet",
  },
  {
    pattern: /\brings?\b/i,
    iconKey: "ring",
    description: "ring",
  },
  {
    pattern: /\b(?:potions?|elixir|philter|oil)\b/i,
    iconKey: "potion-ball",
    description: "potion / elixir",
  },
  {
    pattern: /\bscrolls?\b/i,
    iconKey: "scroll-unfurled",
    description: "scroll",
  },
  {
    pattern: /\b(?:rods?|wands?|staff|staves)\b/i,
    iconKey: "wizard-staff",
    description: "rod / wand / staff",
  },
  {
    pattern: /\b(?:ammunition|arrows?|bolts?|bullets?|darts?)\b/i,
    iconKey: "arrow-cluster",
    description: "ammunition",
  },
];

export const FALLBACK_ICON_KEY = "perspective-dice-six-faces-random";

export function pickIconKey(card: ItemCard): string {
  const haystack = `${card.name} ${card.typeLine}`;
  for (const rule of ICON_RULES) {
    if (rule.pattern.test(haystack)) return rule.iconKey;
  }
  return FALLBACK_ICON_KEY;
}
```

- [ ] **Step 4: Verify the new fallback exists in game-icons**

The `FALLBACK_ICON_KEY` `perspective-dice-six-faces-random` is the spec's placeholder. Confirm it's in `@iconify-json/game-icons`:
```
node --input-type=module -e "import('@iconify-json/game-icons').then(m => console.log('perspective-dice-six-faces-random' in m.default.icons))"
```
Expected: `true`. If `false`, search for an alternative dice/random/question icon (`Object.keys(m.default.icons).filter(k => k.includes('dice'))`) and pick a real one. Update both `FALLBACK_ICON_KEY` in `iconRules.ts` and add the chosen key to `CURATED_ICONS` in `src/cards/curatedIcons.ts`.

- [ ] **Step 5: Run iconRules tests; verify pass**

Ask the user.
```
npx vitest run src/cards/iconRules.test.ts
```
Expected: PASS.

- [ ] **Step 6: Update `Card.test.tsx` for the override path**

Append two tests at the end of the existing `describe("<Card>", …)` block in `src/cards/Card.test.tsx`:

```tsx
test("renders the heuristic-picked icon when iconKey is unset", () => {
  const card = itemCardFactory.build({
    name: "Flame Tongue Trident",
    typeLine: "Weapon, rare",
    imageUrl: undefined,
    iconKey: undefined,
  });
  render(<Card card={card} layout="4-up" />);
  const slot = screen.getByTestId("card-fallback-icon");
  expect(slot.querySelector("svg")).not.toBeNull();
});

test("renders the explicit override icon when iconKey is set", () => {
  const card = itemCardFactory.build({
    name: "Anything",
    typeLine: "",
    imageUrl: undefined,
    iconKey: "trident",
  });
  render(<Card card={card} layout="4-up" />);
  const slot = screen.getByTestId("card-fallback-icon");
  expect(slot.querySelector("svg")).not.toBeNull();
});

test("does not crash for a stale or unknown iconKey", () => {
  const card = itemCardFactory.build({
    name: "X",
    typeLine: "",
    imageUrl: undefined,
    iconKey: "definitely-removed-icon",
  });
  expect(() => render(<Card card={card} layout="4-up" />)).not.toThrow();
});
```

- [ ] **Step 7: Run; verify failure**

Ask the user.
```
npx vitest run src/cards/Card.test.tsx
```
Expected: FAIL — the existing `lucide` import still resolves but the new override-path tests will pass trivially since lucide doesn't read `iconKey`. The point of these tests is to guard the new behavior; they may pass for the wrong reason today. Continue to Step 8 to actually wire the new path.

- [ ] **Step 8: Swap `Card.tsx` to use `pickIconKey` + `ResolvedIcon`**

Replace the entire contents of `src/cards/Card.tsx` with:

```tsx
import { useState } from "react";
import { ResolvedIcon } from "./resolveIcon";
import styles from "./Card.module.css";
import { pickIconKey } from "./iconRules";
import type { ItemCard } from "./types";

export type CardLayout = "4-up" | "2-up";

type Props = {
  card: ItemCard;
  layout: CardLayout;
};

const splitParagraphs = (text: string): string[] =>
  text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

export function Card({ card, layout }: Props) {
  const layoutClass = layout === "4-up" ? styles["four-up"] : styles["two-up"];
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null);

  const showImage = card.imageUrl !== undefined && brokenUrl !== card.imageUrl;
  const iconKey = card.iconKey ?? pickIconKey(card);

  return (
    <div className={`${styles.card} ${layoutClass}`} data-role="card-root">
      {showImage ? (
        <img
          className={styles.image}
          src={card.imageUrl}
          alt=""
          data-testid="card-image"
          onError={() => setBrokenUrl(card.imageUrl ?? null)}
        />
      ) : (
        <div className={styles.fallbackIcon} data-testid="card-fallback-icon" aria-hidden="true">
          <ResolvedIcon iconKey={iconKey} />
        </div>
      )}
      <div className={styles.header}>
        <h3 className={styles.title}>{card.name}</h3>
        <div className={styles.typeLine}>{card.typeLine}</div>
      </div>
      <hr className={styles.divider} />
      <div className={styles.body} data-role="card-body">
        {splitParagraphs(card.body).map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
      {card.costWeight && (
        <div className={styles.footer} data-testid="card-footer">
          {card.costWeight}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 9: Update `Card.module.css` for black-on-white**

In `src/cards/Card.module.css`, change the `.fallbackIcon` rules:

```css
.fallbackIcon {
  position: absolute;
  top: 0.95em;
  right: 0.95em;
  width: 3.5em;
  height: 3.5em;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  color: #111;
}

.fallbackIcon svg {
  width: 85%;
  height: 85%;
}
```

(The `stroke-width: 1.5;` rule is removed — game-icons are filled paths, not strokes. The `color: #666` becomes `#111`. Add `background: #fff`.)

- [ ] **Step 10: Run all card tests**

Ask the user.
```
npx vitest run src/cards/
```
Expected: PASS for all card tests.

- [ ] **Step 11: Commit**

```
git add src/cards/iconRules.ts src/cards/iconRules.test.ts src/cards/Card.tsx src/cards/Card.module.css src/cards/Card.test.tsx
git commit -m "Swap card icon path to game-icons + finer weapon-subtype rules"
```

---

## Task 5: Build `IconPickerDialog`

**Files:**
- Create: `src/lib/ui/IconPickerDialog.tsx`
- Create: `src/lib/ui/IconPickerDialog.module.css`
- Create: `src/lib/ui/IconPickerDialog.test.tsx`

- [ ] **Step 1: Write the failing test for the dialog**

Create `src/lib/ui/IconPickerDialog.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, test } from "vitest";
import { IconPickerDialog } from "./IconPickerDialog";

function Harness({ initial }: { initial: string | undefined }) {
  const [value, setValue] = useState<string | undefined>(initial);
  return (
    <>
      <IconPickerDialog value={value} onChange={setValue} />
      <div data-testid="value">{value === undefined ? "<auto>" : value}</div>
    </>
  );
}

// react-aria-components' GridListItem uses role="row" (not "option").
// Each tile carries the kebab key (or "Auto") as its accessible name via textValue.
const tile = (name: RegExp | string) => screen.getByRole("row", { name });
const queryTile = (name: RegExp | string) => screen.queryByRole("row", { name });

describe("<IconPickerDialog>", () => {
  test("opens on trigger press", async () => {
    render(<Harness initial={undefined} />);
    await userEvent.click(screen.getByRole("button", { name: /pick icon/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  test("selecting the Auto tile sets value to undefined and closes", async () => {
    render(<Harness initial="trident" />);
    await userEvent.click(screen.getByRole("button", { name: /pick icon/i }));
    await userEvent.click(tile(/auto/i));
    expect(screen.getByTestId("value")).toHaveTextContent("<auto>");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("selecting a curated tile sets the kebab key and closes", async () => {
    render(<Harness initial={undefined} />);
    await userEvent.click(screen.getByRole("button", { name: /pick icon/i }));
    await userEvent.click(tile("trident"));
    expect(screen.getByTestId("value")).toHaveTextContent("trident");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("search filters visible tiles", async () => {
    render(<Harness initial={undefined} />);
    await userEvent.click(screen.getByRole("button", { name: /pick icon/i }));
    await userEvent.type(screen.getByRole("searchbox"), "trident");
    expect(tile("trident")).toBeInTheDocument();
    expect(queryTile("broadsword")).not.toBeInTheDocument();
  });

  test("trigger button shows the current key when one is set", () => {
    render(<Harness initial="trident" />);
    expect(screen.getByRole("button", { name: /pick icon.*trident/i })).toBeInTheDocument();
  });

  test("trigger button shows 'Auto' when value is undefined", () => {
    render(<Harness initial={undefined} />);
    expect(screen.getByRole("button", { name: /pick icon.*auto/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run; verify failure**

Ask the user.
```
npx vitest run src/lib/ui/IconPickerDialog.test.tsx
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `IconPickerDialog`**

Create `src/lib/ui/IconPickerDialog.module.css`:

```css
.trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.7rem;
  background: #fff;
  border: 1px solid #bbb;
  border-radius: 0.3rem;
  font: inherit;
  cursor: pointer;
}

.modalOverlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background: #fff;
  border-radius: 0.5rem;
  width: min(720px, 92vw);
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  padding: 1rem;
  gap: 0.75rem;
}

.header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.search {
  flex: 1;
  font: inherit;
  padding: 0.4rem 0.6rem;
  border: 1px solid #bbb;
  border-radius: 0.3rem;
}

.grid {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 0.4rem;
  overflow-y: auto;
  padding: 0.25rem;
}

.tile {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #ddd;
  border-radius: 0.25rem;
  background: #fff;
  color: #111;
  cursor: pointer;
}

.tile[data-focused="true"],
.tile:hover {
  border-color: #444;
}

.autoTile {
  font-size: 0.75rem;
  font-weight: 600;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.loading {
  padding: 1rem;
  text-align: center;
  color: #666;
}
```

Create `src/lib/ui/IconPickerDialog.tsx`:

```tsx
import { listIcons } from "@iconify/react";
import { useState } from "react";
import {
  Button as RACButton,
  Dialog,
  DialogTrigger,
  GridList,
  GridListItem,
  Heading,
  Modal,
  ModalOverlay,
  SearchField,
  Switch,
} from "react-aria-components";
import { CURATED_ICONS } from "../../cards/curatedIcons";
import { ensureFullSet } from "../../cards/resolveIcon";
import { IconPreview } from "./IconPreview";
import styles from "./IconPickerDialog.module.css";

const AUTO_ID = "__auto__";

type Props = {
  value: string | undefined;
  onChange: (next: string | undefined) => void;
};

export function IconPickerDialog({ value, onChange }: Props) {
  const triggerLabel = value ?? "Auto";
  return (
    <DialogTrigger>
      <RACButton className={styles.trigger} aria-label={`Pick icon (currently ${triggerLabel})`}>
        {triggerLabel} ▾
      </RACButton>
      <ModalOverlay className={styles.modalOverlay} isDismissable>
        <Modal>
          <Dialog className={styles.dialog}>
            {({ close }) => (
              <PickerBody
                value={value}
                onChange={(next) => {
                  onChange(next);
                  close();
                }}
                onCancel={close}
              />
            )}
          </Dialog>
        </Modal>
      </ModalOverlay>
    </DialogTrigger>
  );
}

type BodyProps = {
  value: string | undefined;
  onChange: (next: string | undefined) => void;
  onCancel: () => void;
};

function PickerBody({ value, onChange, onCancel }: BodyProps) {
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [loadingFull, setLoadingFull] = useState(false);
  const [fullSetKeys, setFullSetKeys] = useState<readonly string[] | null>(null);

  const dataset = showAll && fullSetKeys ? fullSetKeys : CURATED_ICONS;
  const filtered = search
    ? dataset.filter((k) => k.toLowerCase().includes(search.toLowerCase()))
    : dataset;

  const items: { id: string; label: string }[] = [
    { id: AUTO_ID, label: "Auto" },
    ...filtered.map((k) => ({ id: k, label: k })),
  ];

  const handleSwitchChange = async (next: boolean) => {
    setShowAll(next);
    if (next && !fullSetKeys) {
      setLoadingFull(true);
      await ensureFullSet();
      const all = listIcons("", "game-icons").map((n) => n.replace("game-icons:", ""));
      setFullSetKeys(all);
      setLoadingFull(false);
    }
  };

  return (
    <>
      <Heading slot="title">Pick an icon</Heading>
      <div className={styles.header}>
        <SearchField aria-label="Search icons" value={search} onChange={setSearch}>
          <input className={styles.search} type="search" />
        </SearchField>
        <Switch isSelected={showAll} onChange={handleSwitchChange}>
          Show all
        </Switch>
      </div>
      {loadingFull ? (
        <div className={styles.loading}>Loading…</div>
      ) : (
        <GridList
          aria-label="Icons"
          className={styles.grid}
          items={items}
          selectionMode="single"
          onAction={(key) => {
            const k = String(key);
            onChange(k === AUTO_ID ? undefined : k);
          }}
        >
          {(item) => (
            <GridListItem
              id={item.id}
              textValue={item.label}
              className={`${styles.tile} ${item.id === AUTO_ID ? styles.autoTile : ""}`}
            >
              {item.id === AUTO_ID ? "Auto" : <IconPreview iconKey={item.id} label={item.label} size="sm" />}
            </GridListItem>
          )}
        </GridList>
      )}
      <div className={styles.actions}>
        <RACButton onPress={onCancel}>Cancel</RACButton>
      </div>
    </>
  );
}
```

- [ ] **Step 4: Run picker tests; verify pass**

Ask the user.
```
npx vitest run src/lib/ui/IconPickerDialog.test.tsx
```
Expected: PASS.

> If the role-based queries fail because react-aria's `GridListItem` exposes a different ARIA role than `option`, adjust the queries to match the actual rendered roles. Use `screen.debug()` to inspect, then update the test queries to match. Common alternatives: `role="row"` or `role="gridcell"`.

- [ ] **Step 5: Commit**

```
git add src/lib/ui/IconPickerDialog.tsx src/lib/ui/IconPickerDialog.module.css src/lib/ui/IconPickerDialog.test.tsx
git commit -m "Add IconPickerDialog primitive (grid + search + show-all toggle)"
```

---

## Task 6: Add the Icon form row to `ItemEditor`

**Files:**
- Modify: `src/cards/ItemEditor.tsx`
- Modify: `src/cards/ItemEditor.module.css`
- Modify: `src/cards/ItemEditor.test.tsx`

- [ ] **Step 1: Write failing tests for the form row**

Append to the `describe("<ItemEditor>", …)` block in `src/cards/ItemEditor.test.tsx`:

```tsx
// Picker tile selector — react-aria GridListItem uses role="row".
const tile = (name: RegExp | string) => screen.getByRole("row", { name });

test("Icon row trigger shows 'Auto' when iconKey is unset", () => {
  const card = itemCardFactory.build({ iconKey: undefined });
  render(<Harness initial={card} />);
  expect(screen.getByRole("button", { name: /pick icon.*auto/i })).toBeInTheDocument();
});

test("Icon row trigger shows the explicit key when iconKey is set", () => {
  const card = itemCardFactory.build({ iconKey: "trident" });
  render(<Harness initial={card} />);
  expect(screen.getByRole("button", { name: /pick icon.*trident/i })).toBeInTheDocument();
});

test("Selecting an icon updates the card's iconKey", async () => {
  const card = itemCardFactory.build({ iconKey: undefined });
  const seen: ItemCard[] = [];
  render(<Harness initial={card} onEach={(c) => seen.push(c)} />);

  await userEvent.click(screen.getByRole("button", { name: /pick icon/i }));
  await userEvent.click(tile("trident"));

  expect(seen[seen.length - 1]?.iconKey).toBe("trident");
});

test("Selecting Auto clears the iconKey", async () => {
  const card = itemCardFactory.build({ iconKey: "trident" });
  const seen: ItemCard[] = [];
  render(<Harness initial={card} onEach={(c) => seen.push(c)} />);

  await userEvent.click(screen.getByRole("button", { name: /pick icon/i }));
  await userEvent.click(tile(/auto/i));

  expect(seen[seen.length - 1]?.iconKey).toBeUndefined();
});

test("Auto-pick hint shows the heuristic key when iconKey is unset and rule matches", () => {
  const card = itemCardFactory.build({
    name: "Trident of Fish Command",
    typeLine: "Weapon, rare",
    iconKey: undefined,
  });
  render(<Harness initial={card} />);
  expect(screen.getByText(/auto-picking.*trident/i)).toBeInTheDocument();
});

test("Auto-pick hint hides when iconKey is set", () => {
  const card = itemCardFactory.build({ iconKey: "broadsword" });
  render(<Harness initial={card} />);
  expect(screen.queryByText(/auto-picking/i)).not.toBeInTheDocument();
});

test("Auto-pick hint hides when the heuristic falls back (no meaningful match)", () => {
  const card = itemCardFactory.build({
    name: "Mystery Object",
    typeLine: "Wondrous Items, uncommon",
    iconKey: undefined,
  });
  render(<Harness initial={card} />);
  expect(screen.queryByText(/auto-picking/i)).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run; verify failure**

Ask the user.
```
npx vitest run src/cards/ItemEditor.test.tsx
```
Expected: FAIL.

- [ ] **Step 3: Add the Icon row to `ItemEditor.tsx`**

Replace the entire contents of `src/cards/ItemEditor.tsx` with:

```tsx
import type { ChangeEvent } from "react";
import { nowIso } from "../lib/time";
import { IconPickerDialog } from "../lib/ui/IconPickerDialog";
import { IconPreview } from "../lib/ui/IconPreview";
import { FALLBACK_ICON_KEY, pickIconKey } from "./iconRules";
import styles from "./ItemEditor.module.css";
import type { ItemCard } from "./types";

type Props = {
  card: ItemCard;
  onChange: (next: ItemCard) => void;
};

type EditableField = "name" | "typeLine" | "body" | "costWeight" | "imageUrl";

export function ItemEditor({ card, onChange }: Props) {
  const handle =
    (field: EditableField) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange({ ...card, [field]: e.target.value, updatedAt: nowIso() });
    };

  const handleIconChange = (next: string | undefined) => {
    onChange({ ...card, iconKey: next, updatedAt: nowIso() });
  };

  const resolvedKey = card.iconKey ?? pickIconKey(card);
  const showHint = card.iconKey === undefined && resolvedKey !== FALLBACK_ICON_KEY;

  return (
    <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
      <label className={styles.field}>
        <span className={styles.label}>Name</span>
        <input className={styles.input} value={card.name} onChange={handle("name")} />
      </label>
      <label className={styles.field}>
        <span className={styles.label}>Type line</span>
        <input
          className={styles.input}
          value={card.typeLine}
          onChange={handle("typeLine")}
          placeholder="Wondrous item, uncommon"
        />
      </label>
      <div className={styles.field}>
        <span className={styles.label}>Icon (optional)</span>
        <div className={styles.iconRow}>
          <IconPreview iconKey={resolvedKey} label={resolvedKey} size="sm" />
          <IconPickerDialog value={card.iconKey} onChange={handleIconChange} />
        </div>
        {showHint && <div className={styles.iconHint}>Currently auto-picking: {resolvedKey}</div>}
      </div>
      <label className={styles.field}>
        <span className={styles.label}>Body</span>
        <textarea
          className={styles.textarea}
          value={card.body}
          onChange={handle("body")}
          rows={8}
        />
      </label>
      <label className={styles.field}>
        <span className={styles.label}>Cost / weight (optional)</span>
        <input
          className={styles.input}
          value={card.costWeight ?? ""}
          onChange={handle("costWeight")}
          placeholder="500 gp · 15 lb"
        />
      </label>
      <label className={styles.field}>
        <span className={styles.label}>Image URL (optional)</span>
        <input
          className={styles.input}
          value={card.imageUrl ?? ""}
          onChange={handle("imageUrl")}
          placeholder="https://…"
        />
      </label>
    </form>
  );
}
```

- [ ] **Step 4: Add CSS for the icon row**

Append to `src/cards/ItemEditor.module.css`:

```css
.iconRow {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.iconHint {
  font-size: 0.85rem;
  color: #555;
  margin-top: 0.25rem;
}
```

- [ ] **Step 5: Run; verify pass**

Ask the user.
```
npx vitest run src/cards/ItemEditor.test.tsx
```
Expected: PASS.

- [ ] **Step 6: Commit**

```
git add src/cards/ItemEditor.tsx src/cards/ItemEditor.module.css src/cards/ItemEditor.test.tsx
git commit -m "Add Icon picker row to ItemEditor"
```

---

## Task 7: Build the debugger view at `/debug/icons`

**Files:**
- Create: `src/views/IconDebugView.tsx`
- Create: `src/views/IconDebugView.module.css`
- Create: `src/views/IconDebugView.test.tsx`
- Modify: `src/app/router.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/views/IconDebugView.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";
import { ICON_RULES } from "../cards/iconRules";
import { IconDebugView } from "./IconDebugView";

describe("<IconDebugView>", () => {
  test("renders a row per ICON_RULES entry plus a fallback row", () => {
    render(<IconDebugView />);
    const rows = screen.getAllByRole("row");
    // header row + ICON_RULES.length + fallback row
    expect(rows.length).toBe(1 + ICON_RULES.length + 1);
  });

  test("simulator updates the matched-rule readout when name changes", async () => {
    render(<IconDebugView />);
    const nameInput = screen.getByLabelText(/name/i);
    await userEvent.type(nameInput, "Trident");
    expect(screen.getByTestId("simulator-result")).toHaveTextContent(/trident/i);
  });

  test("simulator falls back when nothing matches", async () => {
    render(<IconDebugView />);
    await userEvent.type(screen.getByLabelText(/name/i), "Xyzzy");
    expect(screen.getByTestId("simulator-result")).toHaveTextContent(/no match/i);
  });
});
```

- [ ] **Step 2: Run; verify failure**

Ask the user.
```
npx vitest run src/views/IconDebugView.test.tsx
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `IconDebugView`**

Create `src/views/IconDebugView.module.css`:

```css
.page {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.simulator {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 0.5rem;
  max-width: 720px;
}

.row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.input {
  flex: 1;
  font: inherit;
  padding: 0.4rem 0.6rem;
  border: 1px solid #bbb;
  border-radius: 0.3rem;
}

.result {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding-top: 0.5rem;
  border-top: 1px solid #eee;
}

.table {
  border-collapse: collapse;
  width: 100%;
  max-width: 960px;
}

.table th,
.table td {
  text-align: left;
  padding: 0.5rem;
  border-bottom: 1px solid #eee;
  vertical-align: middle;
}

.regex {
  font-family: ui-monospace, monospace;
  font-size: 0.85rem;
}
```

Create `src/views/IconDebugView.tsx`:

```tsx
import { useState } from "react";
import { FALLBACK_ICON_KEY, ICON_RULES } from "../cards/iconRules";
import { IconPreview } from "../lib/ui/IconPreview";
import styles from "./IconDebugView.module.css";

function pickRule(name: string, typeLine: string) {
  const haystack = `${name} ${typeLine}`;
  for (let i = 0; i < ICON_RULES.length; i++) {
    if (ICON_RULES[i].pattern.test(haystack)) {
      return { rule: ICON_RULES[i], index: i };
    }
  }
  return null;
}

export function IconDebugView() {
  const [name, setName] = useState("");
  const [typeLine, setTypeLine] = useState("");
  const matched = pickRule(name, typeLine);

  return (
    <div className={styles.page}>
      <h1>Icon picker — debug</h1>

      <section className={styles.simulator}>
        <h2>Simulator</h2>
        <label className={styles.row}>
          <span>Name</span>
          <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className={styles.row}>
          <span>Type line</span>
          <input
            className={styles.input}
            value={typeLine}
            onChange={(e) => setTypeLine(e.target.value)}
          />
        </label>
        <div className={styles.result} data-testid="simulator-result">
          {matched ? (
            <>
              <IconPreview iconKey={matched.rule.iconKey} label={matched.rule.iconKey} size="md" />
              <div>
                rule #{matched.index}: <code>{matched.rule.pattern.source}</code> —{" "}
                {matched.rule.description} → <strong>{matched.rule.iconKey}</strong>
              </div>
            </>
          ) : (
            <>
              <IconPreview iconKey={FALLBACK_ICON_KEY} label={FALLBACK_ICON_KEY} size="md" />
              <div>
                No match → fallback (<strong>{FALLBACK_ICON_KEY}</strong>)
              </div>
            </>
          )}
        </div>
      </section>

      <section>
        <h2>Rules</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>#</th>
              <th>Pattern</th>
              <th>Description</th>
              <th>Icon</th>
            </tr>
          </thead>
          <tbody>
            {ICON_RULES.map((rule, i) => (
              <tr key={rule.iconKey}>
                <td>{i}</td>
                <td className={styles.regex}>{rule.pattern.source}</td>
                <td>{rule.description}</td>
                <td>
                  <IconPreview iconKey={rule.iconKey} label={rule.iconKey} size="md" />
                </td>
              </tr>
            ))}
            <tr>
              <td>(fallback)</td>
              <td className={styles.regex}>—</td>
              <td>no match → fallback</td>
              <td>
                <IconPreview iconKey={FALLBACK_ICON_KEY} label={FALLBACK_ICON_KEY} size="md" />
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Register the route**

In `src/app/router.tsx`, add the import:

```ts
import { IconDebugView } from "../views/IconDebugView";
```

Add a route definition before `routeTree`:

```ts
const iconDebugRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/debug/icons",
  component: IconDebugView,
});
```

Add `iconDebugRoute` to the `routeTree.addChildren([…])` array.

- [ ] **Step 5: Run; verify pass**

Ask the user.
```
npx vitest run src/views/IconDebugView.test.tsx
```
Expected: PASS.

- [ ] **Step 6: Commit**

```
git add src/views/IconDebugView.tsx src/views/IconDebugView.module.css src/views/IconDebugView.test.tsx src/app/router.tsx
git commit -m "Add /debug/icons route with rule simulator and table"
```

---

## Task 8: Manual smoke test and final cleanup

**Files:**
- Possibly small fixes anywhere; otherwise no changes.

- [ ] **Step 1: Run the full test suite**

Ask the user.
```
npx vitest run
```
Expected: PASS, no regressions.

- [ ] **Step 2: Run lint and typecheck**

Ask the user.
```
npm run lint
```
Expected: clean. If Biome rewrites anything, accept the reformatting.

```
npx tsc -b
```
Expected: no type errors.

- [ ] **Step 3: Build, watch for bundle warnings**

Ask the user.
```
npm run build
```
Expected: success. Check the build output for the `@iconify-json/game-icons` chunk size — if it's surprisingly large (>2 MB gzipped), flag this in the smoke report. Otherwise no action.

- [ ] **Step 4: Manual smoke (dev server)**

Ask the user.
```
npm run dev
```

Walk through these flows and confirm each works:

1. **Fresh deck — heuristic icons render with new game-icons styling.** Open an existing deck (or create one + add a few items via the dnd5eapi browser). Cards in the deck show black-on-white game-icons in the corner instead of the old lucide line icons. A weapon item (e.g. a flame tongue) shows the broadsword glyph; a trident shows the trident glyph; a potion shows the potion-ball glyph.

2. **Editor — icon row visible.** Click an item to edit. The "Icon (optional)" row appears between "Type line" and "Body." The chip on the left shows the current resolved icon. The trigger button shows "Auto" (or the kebab key if overridden).

3. **Picker — curated grid + search.** Click the trigger. The dialog opens. The grid is 10 wide. Hover a tile — the kebab key shows in the tooltip. Type "axe" in the search — only axe-like icons remain.

4. **Picker — Show all toggle.** Flip the switch. After a brief pause (chunk loading), the grid expands to ~4000 icons. Search still works. Selecting an icon outside the curated set commits a kebab key, the dialog closes, the chip updates.

5. **Auto.** Click the trigger again. Click "Auto." The dialog closes. The form trigger now shows "Auto" again. The "Currently auto-picking: …" hint reappears (when the heuristic finds a match — try with a name like "Sword").

6. **Persistence.** Save the card. Reload the page. The override survives; the card still renders with the chosen icon.

7. **Stale-key resilience.** In dev tools, manually edit a card's row in Supabase to set `payload.iconKey = "definitely-removed-icon"`. Reload the deck. The card renders, no crash. Console shows the dev warning. (Optional — only if you have direct DB access set up.)

8. **Debugger page.** Visit `/debug/icons`. The simulator renders. Type "trident" in Name — the matched rule appears, with an icon preview. The full rules table renders below.

9. **Print.** From the deck view, click Print. The print preview shows cards with their game-icons in the corner. No editor chrome leaks through.

- [ ] **Step 5: Final commit (only if smoke test surfaced fixes)**

If anything needed adjusting during smoke:
```
git add -A
git commit -m "Polish from smoke test"
```

Otherwise nothing to commit.

---

## Self-review checklist

Before considering this plan finished, verify:

- ✓ Every spec section is covered by a task above.
- ✓ No "TBD," "TODO," or "implement later" markers in the steps.
- ✓ Type names and function names are consistent across tasks (`pickIconKey`, `ResolvedIcon`, `IconPickerDialog`, `IconPreview`, `CURATED_ICONS`, `FALLBACK_ICON_KEY`).
- ✓ Each task ends with a commit.
- ✓ Tests are written before implementation in each task.
- ✓ No task asks the executor to push, open a PR, or make destructive git operations.
- ✓ All file paths are absolute relative to repo root.
- ✓ Off-limits files only modified per the explicit authorization in the header.

## Risks the executor should watch for

- **Curated keys not in `@iconify-json/game-icons`.** Task 3 Step 3 has explicit instructions for handling this. Don't skip the curated-validity test.
- **`react-aria-components` ARIA roles for `GridListItem`.** Test queries assume `role="option"`. If actual roles differ, adjust tests rather than the component.
- **`@iconify-json/game-icons` collection structure.** The code assumes `default.icons` is the icon map and `default.prefix === "game-icons"`. If the package shape differs, Task 3 Step 2's sanity check will reveal it.
- **Vite HMR + dynamic import caching.** During dev, after changing `CURATED_ICONS`, hard-refresh — the lazy chunk may stick around in HMR memory.
- **Bundle size.** Note the `@iconify-json/game-icons` chunk size from `npm run build`. If unexpectedly large, surface it; the spec marks this as a check item.
