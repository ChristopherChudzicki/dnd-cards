import { describe, expect, test } from "vitest";
import { itemCardFactory } from "../cards/factories";
import { parseDeckJson, serializeDeck } from "./io";

describe("deck io", () => {
  test("serialize then parse yields the same deck", () => {
    const original = { version: 1 as const, cards: itemCardFactory.buildList(2) };
    const serialized = serializeDeck(original);
    const parsed = parseDeckJson(serialized);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.deck).toEqual(original);
  });

  test("parseDeckJson rejects non-JSON input", () => {
    const parsed = parseDeckJson("not json");
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.error).toMatch(/invalid json/i);
  });

  test("parseDeckJson rejects JSON that isn't a deck", () => {
    const parsed = parseDeckJson(JSON.stringify({ unrelated: true }));
    expect(parsed.ok).toBe(false);
  });

  test("parseDeckJson rejects a deck with an unsupported version", () => {
    const parsed = parseDeckJson(JSON.stringify({ version: 2, cards: [] }));
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.error).toMatch(/version/i);
  });
});
