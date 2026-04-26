import { Factory } from "fishery";
import type { Deck } from "../cards/types";

export const deckFactory = Factory.define<Deck>(() => ({
  version: 1,
  cards: [],
}));
