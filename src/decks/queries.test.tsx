import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it } from "vitest";
import { makeCardRow, makeDeckRow } from "../test/factories";
import { server } from "../test/msw";
import { useDeck, useDeckCards, useDecks } from "./queries";

const SB = "http://localhost:54321";

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  // biome-ignore lint/suspicious/noExplicitAny: test wrapper
  return ({ children }: { children: any }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe("useDecks", () => {
  it("returns the user's decks", async () => {
    const decks = [makeDeckRow.build(), makeDeckRow.build()];
    server.use(http.get(`${SB}/rest/v1/decks`, () => HttpResponse.json(decks)));
    const { result } = renderHook(() => useDecks("user-id"), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(decks);
  });

  it("is disabled when ownerId is undefined", async () => {
    const { result } = renderHook(() => useDecks(undefined), { wrapper: wrapper() });
    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useDeck", () => {
  it("returns a single deck by id", async () => {
    const deck = makeDeckRow.build();
    server.use(http.get(`${SB}/rest/v1/decks`, () => HttpResponse.json([deck])));
    const { result } = renderHook(() => useDeck(deck.id), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(deck);
  });

  it("returns null when the deck doesn't exist", async () => {
    server.use(http.get(`${SB}/rest/v1/decks`, () => HttpResponse.json([])));
    const { result } = renderHook(() => useDeck("missing"), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });
});

describe("useDeckCards", () => {
  it("returns cards for the given deck, mapped to the Card type", async () => {
    const [firstRow, secondRow] = [makeCardRow.build(), makeCardRow.build()];
    server.use(http.get(`${SB}/rest/v1/cards`, () => HttpResponse.json([firstRow, secondRow])));
    const { result } = renderHook(() => useDeckCards("deck-id"), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const cards = result.current.data ?? [];
    expect(cards).toHaveLength(2);
    expect(cards.at(0)?.id).toBe(firstRow.id);
  });
});
