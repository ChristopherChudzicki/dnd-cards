import type { Card } from "../cards/types";
import type { CardRow } from "./types";

export function rowToCard(row: CardRow): Card {
  return { id: row.id, ...row.payload } as Card;
}

export function cardToInsertRow(card: Card, deckId: string, position: number) {
  const { id: _id, ...payload } = card;
  return {
    deck_id: deckId,
    position,
    payload,
  };
}

export function cardToUpdatePayload(card: Card) {
  const { id: _id, ...payload } = card;
  return payload;
}
