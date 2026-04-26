import { faker } from "@faker-js/faker";
import { Factory } from "fishery";
import type { ItemCard } from "../cards/types";
import type { CardRow, DeckRow } from "../decks/types";

// Re-export DB row types for tests that want them via this barrel.
export type { CardRow, DeckRow };

export const makeDeckRow = Factory.define<DeckRow>(() => {
  const now = faker.date.recent().toISOString();
  return {
    id: faker.string.uuid(),
    owner_id: faker.string.uuid(),
    name: faker.lorem.words({ min: 2, max: 4 }),
    created_at: now,
    updated_at: now,
  };
});

export const makeItemPayload = Factory.define<Omit<ItemCard, "id">>(() => {
  const now = faker.date.recent().toISOString();
  return {
    kind: "item",
    name: faker.commerce.productName(),
    typeLine: "Weapon",
    body: faker.lorem.paragraph(),
    source: "custom",
    createdAt: now,
    updatedAt: now,
  };
});

export const makeCardRow = Factory.define<CardRow>(() => {
  const now = faker.date.recent().toISOString();
  return {
    id: faker.string.uuid(),
    deck_id: faker.string.uuid(),
    position: 0,
    payload: makeItemPayload.build(),
    created_at: now,
    updated_at: now,
  };
});
