import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { describe, expect, it, vi } from "vitest";
import type { Card } from "../cards/types";
import { makeCardRow, makeDeckRow } from "../test/factories";
import { server } from "../test/msw";
import {
  useCreateDeck,
  useDeleteCard,
  useDeleteDeck,
  useRenameDeck,
  useSaveCard,
} from "./mutations";

const SB = "http://localhost:54321";

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  // biome-ignore lint/suspicious/noExplicitAny: test wrapper
  return ({ children }: { children: any }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe("useCreateDeck", () => {
  it("POSTs the deck and returns the inserted row", async () => {
    const inserted = makeDeckRow.build({ name: "New" });
    server.use(
      http.post(`${SB}/rest/v1/decks`, () => HttpResponse.json([inserted], { status: 201 })),
    );

    const { result } = renderHook(() => useCreateDeck(), { wrapper: makeWrapper() });
    const created = await result.current.mutateAsync({ name: "New", ownerId: inserted.owner_id });
    expect(created.id).toBe(inserted.id);
  });
});

describe("useRenameDeck", () => {
  it("PATCHes the deck name", async () => {
    const onPatch = vi.fn();
    const updated = makeDeckRow.build({ name: "Renamed" });
    server.use(
      http.patch(`${SB}/rest/v1/decks`, async ({ request }) => {
        onPatch(await request.json());
        return HttpResponse.json([updated]);
      }),
    );
    const { result } = renderHook(() => useRenameDeck(), { wrapper: makeWrapper() });
    const out = await result.current.mutateAsync({ deckId: updated.id, name: "Renamed" });
    expect(out.name).toBe("Renamed");
    expect(onPatch).toHaveBeenCalledWith(expect.objectContaining({ name: "Renamed" }));
  });
});

describe("useDeleteDeck", () => {
  it("DELETEs the deck", async () => {
    const onDelete = vi.fn();
    server.use(
      http.delete(`${SB}/rest/v1/decks`, ({ request }) => {
        onDelete(new URL(request.url).search);
        return HttpResponse.json([]);
      }),
    );
    const { result } = renderHook(() => useDeleteDeck(), { wrapper: makeWrapper() });
    await result.current.mutateAsync("deck-id");
    expect(onDelete).toHaveBeenCalled();
  });
});

describe("useSaveCard", () => {
  it("INSERTs a new card when isNew=true", async () => {
    const row = makeCardRow.build();
    server.use(http.post(`${SB}/rest/v1/cards`, () => HttpResponse.json([row], { status: 201 })));
    const { result } = renderHook(() => useSaveCard(), { wrapper: makeWrapper() });
    const card = { id: row.id, ...row.payload } as Card;
    const saved = await result.current.mutateAsync({ card, deckId: row.deck_id, isNew: true });
    expect(saved.id).toBe(row.id);
  });

  it("UPDATEs an existing card when isNew=false", async () => {
    const row = makeCardRow.build();
    server.use(http.patch(`${SB}/rest/v1/cards`, () => HttpResponse.json([row])));
    const { result } = renderHook(() => useSaveCard(), { wrapper: makeWrapper() });
    const card = { id: row.id, ...row.payload } as Card;
    const saved = await result.current.mutateAsync({ card, deckId: row.deck_id, isNew: false });
    expect(saved.id).toBe(row.id);
  });
});

describe("useDeleteCard", () => {
  it("DELETEs the card", async () => {
    const onDelete = vi.fn();
    server.use(
      http.delete(`${SB}/rest/v1/cards`, ({ request }) => {
        onDelete(new URL(request.url).search);
        return HttpResponse.json([]);
      }),
    );
    const { result } = renderHook(() => useDeleteCard(), { wrapper: makeWrapper() });
    await result.current.mutateAsync({ cardId: "c1", deckId: "d1" });
    expect(onDelete).toHaveBeenCalled();
  });
});
