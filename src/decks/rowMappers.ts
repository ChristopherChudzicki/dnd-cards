import type { Card } from "../cards/types";
import type { CardRow } from "./types";

type CardInsertRow = Omit<CardRow, "id" | "created_at" | "updated_at">;
type CardUpdatePayload = Omit<Card, "id">;

export function rowToCard(row: CardRow): Card {
  // Spreading a discriminated-union payload widens the result; the cast
  // restores the union. Safe because `row.payload` is already typed as
  // `Omit<Card, "id">` at the boundary.
  return { id: row.id, ...row.payload } as Card;
}

export function cardToInsertRow(card: Card, deckId: string, position: number): CardInsertRow {
  const { id: _id, ...payload } = card;
  return {
    deck_id: deckId,
    position,
    payload,
  };
}

export function cardToUpdatePayload(card: Card): CardUpdatePayload {
  const { id: _id, ...payload } = card;
  return payload;
}
