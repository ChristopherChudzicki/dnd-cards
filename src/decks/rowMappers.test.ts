import { describe, expect, it } from "vitest";
import type { Card } from "../cards/types";
import { makeCardRow, makeItemPayload } from "../test/factories";
import { cardToInsertRow, cardToUpdatePayload, rowToCard } from "./rowMappers";

describe("rowMappers", () => {
  it("rowToCard fuses row.id into payload", () => {
    const row = makeCardRow.build();
    const card = rowToCard(row);
    expect(card.id).toBe(row.id);
    expect(card.name).toBe(row.payload.name);
    expect(card.kind).toBe(row.payload.kind);
  });

  it("cardToInsertRow strips id and includes deck_id", () => {
    const card: Card = { id: "card-id", ...makeItemPayload.build() };
    const insert = cardToInsertRow(card, "deck-id", 0);
    expect(insert.deck_id).toBe("deck-id");
    expect(insert.position).toBe(0);
    expect(insert.payload).not.toHaveProperty("id");
    expect(insert.payload.name).toBe(card.name);
  });

  it("cardToUpdatePayload returns the payload portion only", () => {
    const card: Card = { id: "card-id", ...makeItemPayload.build() };
    const update = cardToUpdatePayload(card);
    expect(update).not.toHaveProperty("id");
    expect(update).not.toHaveProperty("deck_id");
    expect(update.name).toBe(card.name);
  });

  it("round-trips a card through cardToInsertRow → rowToCard", () => {
    const original: Card = { id: "card-id", ...makeItemPayload.build() };
    const insert = cardToInsertRow(original, "deck-id", 0);
    const row = makeCardRow.build({
      id: original.id,
      deck_id: "deck-id",
      payload: insert.payload,
    });
    const restored = rowToCard(row);
    expect(restored).toEqual(original);
  });
});
