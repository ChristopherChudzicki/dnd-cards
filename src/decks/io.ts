import type { Deck } from "../cards/types";
import { deckSchema } from "./schema";

export type ParseResult = { ok: true; deck: Deck } | { ok: false; error: string };

export const serializeDeck = (deck: Deck): string => JSON.stringify(deck, null, 2);

export const parseDeckJson = (input: string): ParseResult => {
  let raw: unknown;
  try {
    raw = JSON.parse(input);
  } catch {
    return { ok: false, error: "Invalid JSON." };
  }
  if (
    raw &&
    typeof raw === "object" &&
    "version" in raw &&
    typeof (raw as { version: unknown }).version === "number" &&
    (raw as { version: number }).version !== 1
  ) {
    return {
      ok: false,
      error: `Deck version ${(raw as { version: number }).version} is not supported (expected 1). This file may have been made by a newer version of this app.`,
    };
  }
  const result = deckSchema.safeParse(raw);
  if (!result.success) {
    return {
      ok: false,
      error: `Not a valid deck: ${result.error.issues[0]?.message ?? "unknown error"}`,
    };
  }
  return { ok: true, deck: result.data };
};
