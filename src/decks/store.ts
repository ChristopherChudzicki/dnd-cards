import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { Card, Deck } from "../cards/types";

type DeckState = {
  deck: Deck;
  upsertCard: (card: Card) => void;
  removeCard: (id: string) => void;
  replaceDeck: (deck: Deck) => void;
};

const emptyDeck = (): Deck => ({ version: 1, cards: [] });

export const useDeckStore = create<DeckState>()(
  persist(
    (set) => ({
      deck: emptyDeck(),
      upsertCard: (card) =>
        set((state) => {
          const existingIndex = state.deck.cards.findIndex((c) => c.id === card.id);
          const nextCards =
            existingIndex >= 0
              ? state.deck.cards.map((c, i) => (i === existingIndex ? card : c))
              : [...state.deck.cards, card];
          return { deck: { ...state.deck, cards: nextCards } };
        }),
      removeCard: (id) =>
        set((state) => ({
          deck: { ...state.deck, cards: state.deck.cards.filter((c) => c.id !== id) },
        })),
      replaceDeck: (deck) => set({ deck }),
    }),
    {
      name: "dnd-cards:deck:v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ deck: state.deck }),
    },
  ),
);
