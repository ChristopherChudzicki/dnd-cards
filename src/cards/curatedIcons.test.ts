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
