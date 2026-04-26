import type { Card } from "../cards/types";

export type DeckRow = {
  id: string;
  owner_id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export type CardRow = {
  id: string;
  deck_id: string;
  position: number;
  payload: Omit<Card, "id">;
  created_at: string;
  updated_at: string;
};
