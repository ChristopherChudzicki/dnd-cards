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
