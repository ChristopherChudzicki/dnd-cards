import { afterEach, describe, expect, test, vi } from "vitest";
import { fetchMagicItemDetail, fetchMagicItemIndex } from "./magicItems";

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("fetchMagicItemIndex", () => {
  test("hits /api/2024/magic-items when ruleset is 2024", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ count: 0, results: [] }), { status: 200 }));
    globalThis.fetch = fetchMock as typeof fetch;

    await fetchMagicItemIndex("2024");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://www.dnd5eapi.co/api/2024/magic-items",
      expect.anything(),
    );
  });

  test("hits /api/2014/magic-items when ruleset is 2014", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ count: 0, results: [] }), { status: 200 }));
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
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(raw), { status: 200 }));
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
