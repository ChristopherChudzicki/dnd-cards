import { beforeEach, describe, expect, test } from "vitest";
import { itemCardFactory } from "../cards/factories";
import { deckFactory } from "./factories";
import { useDeckStore } from "./store";

const resetStore = () => {
  useDeckStore.setState({ deck: deckFactory.build() });
  localStorage.clear();
};

describe("deck store", () => {
  beforeEach(resetStore);

  test("starts with an empty deck", () => {
    expect(useDeckStore.getState().deck.cards).toEqual([]);
  });

  test("upsertCard adds a new card", () => {
    const card = itemCardFactory.build();
    useDeckStore.getState().upsertCard(card);
    expect(useDeckStore.getState().deck.cards).toHaveLength(1);
    expect(useDeckStore.getState().deck.cards[0]).toEqual(card);
  });

  test("upsertCard replaces an existing card by id", () => {
    const card = itemCardFactory.build({ name: "Old" });
    useDeckStore.getState().upsertCard(card);
    useDeckStore.getState().upsertCard({ ...card, name: "New" });
    expect(useDeckStore.getState().deck.cards).toHaveLength(1);
    expect(useDeckStore.getState().deck.cards[0]?.name).toBe("New");
  });

  test("removeCard removes by id", () => {
    const card = itemCardFactory.build();
    useDeckStore.getState().upsertCard(card);
    useDeckStore.getState().removeCard(card.id);
    expect(useDeckStore.getState().deck.cards).toEqual([]);
  });

  test("replaceDeck replaces the whole deck", () => {
    const next = deckFactory.build({ cards: [itemCardFactory.build()] });
    useDeckStore.getState().replaceDeck(next);
    expect(useDeckStore.getState().deck).toEqual(next);
  });
});
