import { describe, expect, test } from "vitest";
import { itemCardSchema } from "../deck/schema";
import { itemCardFactory } from "./factories";

describe("itemCardFactory", () => {
  test("produces data that passes itemCardSchema", () => {
    const card = itemCardFactory.build();
    expect(itemCardSchema.safeParse(card).success).toBe(true);
  });

  test("respects overrides", () => {
    const card = itemCardFactory.build({ name: "Vorpal Sword" });
    expect(card.name).toBe("Vorpal Sword");
  });

  test("each build produces a unique id", () => {
    const a = itemCardFactory.build();
    const b = itemCardFactory.build();
    expect(a.id).not.toBe(b.id);
  });
});
