import { describe, expect, test } from "vitest";
import { deckFactory } from "./factories";
import { deckSchema } from "./schema";

describe("deckFactory", () => {
  test("produces data that passes deckSchema", () => {
    const deck = deckFactory.build();
    expect(deckSchema.safeParse(deck).success).toBe(true);
  });

  test("produces an empty deck by default", () => {
    expect(deckFactory.build().cards).toEqual([]);
  });
});
