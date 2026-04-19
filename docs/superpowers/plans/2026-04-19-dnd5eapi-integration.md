# dnd5eapi Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the phase-2 "browse magic items from dnd5eapi" slice from [`docs/superpowers/specs/2026-04-19-dnd5eapi-integration-design.md`](../specs/2026-04-19-dnd5eapi-integration-design.md). Users click **Browse from API** on the deck view, see a modal with a 2024/2014 ruleset toggle + search, and selecting an item creates a card and drops them into the editor.

**Architecture:** A thin `apiClient` → typed endpoint fetchers → TanStack Query hooks (cached 24h, keyed by ruleset+slug) → pure mappers to `ItemCard`. The modal consumes only the hooks + mappers. MSW intercepts network in tests. All new code lives under `src/api/` and one new view file; existing code is extended with a button and a schema field.

**Tech Stack:** `@tanstack/react-query`, `msw` (tests), existing stack (Vite, React, TypeScript, Zod, Zustand, Vitest, RTL, Fishery + faker, Biome).

**Conventions used in every task:**
- TDD where feasible: failing test → confirm red → minimal impl → confirm green → commit.
- Every commit uses the Co-Authored-By footer.
- Tests live next to the module (`foo.ts` + `foo.test.ts`).
- Factories produce valid data by default; tests only override fields they assert on.

---

## Task 1: Install TanStack Query + MSW

**Files:**
- Modify: `package.json`, `package-lock.json`.

- [ ] **Step 1: Install runtime + test deps**

```bash
npm install @tanstack/react-query
npm install -D msw
```

- [ ] **Step 2: Verify install**

```bash
npm run build
```
Expected: build still succeeds.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "$(cat <<'EOF'
Add @tanstack/react-query and msw

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Extend `apiRef` schema with ruleset

**Files:**
- Modify: `src/cards/types.ts`
- Modify: `src/deck/schema.ts`
- Modify: `src/deck/schema.test.ts` (add a new test)

- [ ] **Step 1: Write the failing schema test**

Append to `src/deck/schema.test.ts` inside `describe("itemCardSchema")`:
```ts
  test("accepts an item card with a 2024 apiRef", () => {
    const card = {
      id: "abc",
      kind: "item" as const,
      name: "Bag of Holding",
      typeLine: "Wondrous item, uncommon",
      body: "Big bag.",
      source: "api" as const,
      apiRef: { system: "dnd5eapi" as const, slug: "bag-of-holding", ruleset: "2024" as const },
      createdAt: "2026-04-19T00:00:00.000Z",
      updatedAt: "2026-04-19T00:00:00.000Z",
    };
    expect(itemCardSchema.safeParse(card).success).toBe(true);
  });

  test("accepts an item card with a 2014 apiRef", () => {
    const card = {
      id: "abc",
      kind: "item" as const,
      name: "Bag of Holding",
      typeLine: "Wondrous item, uncommon",
      body: "Big bag.",
      source: "api" as const,
      apiRef: { system: "dnd5eapi" as const, slug: "bag-of-holding", ruleset: "2014" as const },
      createdAt: "2026-04-19T00:00:00.000Z",
      updatedAt: "2026-04-19T00:00:00.000Z",
    };
    expect(itemCardSchema.safeParse(card).success).toBe(true);
  });

  test("rejects an apiRef without a ruleset", () => {
    const card = {
      id: "abc",
      kind: "item" as const,
      name: "X",
      typeLine: "",
      body: "",
      source: "api" as const,
      apiRef: { system: "dnd5eapi" as const, slug: "x" },
      createdAt: "2026-04-19T00:00:00.000Z",
      updatedAt: "2026-04-19T00:00:00.000Z",
    };
    expect(itemCardSchema.safeParse(card).success).toBe(false);
  });
```

- [ ] **Step 2: Run — expect 3 failures**

```bash
npm test -- schema
```
Expected: 3 tests fail (apiRef missing ruleset in Zod schema, or rejects valid ruleset).

- [ ] **Step 3: Update the Zod schema**

In `src/deck/schema.ts`, replace the `apiRefSchema`:
```ts
const apiRefSchema = z.object({
  system: z.literal("dnd5eapi"),
  slug: z.string(),
  ruleset: z.enum(["2014", "2024"]),
});
```

- [ ] **Step 4: Update the TypeScript type**

In `src/cards/types.ts`, update `BaseCard`:
```ts
  apiRef?: { system: "dnd5eapi"; slug: string; ruleset: "2014" | "2024" };
```

- [ ] **Step 5: Run — expect pass**

```bash
npm test -- schema
```
Expected: all schema tests pass.

- [ ] **Step 6: Type-check + lint**

```bash
npx tsc --noEmit -p tsconfig.app.json && npm run lint
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
Add ruleset field to apiRef

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: `apiClient` — fetch wrapper

**Files:**
- Create: `src/api/apiClient.ts`, `src/api/apiClient.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/api/apiClient.test.ts
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { apiGet, type ApiError } from "./apiClient";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("apiGet", () => {
  test("calls the dnd5eapi base URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    globalThis.fetch = fetchMock as typeof fetch;

    await apiGet("/api/2024/magic-items");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://www.dnd5eapi.co/api/2024/magic-items",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  test("returns the parsed JSON body on 200", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ count: 5 }), { status: 200 }),
    ) as typeof fetch;

    const data = await apiGet<{ count: number }>("/api/2024/magic-items");
    expect(data).toEqual({ count: 5 });
  });

  test("throws a typed ApiError on 404", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response("Not found", { status: 404 }),
    ) as typeof fetch;

    await expect(apiGet("/api/2024/magic-items/nope")).rejects.toMatchObject({
      status: 404,
    } satisfies Partial<ApiError>);
  });

  test("throws a typed ApiError on network failure", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch")) as typeof fetch;

    await expect(apiGet("/api/2024/magic-items")).rejects.toMatchObject({
      status: "network",
    } satisfies Partial<ApiError>);
  });
});
```

- [ ] **Step 2: Run — expect failure**

```bash
npm test -- apiClient
```
Expected: module not found.

- [ ] **Step 3: Implement the client**

```ts
// src/api/apiClient.ts
const BASE_URL = "https://www.dnd5eapi.co";
const TIMEOUT_MS = 10_000;

export type ApiError = {
  status: number | "network" | "timeout";
  message: string;
};

export async function apiGet<T>(path: string): Promise<T> {
  const url = `${BASE_URL}${path}`;
  let response: Response;
  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      throw { status: "timeout", message: `Request to ${path} timed out` } as ApiError;
    }
    throw {
      status: "network",
      message: err instanceof Error ? err.message : String(err),
    } as ApiError;
  }
  if (!response.ok) {
    throw {
      status: response.status,
      message: `${response.status} ${response.statusText}`,
    } as ApiError;
  }
  return (await response.json()) as T;
}
```

- [ ] **Step 4: Run — expect pass**

```bash
npm test -- apiClient
```
Expected: 4 passed.

- [ ] **Step 5: Type-check, lint, commit**

```bash
npx tsc --noEmit -p tsconfig.app.json && npm run lint:fix && npm run lint
git add -A
git commit -m "$(cat <<'EOF'
Add thin fetch wrapper for dnd5eapi

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Magic-items endpoint types + fetchers

**Files:**
- Create: `src/api/endpoints/magicItems.ts`, `src/api/endpoints/magicItems.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/api/endpoints/magicItems.test.ts
import { afterEach, describe, expect, test, vi } from "vitest";
import { fetchMagicItemDetail, fetchMagicItemIndex } from "./magicItems";

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("fetchMagicItemIndex", () => {
  test("hits /api/2024/magic-items when ruleset is 2024", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ count: 0, results: [] }), { status: 200 }),
    );
    globalThis.fetch = fetchMock as typeof fetch;

    await fetchMagicItemIndex("2024");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://www.dnd5eapi.co/api/2024/magic-items",
      expect.anything(),
    );
  });

  test("hits /api/2014/magic-items when ruleset is 2014", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ count: 0, results: [] }), { status: 200 }),
    );
    globalThis.fetch = fetchMock as typeof fetch;

    await fetchMagicItemIndex("2014");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://www.dnd5eapi.co/api/2014/magic-items",
      expect.anything(),
    );
  });
});

describe("fetchMagicItemDetail", () => {
  test("hits the right path and tags response with ruleset", async () => {
    const raw = {
      index: "bag-of-holding",
      name: "Bag of Holding",
      equipment_category: { index: "wondrous-items", name: "Wondrous Items", url: "" },
      rarity: { name: "Uncommon" },
      attunement: false,
      desc: "Wondrous Item  \n A big bag.",
      variants: [],
      variant: false,
    };
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(raw), { status: 200 }),
    );
    globalThis.fetch = fetchMock as typeof fetch;

    const result = await fetchMagicItemDetail("2024", "bag-of-holding");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://www.dnd5eapi.co/api/2024/magic-items/bag-of-holding",
      expect.anything(),
    );
    expect(result.ruleset).toBe("2024");
    expect(result.name).toBe("Bag of Holding");
  });
});
```

- [ ] **Step 2: Run — expect failure**

```bash
npm test -- endpoints/magicItems
```

- [ ] **Step 3: Implement the endpoint module**

```ts
// src/api/endpoints/magicItems.ts
import { apiGet } from "../apiClient";

export type Ruleset = "2014" | "2024";

export type MagicItemIndexEntry = {
  index: string;
  name: string;
  url: string;
};

export type MagicItemIndex = {
  count: number;
  results: MagicItemIndexEntry[];
};

export type EquipmentCategoryRef = {
  index: string;
  name: string;
  url: string;
};

type MagicItemDetail2024Raw = {
  index: string;
  name: string;
  equipment_category: EquipmentCategoryRef;
  rarity: { name: string };
  attunement: boolean;
  desc: string;
  image?: string;
  variants: unknown[];
  variant: boolean;
};

type MagicItemDetail2014Raw = {
  index: string;
  name: string;
  equipment_category: EquipmentCategoryRef;
  rarity: { name: string };
  desc: string[];
  image?: string;
  variants: unknown[];
  variant: boolean;
};

export type MagicItemDetail2024 = MagicItemDetail2024Raw & { ruleset: "2024" };
export type MagicItemDetail2014 = MagicItemDetail2014Raw & { ruleset: "2014" };
export type MagicItemDetail = MagicItemDetail2014 | MagicItemDetail2024;

export const fetchMagicItemIndex = (ruleset: Ruleset): Promise<MagicItemIndex> =>
  apiGet<MagicItemIndex>(`/api/${ruleset}/magic-items`);

export const fetchMagicItemDetail = async (
  ruleset: Ruleset,
  slug: string,
): Promise<MagicItemDetail> => {
  if (ruleset === "2024") {
    const raw = await apiGet<MagicItemDetail2024Raw>(`/api/2024/magic-items/${slug}`);
    return { ...raw, ruleset: "2024" };
  }
  const raw = await apiGet<MagicItemDetail2014Raw>(`/api/2014/magic-items/${slug}`);
  return { ...raw, ruleset: "2014" };
};
```

- [ ] **Step 4: Run — expect pass**

```bash
npm test -- endpoints/magicItems
```

- [ ] **Step 5: TS + lint + commit**

```bash
npx tsc --noEmit -p tsconfig.app.json && npm run lint:fix && npm run lint
git add -A
git commit -m "$(cat <<'EOF'
Add magic-items endpoint fetchers with ruleset-tagged responses

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Factories for API responses

**Files:**
- Create: `src/api/factories.ts`, `src/api/factories.test.ts`

- [ ] **Step 1: Write the failing factory tests**

```ts
// src/api/factories.test.ts
import { describe, expect, test } from "vitest";
import {
  magicItemDetail2014Factory,
  magicItemDetail2024Factory,
  magicItemIndexEntryFactory,
  magicItemIndexFactory,
} from "./factories";

describe("magicItemIndexEntryFactory", () => {
  test("produces unique indices across builds", () => {
    const a = magicItemIndexEntryFactory.build();
    const b = magicItemIndexEntryFactory.build();
    expect(a.index).not.toBe(b.index);
  });
});

describe("magicItemIndexFactory", () => {
  test("count equals results length", () => {
    const idx = magicItemIndexFactory.build({}, { transient: { size: 5 } });
    expect(idx.results).toHaveLength(5);
    expect(idx.count).toBe(5);
  });
});

describe("magicItemDetail2024Factory", () => {
  test("tags the response with ruleset '2024'", () => {
    expect(magicItemDetail2024Factory.build().ruleset).toBe("2024");
  });
});

describe("magicItemDetail2014Factory", () => {
  test("tags the response with ruleset '2014' and provides a desc array", () => {
    const d = magicItemDetail2014Factory.build();
    expect(d.ruleset).toBe("2014");
    expect(Array.isArray(d.desc)).toBe(true);
  });
});
```

- [ ] **Step 2: Run — expect failure**

```bash
npm test -- api/factories
```

- [ ] **Step 3: Implement the factories**

```ts
// src/api/factories.ts
import { faker } from "@faker-js/faker";
import { Factory } from "fishery";
import type {
  MagicItemDetail2014,
  MagicItemDetail2024,
  MagicItemIndex,
  MagicItemIndexEntry,
} from "./endpoints/magicItems";

const rarities = ["Common", "Uncommon", "Rare", "Very Rare", "Legendary"];
const categories = [
  { index: "wondrous-items", name: "Wondrous Items" },
  { index: "rings", name: "Rings" },
  { index: "rods", name: "Rods" },
  { index: "weapons", name: "Weapons" },
];

export const magicItemIndexEntryFactory = Factory.define<MagicItemIndexEntry>(() => {
  const slug = faker.helpers.slugify(faker.commerce.productName()).toLowerCase();
  return {
    index: `${slug}-${faker.string.alphanumeric(5)}`,
    name: faker.commerce.productName(),
    url: `/api/2024/magic-items/${slug}`,
  };
});

type MagicItemIndexTransient = { size: number };

export const magicItemIndexFactory = Factory.define<
  MagicItemIndex,
  MagicItemIndexTransient
>(({ transientParams }) => {
  const size = transientParams.size ?? 3;
  const results = magicItemIndexEntryFactory.buildList(size);
  return { count: results.length, results };
});

export const magicItemDetail2024Factory = Factory.define<MagicItemDetail2024>(() => {
  const category = faker.helpers.arrayElement(categories);
  const slug = faker.helpers.slugify(faker.commerce.productName()).toLowerCase();
  return {
    ruleset: "2024",
    index: slug,
    name: faker.commerce.productName(),
    equipment_category: { ...category, url: `/api/2024/equipment-categories/${category.index}` },
    rarity: { name: faker.helpers.arrayElement(rarities) },
    attunement: faker.datatype.boolean(),
    desc: `${category.name}  \n ${faker.lorem.paragraph()}`,
    image: `/api/images/magic-items/${slug}.png`,
    variants: [],
    variant: false,
  };
});

export const magicItemDetail2014Factory = Factory.define<MagicItemDetail2014>(() => {
  const category = faker.helpers.arrayElement(categories);
  const rarity = faker.helpers.arrayElement(rarities);
  const slug = faker.helpers.slugify(faker.commerce.productName()).toLowerCase();
  return {
    ruleset: "2014",
    index: slug,
    name: faker.commerce.productName(),
    equipment_category: { ...category, url: `/api/2014/equipment-categories/${category.index}` },
    rarity: { name: rarity },
    desc: [
      `${category.name.slice(0, -1)}, ${rarity.toLowerCase()}`,
      faker.lorem.paragraph(),
      faker.lorem.paragraph(),
    ],
    image: `/api/images/magic-items/${slug}.png`,
    variants: [],
    variant: false,
  };
});
```

- [ ] **Step 4: Run — expect pass**

```bash
npm test -- api/factories
```

- [ ] **Step 5: TS + lint + commit**

```bash
npx tsc --noEmit -p tsconfig.app.json && npm run lint:fix && npm run lint
git add -A
git commit -m "$(cat <<'EOF'
Add API response factories for magic items

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Mappers (API detail → ItemCard)

**Files:**
- Create: `src/api/mappers/magicItems.ts`, `src/api/mappers/magicItems.test.ts`

- [ ] **Step 1: Write the failing mapper tests**

```ts
// src/api/mappers/magicItems.test.ts
import { describe, expect, test } from "vitest";
import { itemCardSchema } from "../../deck/schema";
import { magicItemDetail2014Factory, magicItemDetail2024Factory } from "../factories";
import { magicItemDetailToCard } from "./magicItems";

describe("magicItemDetailToCard — 2024", () => {
  test("output is a valid ItemCard", () => {
    const detail = magicItemDetail2024Factory.build();
    const card = magicItemDetailToCard(detail);
    expect(itemCardSchema.safeParse(card).success).toBe(true);
  });

  test("composes typeLine from category + rarity", () => {
    const detail = magicItemDetail2024Factory.build({
      equipment_category: {
        index: "wondrous-items",
        name: "Wondrous Items",
        url: "",
      },
      rarity: { name: "Uncommon" },
      attunement: false,
    });
    const card = magicItemDetailToCard(detail);
    expect(card.typeLine).toBe("Wondrous Items, uncommon");
  });

  test("adds attunement suffix when attunement is true", () => {
    const detail = magicItemDetail2024Factory.build({
      equipment_category: { index: "rings", name: "Rings", url: "" },
      rarity: { name: "Rare" },
      attunement: true,
    });
    const card = magicItemDetailToCard(detail);
    expect(card.typeLine).toBe("Rings, rare (requires attunement)");
  });

  test("carries through source + apiRef with ruleset", () => {
    const detail = magicItemDetail2024Factory.build({ index: "bag-of-holding" });
    const card = magicItemDetailToCard(detail);
    expect(card.source).toBe("api");
    expect(card.apiRef).toEqual({
      system: "dnd5eapi",
      slug: "bag-of-holding",
      ruleset: "2024",
    });
  });

  test("builds an absolute imageUrl when image is present", () => {
    const detail = magicItemDetail2024Factory.build({
      image: "/api/images/magic-items/bag-of-holding.png",
    });
    const card = magicItemDetailToCard(detail);
    expect(card.imageUrl).toBe("https://www.dnd5eapi.co/api/images/magic-items/bag-of-holding.png");
  });
});

describe("magicItemDetailToCard — 2014", () => {
  test("output is a valid ItemCard", () => {
    const detail = magicItemDetail2014Factory.build();
    const card = magicItemDetailToCard(detail);
    expect(itemCardSchema.safeParse(card).success).toBe(true);
  });

  test("joins desc array with blank-line separators for body", () => {
    const detail = magicItemDetail2014Factory.build({
      desc: ["line A", "line B", "line C"],
    });
    const card = magicItemDetailToCard(detail);
    expect(card.body).toBe("line A\n\nline B\n\nline C");
  });

  test("detects requires-attunement from desc[0]", () => {
    const detail = magicItemDetail2014Factory.build({
      equipment_category: { index: "rings", name: "Rings", url: "" },
      rarity: { name: "Rare" },
      desc: ["Ring, rare (requires attunement)", "body"],
    });
    const card = magicItemDetailToCard(detail);
    expect(card.typeLine).toBe("Rings, rare (requires attunement)");
  });
});
```

- [ ] **Step 2: Run — expect failure**

```bash
npm test -- mappers/magicItems
```

- [ ] **Step 3: Implement the mapper**

```ts
// src/api/mappers/magicItems.ts
import type { ItemCard } from "../../cards/types";
import { newId } from "../../lib/id";
import { nowIso } from "../../lib/time";
import type { MagicItemDetail } from "../endpoints/magicItems";

const IMAGE_BASE = "https://www.dnd5eapi.co";

const composeTypeLine = (category: string, rarity: string, attunement: boolean): string => {
  const base = `${category}, ${rarity.toLowerCase()}`;
  return attunement ? `${base} (requires attunement)` : base;
};

const detectAttunement2014 = (firstLine: string | undefined): boolean =>
  firstLine !== undefined && /requires attunement/i.test(firstLine);

export const magicItemDetailToCard = (detail: MagicItemDetail): ItemCard => {
  const now = nowIso();
  const common = {
    id: newId(),
    kind: "item" as const,
    name: detail.name,
    source: "api" as const,
    apiRef: {
      system: "dnd5eapi" as const,
      slug: detail.index,
      ruleset: detail.ruleset,
    },
    imageUrl: detail.image ? `${IMAGE_BASE}${detail.image}` : undefined,
    createdAt: now,
    updatedAt: now,
  };

  if (detail.ruleset === "2024") {
    return {
      ...common,
      typeLine: composeTypeLine(
        detail.equipment_category.name,
        detail.rarity.name,
        detail.attunement,
      ),
      body: detail.desc,
    };
  }

  return {
    ...common,
    typeLine: composeTypeLine(
      detail.equipment_category.name,
      detail.rarity.name,
      detectAttunement2014(detail.desc[0]),
    ),
    body: detail.desc.join("\n\n"),
  };
};
```

- [ ] **Step 4: Run — expect pass**

```bash
npm test -- mappers/magicItems
```

- [ ] **Step 5: TS + lint + commit**

```bash
npx tsc --noEmit -p tsconfig.app.json && npm run lint:fix && npm run lint
git add -A
git commit -m "$(cat <<'EOF'
Add mapper from magic-item detail to ItemCard

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: MSW test utilities

**Files:**
- Create: `src/test/msw.ts`

- [ ] **Step 1: Write the MSW helper module**

```ts
// src/test/msw.ts
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import type {
  MagicItemDetail,
  MagicItemIndex,
  Ruleset,
} from "../api/endpoints/magicItems";

export const server = setupServer();

export const magicItemIndexHandler = (ruleset: Ruleset, body: MagicItemIndex) =>
  http.get(`https://www.dnd5eapi.co/api/${ruleset}/magic-items`, () => HttpResponse.json(body));

export const magicItemDetailHandler = (
  ruleset: Ruleset,
  slug: string,
  body: MagicItemDetail,
) => {
  // Strip the synthetic ruleset tag — the real API doesn't return it.
  const { ruleset: _ruleset, ...rest } = body as MagicItemDetail & { ruleset: Ruleset };
  return http.get(
    `https://www.dnd5eapi.co/api/${ruleset}/magic-items/${slug}`,
    () => HttpResponse.json(rest),
  );
};

export const apiErrorHandler = (path: string, status: number) =>
  http.get(`https://www.dnd5eapi.co${path}`, () => new HttpResponse(null, { status }));
```

- [ ] **Step 2: Confirm it compiles and doesn't break existing tests**

```bash
npx tsc --noEmit -p tsconfig.app.json && npm test
```
Expected: 43 (or current count) tests still pass, no new failures.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
Add MSW test helpers for magic-items endpoints

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Query hooks + QueryProvider + wire in `App`

**Files:**
- Create: `src/api/hooks.ts`, `src/api/hooks.test.tsx`, `src/api/QueryProvider.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write the failing hooks test**

```tsx
// src/api/hooks.test.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import {
  magicItemDetail2024Factory,
  magicItemIndexEntryFactory,
  magicItemIndexFactory,
} from "./factories";
import { useMagicItemDetail, useMagicItemIndex } from "./hooks";
import {
  magicItemDetailHandler,
  magicItemIndexHandler,
  server,
} from "../test/msw";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const wrapper = ({ children }: { children: ReactNode }) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

describe("useMagicItemIndex", () => {
  test("returns index data for 2024", async () => {
    const body = magicItemIndexFactory.build({}, { transient: { size: 2 } });
    server.use(magicItemIndexHandler("2024", body));

    const { result } = renderHook(() => useMagicItemIndex("2024"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(body);
  });
});

describe("useMagicItemDetail", () => {
  test("is disabled when slug is null", () => {
    const { result } = renderHook(() => useMagicItemDetail("2024", null), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
  });

  test("fetches when slug is supplied", async () => {
    const indexEntry = magicItemIndexEntryFactory.build();
    const detail = magicItemDetail2024Factory.build({
      index: indexEntry.index,
      name: indexEntry.name,
    });
    server.use(magicItemDetailHandler("2024", indexEntry.index, detail));

    const { result } = renderHook(
      () => useMagicItemDetail("2024", indexEntry.index),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.name).toBe(indexEntry.name);
  });
});
```

- [ ] **Step 2: Run — expect failure**

```bash
npm test -- api/hooks
```

- [ ] **Step 3: Implement the hooks**

```ts
// src/api/hooks.ts
import { useQuery } from "@tanstack/react-query";
import {
  fetchMagicItemDetail,
  fetchMagicItemIndex,
  type Ruleset,
} from "./endpoints/magicItems";

const DAY_MS = 24 * 60 * 60 * 1000;

export const useMagicItemIndex = (ruleset: Ruleset) =>
  useQuery({
    queryKey: ["magic-items", ruleset, "index"],
    queryFn: () => fetchMagicItemIndex(ruleset),
    staleTime: DAY_MS,
    gcTime: DAY_MS,
  });

export const useMagicItemDetail = (ruleset: Ruleset, slug: string | null) =>
  useQuery({
    enabled: slug !== null,
    queryKey: ["magic-items", ruleset, "detail", slug],
    queryFn: () => fetchMagicItemDetail(ruleset, slug as string),
    staleTime: DAY_MS,
    gcTime: DAY_MS,
  });
```

- [ ] **Step 4: Implement the provider**

```tsx
// src/api/QueryProvider.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const DAY_MS = 24 * 60 * 60 * 1000;

const client = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: DAY_MS,
      gcTime: DAY_MS,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function QueryProvider({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
```

- [ ] **Step 5: Wire the provider into `App.tsx`**

Replace `src/App.tsx`:
```tsx
import { QueryProvider } from "./api/QueryProvider";
import { RouterProvider, router } from "./app/router";

export default function App() {
  return (
    <QueryProvider>
      <RouterProvider router={router} />
    </QueryProvider>
  );
}
```

- [ ] **Step 6: Run — expect pass**

```bash
npm test -- api/hooks
```

- [ ] **Step 7: Run full suite + TS + lint + commit**

```bash
npm test && npx tsc --noEmit -p tsconfig.app.json && npm run lint:fix && npm run lint
git add -A
git commit -m "$(cat <<'EOF'
Add TanStack Query hooks for magic items + wire QueryProvider

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: `BrowseApiModal`

**Files:**
- Create: `src/views/BrowseApiModal.tsx`, `src/views/BrowseApiModal.module.css`, `src/views/BrowseApiModal.test.tsx`

- [ ] **Step 1: Write the failing modal tests**

```tsx
// src/views/BrowseApiModal.test.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import {
  magicItemDetail2024Factory,
  magicItemIndexEntryFactory,
} from "../api/factories";
import { useDeckStore } from "../deck/store";
import {
  magicItemDetailHandler,
  magicItemIndexHandler,
  server,
} from "../test/msw";
import { BrowseApiModal } from "./BrowseApiModal";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

beforeEach(() => {
  useDeckStore.setState({ deck: { version: 1, cards: [] } });
});

const wrap = (ui: ReactNode) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
};

describe("<BrowseApiModal>", () => {
  test("shows index entries once the list loads", async () => {
    const entryA = magicItemIndexEntryFactory.build({ name: "Bag of Holding" });
    const entryB = magicItemIndexEntryFactory.build({ name: "Cloak of Protection" });
    server.use(
      magicItemIndexHandler("2024", { count: 2, results: [entryA, entryB] }),
    );

    wrap(<BrowseApiModal onClose={() => {}} onSelected={() => {}} />);

    expect(await screen.findByText("Bag of Holding")).toBeInTheDocument();
    expect(screen.getByText("Cloak of Protection")).toBeInTheDocument();
  });

  test("search filters the list", async () => {
    const entryA = magicItemIndexEntryFactory.build({ name: "Bag of Holding" });
    const entryB = magicItemIndexEntryFactory.build({ name: "Cloak of Protection" });
    server.use(
      magicItemIndexHandler("2024", { count: 2, results: [entryA, entryB] }),
    );

    wrap(<BrowseApiModal onClose={() => {}} onSelected={() => {}} />);

    await screen.findByText("Bag of Holding");
    await userEvent.type(screen.getByPlaceholderText(/search/i), "bag");

    expect(screen.getByText("Bag of Holding")).toBeInTheDocument();
    expect(screen.queryByText("Cloak of Protection")).not.toBeInTheDocument();
  });

  test("switching ruleset loads a different list", async () => {
    const v2024 = magicItemIndexEntryFactory.build({ name: "Ring A" });
    const v2014 = magicItemIndexEntryFactory.build({ name: "Ring Z" });
    server.use(
      magicItemIndexHandler("2024", { count: 1, results: [v2024] }),
      magicItemIndexHandler("2014", { count: 1, results: [v2014] }),
    );

    wrap(<BrowseApiModal onClose={() => {}} onSelected={() => {}} />);

    await screen.findByText("Ring A");
    await userEvent.click(screen.getByRole("button", { name: /2014/i }));

    await waitFor(() => expect(screen.getByText("Ring Z")).toBeInTheDocument());
    expect(screen.queryByText("Ring A")).not.toBeInTheDocument();
  });

  test("clicking a row creates a card in the deck store and calls onSelected", async () => {
    const entry = magicItemIndexEntryFactory.build({ name: "Bag of Holding" });
    const detail = magicItemDetail2024Factory.build({
      index: entry.index,
      name: entry.name,
    });
    server.use(
      magicItemIndexHandler("2024", { count: 1, results: [entry] }),
      magicItemDetailHandler("2024", entry.index, detail),
    );
    const onSelected = vi.fn();

    wrap(<BrowseApiModal onClose={() => {}} onSelected={onSelected} />);

    await userEvent.click(await screen.findByText("Bag of Holding"));

    await waitFor(() => {
      expect(useDeckStore.getState().deck.cards).toHaveLength(1);
    });
    const created = useDeckStore.getState().deck.cards[0];
    expect(created?.source).toBe("api");
    expect(onSelected).toHaveBeenCalledWith(created?.id);
  });

  test("Escape calls onClose", async () => {
    const onClose = vi.fn();
    server.use(
      magicItemIndexHandler("2024", { count: 0, results: [] }),
    );

    wrap(<BrowseApiModal onClose={onClose} onSelected={() => {}} />);

    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  test("error state shows retry button", async () => {
    server.use(
      // First request errors.
      magicItemIndexHandler.bind(null) /* placeholder to satisfy type */,
    );
    // Override with a 500.
    const { apiErrorHandler } = await import("../test/msw");
    server.use(apiErrorHandler("/api/2024/magic-items", 500));

    wrap(<BrowseApiModal onClose={() => {}} onSelected={() => {}} />);

    expect(await screen.findByRole("button", { name: /retry/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run — expect failure**

```bash
npm test -- BrowseApiModal
```

- [ ] **Step 3: Implement the CSS module**

```css
/* src/views/BrowseApiModal.module.css */
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: #fff;
  width: min(640px, 92vw);
  max-height: 86vh;
  display: flex;
  flex-direction: column;
  border-radius: 0.5rem;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.25);
  overflow: hidden;
}

.header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e5e5e5;
  background: #fafafa;
}

.title {
  margin: 0;
  font-size: 1.05rem;
  flex: 1;
}

.rulesetToggle {
  display: flex;
  gap: 0.25rem;
}

.rulesetBtn {
  font: inherit;
  padding: 0.25rem 0.65rem;
  border: 1px solid #bbb;
  background: #fff;
  border-radius: 0.3rem;
  cursor: pointer;
}

.rulesetBtnActive {
  background: #2a5a8a;
  color: #fff;
  border-color: #2a5a8a;
}

.closeBtn {
  font: inherit;
  padding: 0.25rem 0.6rem;
  border: 1px solid transparent;
  background: transparent;
  border-radius: 0.3rem;
  cursor: pointer;
  color: #555;
  font-size: 1.2rem;
}

.closeBtn:hover {
  background: #eee;
}

.searchRow {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #eee;
}

.searchInput {
  font: inherit;
  width: 100%;
  padding: 0.5rem 0.7rem;
  border: 1px solid #bbb;
  border-radius: 0.3rem;
}

.results {
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  padding: 0.25rem 0;
}

.row {
  display: flex;
  width: 100%;
  justify-content: space-between;
  align-items: center;
  padding: 0.6rem 1rem;
  border: 0;
  background: transparent;
  text-align: left;
  font: inherit;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
}

.row:hover {
  background: #f6f6f6;
}

.rowName {
  font-weight: 600;
}

.rowMeta {
  font-size: 0.85rem;
  color: #666;
}

.state {
  padding: 1.5rem;
  text-align: center;
  color: #666;
}

.errorActions {
  margin-top: 0.5rem;
}
```

- [ ] **Step 4: Implement the modal**

```tsx
// src/views/BrowseApiModal.tsx
import { useEffect, useMemo, useState } from "react";
import { useMagicItemDetail, useMagicItemIndex } from "../api/hooks";
import type { Ruleset } from "../api/endpoints/magicItems";
import { magicItemDetailToCard } from "../api/mappers/magicItems";
import { useDeckStore } from "../deck/store";
import styles from "./BrowseApiModal.module.css";

type Props = {
  onClose: () => void;
  onSelected: (cardId: string) => void;
};

export function BrowseApiModal({ onClose, onSelected }: Props) {
  const [ruleset, setRuleset] = useState<Ruleset>("2024");
  const [query, setQuery] = useState("");
  const [pickedSlug, setPickedSlug] = useState<string | null>(null);

  const index = useMagicItemIndex(ruleset);
  const detail = useMagicItemDetail(ruleset, pickedSlug);
  const upsertCard = useDeckStore((s) => s.upsertCard);

  const filtered = useMemo(() => {
    const all = index.data?.results ?? [];
    if (query.trim() === "") return all;
    const q = query.toLowerCase();
    return all.filter((e) => e.name.toLowerCase().includes(q));
  }, [index.data, query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (detail.data && pickedSlug) {
      const card = magicItemDetailToCard(detail.data);
      upsertCard(card);
      onSelected(card.id);
      setPickedSlug(null);
    }
  }, [detail.data, pickedSlug, upsertCard, onSelected]);

  const onBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className={styles.backdrop}
      onClick={onBackdropClick}
      onKeyDown={() => {}}
      role="presentation"
    >
      <div className={styles.modal} role="dialog" aria-label="Browse magic items">
        <header className={styles.header}>
          <h2 className={styles.title}>Browse magic items</h2>
          <div className={styles.rulesetToggle} role="group" aria-label="Ruleset">
            <button
              type="button"
              className={`${styles.rulesetBtn} ${ruleset === "2014" ? styles.rulesetBtnActive : ""}`}
              onClick={() => setRuleset("2014")}
            >
              2014
            </button>
            <button
              type="button"
              className={`${styles.rulesetBtn} ${ruleset === "2024" ? styles.rulesetBtnActive : ""}`}
              onClick={() => setRuleset("2024")}
            >
              2024
            </button>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <div className={styles.searchRow}>
          <input
            className={styles.searchInput}
            type="search"
            placeholder="Search magic items…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            // biome-ignore lint/a11y/noAutofocus: modal entry point
            autoFocus
          />
        </div>

        <div className={styles.results}>
          {index.isLoading && <div className={styles.state}>Loading…</div>}
          {index.isError && (
            <div className={styles.state}>
              Couldn't load the magic-items list.
              <div className={styles.errorActions}>
                <button type="button" onClick={() => index.refetch()}>
                  Retry
                </button>
              </div>
            </div>
          )}
          {index.isSuccess && filtered.length === 0 && (
            <div className={styles.state}>No items match your search.</div>
          )}
          {index.isSuccess &&
            filtered.map((entry) => (
              <button
                key={entry.index}
                type="button"
                className={styles.row}
                onClick={() => setPickedSlug(entry.index)}
                disabled={detail.isFetching && pickedSlug === entry.index}
              >
                <span className={styles.rowName}>{entry.name}</span>
                {detail.isFetching && pickedSlug === entry.index && (
                  <span className={styles.rowMeta}>Loading…</span>
                )}
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
```

Note: the test `test("error state shows retry button", …)` has a minor snag — the `server.use(magicItemIndexHandler.bind(null))` line is placeholder; rewrite it before running as:
```ts
  test("error state shows retry button", async () => {
    const { apiErrorHandler } = await import("../test/msw");
    server.use(apiErrorHandler("/api/2024/magic-items", 500));

    wrap(<BrowseApiModal onClose={() => {}} onSelected={() => {}} />);

    expect(await screen.findByRole("button", { name: /retry/i })).toBeInTheDocument();
  });
```

- [ ] **Step 5: Fix the test's error-state case (per note above)**

- [ ] **Step 6: Run — expect pass**

```bash
npm test -- BrowseApiModal
```

- [ ] **Step 7: TS + lint + commit**

```bash
npx tsc --noEmit -p tsconfig.app.json && npm run lint:fix && npm run lint
git add -A
git commit -m "$(cat <<'EOF'
Add BrowseApiModal for magic items

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Wire the modal into the Deck view

**Files:**
- Modify: `src/views/DeckView.tsx`, `src/views/DeckView.module.css`
- Modify: `src/views/DeckView.test.tsx` (add a new test)

- [ ] **Step 1: Add a failing deck-view test**

Append to `describe("<DeckView>", …)` in `src/views/DeckView.test.tsx`:
```tsx
  test("'Browse from API' button opens the modal", async () => {
    await renderWithRouter(<DeckView />);
    await userEvent.click(screen.getByRole("button", { name: /browse from api/i }));
    expect(screen.getByRole("dialog", { name: /browse magic items/i })).toBeInTheDocument();
  });
```
Note: this test needs the `QueryClientProvider` wrapping. Update the `renderWithRouter` helper OR wrap locally in the test:
```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// replace `await renderWithRouter(<DeckView />);` in this one test with:
const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
await renderWithRouter(
  <QueryClientProvider client={client}>
    <DeckView />
  </QueryClientProvider>,
);
```

Also, start/stop MSW in the test file (or this test simply never triggers a fetch if we don't open the ruleset panel yet). For the test above we only assert the modal opens, the index fetch starts but failing is fine as long as the dialog rendered.

Cleaner approach: add MSW lifecycle + handler in a new `beforeAll`:
```tsx
import { magicItemIndexHandler, server } from "../test/msw";
// add to the file (top-level, outside describe):
beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
// and inside the new test, before clicking:
server.use(magicItemIndexHandler("2024", { count: 0, results: [] }));
```

- [ ] **Step 2: Run — expect failure**

```bash
npm test -- DeckView
```

- [ ] **Step 3: Update `DeckView.tsx`**

Replace `src/views/DeckView.tsx`:
```tsx
import { Link, useNavigate } from "@tanstack/react-router";
import { type ChangeEvent, useRef, useState } from "react";
import { parseDeckJson, serializeDeck } from "../deck/io";
import { useDeckStore } from "../deck/store";
import { downloadText } from "../lib/download";
import { newId } from "../lib/id";
import { nowIso } from "../lib/time";
import { BrowseApiModal } from "./BrowseApiModal";
import styles from "./DeckView.module.css";

export function DeckView() {
  const deck = useDeckStore((s) => s.deck);
  const upsertCard = useDeckStore((s) => s.upsertCard);
  const removeCard = useDeckStore((s) => s.removeCard);
  const replaceDeck = useDeckStore((s) => s.replaceDeck);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [browseOpen, setBrowseOpen] = useState(false);

  const handleNew = () => {
    const id = newId();
    const now = nowIso();
    upsertCard({
      id,
      kind: "item",
      name: "Untitled item",
      typeLine: "",
      body: "",
      source: "custom",
      createdAt: now,
      updatedAt: now,
    });
    navigate({ to: "/editor/$id", params: { id } });
  };

  const handleExport = () => {
    downloadText("deck.json", serializeDeck(deck));
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const result = parseDeckJson(text);
    if (result.ok) {
      replaceDeck(result.deck);
    } else {
      alert(`Import failed: ${result.error}`);
    }
    e.target.value = "";
  };

  const handleApiSelected = (id: string) => {
    setBrowseOpen(false);
    navigate({ to: "/editor/$id", params: { id } });
  };

  return (
    <section>
      <header className={styles.header}>
        <h2 className={styles.title}>Deck</h2>
        <div className={styles.actions}>
          <button type="button" onClick={handleImportClick}>
            Import JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            hidden
            onChange={handleImport}
          />
          <button type="button" onClick={handleExport} disabled={deck.cards.length === 0}>
            Export JSON
          </button>
          <button type="button" onClick={() => setBrowseOpen(true)}>
            Browse from API
          </button>
          <button type="button" onClick={handleNew}>
            New card
          </button>
        </div>
      </header>

      {deck.cards.length === 0 ? (
        <p className={styles.empty}>No cards yet. Create one or import JSON.</p>
      ) : (
        <ul className={styles.list}>
          {deck.cards.map((card) => (
            <li key={card.id} className={styles.row}>
              <div className={styles.rowMain}>
                <Link to="/editor/$id" params={{ id: card.id }} className={styles.cardLink}>
                  <strong>{card.name}</strong>
                </Link>
                {card.kind === "item" && card.typeLine && (
                  <span className={styles.typeLine}>{card.typeLine}</span>
                )}
              </div>
              <button
                type="button"
                className={styles.deleteBtn}
                aria-label={`Delete ${card.name}`}
                onClick={() => removeCard(card.id)}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      {browseOpen && (
        <BrowseApiModal
          onClose={() => setBrowseOpen(false)}
          onSelected={handleApiSelected}
        />
      )}
    </section>
  );
}
```

- [ ] **Step 4: Run — expect pass**

```bash
npm test -- DeckView
```

- [ ] **Step 5: Full suite + TS + lint + commit**

```bash
npm test && npx tsc --noEmit -p tsconfig.app.json && npm run lint:fix && npm run lint
git add -A
git commit -m "$(cat <<'EOF'
Wire BrowseApiModal into deck view

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Manual smoke test + build

**Files:** none.

- [ ] **Step 1: Verify build**

```bash
npm run build
```
Expected: build succeeds.

- [ ] **Step 2: Start dev server (if not already running)**

```bash
npm run dev
```

- [ ] **Step 3: Walk through**

1. Click **Browse from API** → modal opens; magic-items list loads (2024 ruleset by default).
2. Type in the search → list filters.
3. Click the **2014** ruleset button → list reloads with 2014 data.
4. Click a row (e.g., "Bag of Holding") → modal closes, editor opens with pre-filled `name`, composed `typeLine`, body, and small image top-right.
5. Edit body → Save → card appears on deck with the magic-item name and type line.
6. Export JSON → open the file; verify the card has `source: "api"` and `apiRef: { system: "dnd5eapi", slug, ruleset }`.
7. Import that JSON back into a fresh session → the card reappears with all fields.
8. Open `/print` → new card renders in the print layout as expected.

Regressions? Note and fix, then re-run the suite.

---

## Self-review

**Spec coverage:**
- Ruleset toggle UX: Tasks 9, 10.
- Fetch layer (apiClient, endpoints, hooks): Tasks 3, 4, 8.
- Mapping (2014 & 2024): Task 6 + 5 (factories).
- Schema change `apiRef.ruleset`: Task 2.
- MSW test utilities: Task 7.
- QueryProvider wired at app root: Task 8 Step 5.
- Deck-view entry point: Task 10.
- Error + loading states: Task 9 (modal state bullets).
- Manual QA: Task 11.

**Placeholder scan:** None of the "TBD"/"implement later"/etc. patterns remain. Task 9 Step 1 contains a known-imperfect test snippet with a placeholder line that Step 5 fixes; that's fine because the fix is included in the plan, not deferred.

**Type consistency:**
- `Ruleset = "2014" | "2024"` — consistent across endpoints, hooks, mappers, factories, modal.
- `MagicItemDetail` union is the public detail shape; ruleset is a discriminator. Used consistently by factories, hooks, mappers, and tests.
- `magicItemDetailToCard` is the single mapper entry point; both rulesets go through it. Branches on `detail.ruleset`.
- `apiRef` on `ItemCard` always includes `ruleset`; required by Zod.

**Known trade-offs:**
- Tests that exercise the modal must wrap in a `QueryClientProvider` and start MSW. The plan shows this wiring explicitly in Task 9 and notes the DeckView test update in Task 10.
- `src/test/renderWithRouter.tsx` is unchanged; one option is to wrap both router + query in the helper, but for now callers that need the query wrapping do it locally (explicit > implicit for this small number of call sites).
