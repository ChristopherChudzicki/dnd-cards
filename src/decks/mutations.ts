import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../api/supabase";
import type { Card } from "../cards/types";
import { deckCardsKey, deckKey, decksKey } from "./queries";
import { cardToInsertRow, cardToUpdatePayload, rowToCard } from "./rowMappers";
import type { CardRow, DeckRow } from "./types";

export function useCreateDeck() {
  const qc = useQueryClient();
  return useMutation<DeckRow, Error, { name: string; ownerId: string }>({
    mutationFn: async ({ name, ownerId }) => {
      const { data, error } = await supabase
        .from("decks")
        .insert({ name, owner_id: ownerId })
        .select();
      if (error) throw error;
      const row = (data as DeckRow[])[0];
      if (!row) throw new Error("No row returned from insert");
      return row;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: decksKey(vars.ownerId) });
    },
  });
}

export function useRenameDeck() {
  const qc = useQueryClient();
  return useMutation<DeckRow, Error, { deckId: string; name: string }>({
    mutationFn: async ({ deckId, name }) => {
      const { data, error } = await supabase
        .from("decks")
        .update({ name })
        .eq("id", deckId)
        .select();
      if (error) throw error;
      const row = (data as DeckRow[])[0];
      if (!row) throw new Error("No row returned from update");
      return row;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: deckKey(data.id) });
      qc.invalidateQueries({ queryKey: decksKey(data.owner_id) });
    },
  });
}

export function useDeleteDeck() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (deckId) => {
      const { error } = await supabase.from("decks").delete().eq("id", deckId);
      if (error) throw error;
    },
    onSuccess: () => {
      // Owner is the only viewer of their deck list, so blanket-invalidate.
      qc.invalidateQueries({ queryKey: ["decks"] });
    },
  });
}

export function useSaveCard() {
  const qc = useQueryClient();
  return useMutation<
    Card,
    Error,
    { card: Card; deckId: string; isNew: boolean; position?: number }
  >({
    mutationFn: async ({ card, deckId, isNew, position = 0 }) => {
      if (isNew) {
        const insert = cardToInsertRow(card, deckId, position);
        // Force the row id to match the client-generated one if provided
        // (so the editor URL stays stable across the round-trip).
        const { data, error } = await supabase
          .from("cards")
          .insert({ ...insert, id: card.id })
          .select();
        if (error) throw error;
        const row = (data as CardRow[])[0];
        if (!row) throw new Error("No row returned from insert");
        return rowToCard(row);
      }
      const { data, error } = await supabase
        .from("cards")
        .update({ payload: cardToUpdatePayload(card) })
        .eq("id", card.id)
        .select();
      if (error) throw error;
      const row = (data as CardRow[])[0];
      if (!row) throw new Error("No row returned from update");
      return rowToCard(row);
    },
    onSuccess: (_card, vars) => {
      qc.invalidateQueries({ queryKey: deckCardsKey(vars.deckId) });
    },
  });
}

export function useDeleteCard() {
  const qc = useQueryClient();
  return useMutation<void, Error, { cardId: string; deckId: string }>({
    mutationFn: async ({ cardId }) => {
      const { error } = await supabase.from("cards").delete().eq("id", cardId);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: deckCardsKey(vars.deckId) });
    },
  });
}
