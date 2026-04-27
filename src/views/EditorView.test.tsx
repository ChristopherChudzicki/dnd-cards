import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { makeCardRow } from "../test/factories";
import { server } from "../test/msw";
import { EditorView } from "./EditorView";

const SB = "http://localhost:54321";

const navigate = vi.fn();
vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return { ...actual, useNavigate: () => navigate };
});

function wrap(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{ui}</QueryClientProvider>;
}

describe("EditorView", () => {
  it("renders 'Card not found' when cardId is missing from server", async () => {
    server.use(http.get(`${SB}/rest/v1/cards`, () => HttpResponse.json([])));
    render(wrap(<EditorView deckId="d1" cardId="missing" />));
    await waitFor(() => expect(screen.getByText(/card not found/i)).toBeInTheDocument());
  });

  it("saves via POST when cardId='new'", async () => {
    const onPost = vi.fn();
    server.use(
      http.post(`${SB}/rest/v1/cards`, async ({ request }) => {
        onPost(await request.json());
        return HttpResponse.json([makeCardRow.build()], { status: 201 });
      }),
    );
    render(wrap(<EditorView deckId="d1" cardId="new" />));
    await userEvent.click(await screen.findByRole("button", { name: /save/i }));
    await waitFor(() => expect(onPost).toHaveBeenCalled());
    expect(navigate).toHaveBeenCalledWith({ to: "/deck/$deckId", params: { deckId: "d1" } });
  });

  it("saves via PATCH when editing an existing card", async () => {
    const card = makeCardRow.build({ id: "c1", deck_id: "d1" });
    const onPatch = vi.fn();
    server.use(
      http.get(`${SB}/rest/v1/cards`, () => HttpResponse.json([card])),
      http.patch(`${SB}/rest/v1/cards`, async ({ request }) => {
        onPatch(await request.json());
        return HttpResponse.json([card]);
      }),
    );
    render(wrap(<EditorView deckId="d1" cardId="c1" />));
    await userEvent.click(await screen.findByRole("button", { name: /save/i }));
    await waitFor(() => expect(onPatch).toHaveBeenCalled());
  });
});
