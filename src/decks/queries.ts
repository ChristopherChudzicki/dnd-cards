import { useQuery } from "@tanstack/react-query";
import { supabase } from "../api/supabase";
import type { Card } from "../cards/types";
import { rowToCard } from "./rowMappers";
import type { CardRow, DeckRow } from "./types";

export const decksKey = (ownerId: string | undefined) => ["decks", ownerId] as const;
export const deckKey = (deckId: string) => ["deck", deckId] as const;
export const deckCardsKey = (deckId: string) => ["deck-cards", deckId] as const;

export function useDecks(ownerId: string | undefined) {
  return useQuery<DeckRow[]>({
    queryKey: decksKey(ownerId),
    enabled: Boolean(ownerId),
    queryFn: async () => {
      if (!ownerId) return [];
      const { data, error } = await supabase
        .from("decks")
        .select("*")
        .eq("owner_id", ownerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useDeck(deckId: string) {
  return useQuery<DeckRow | null>({
    queryKey: deckKey(deckId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("decks")
        .select("*")
        .eq("id", deckId)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });
}

export function useDeckCards(deckId: string) {
  return useQuery<Card[]>({
    queryKey: deckCardsKey(deckId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cards")
        .select("*")
        .eq("deck_id", deckId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as CardRow[]).map(rowToCard);
    },
  });
}
