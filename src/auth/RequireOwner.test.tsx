import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "../api/supabase";
import { makeDeckRow } from "../test/factories";
import { server } from "../test/msw";
import { signInTestUser } from "../test/signInTestUser";
import { AuthProvider } from "./AuthProvider";
import { RequireOwner } from "./RequireOwner";

const SB = "http://localhost:54321";
const navigate = vi.fn();
vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return { ...actual, useNavigate: () => navigate };
});

function wrap(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={client}>
      <AuthProvider>{ui}</AuthProvider>
    </QueryClientProvider>
  );
}

describe("RequireOwner", () => {
  beforeEach(async () => {
    await supabase.auth.signOut();
    navigate.mockClear();
  });

  it("redirects to /login when unauthenticated", async () => {
    render(wrap(<RequireOwner deckId="d1">protected</RequireOwner>));
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({ to: "/login", search: { next: expect.any(String) } }),
    );
  });

  it("renders children when the session user owns the deck", async () => {
    const user = await signInTestUser();
    const deck = makeDeckRow.build({ owner_id: user.id });
    server.use(http.get(`${SB}/rest/v1/decks`, () => HttpResponse.json([deck])));
    render(wrap(<RequireOwner deckId={deck.id}>protected</RequireOwner>));
    await waitFor(() => expect(screen.getByText("protected")).toBeInTheDocument());
  });

  it("redirects to /deck/$deckId (read-only) when authenticated but not the owner", async () => {
    // Use the default Alice user (the MSW /auth/v1/user handler always returns Alice).
    // The deck belongs to a different uuid so Alice is not the owner.
    await signInTestUser();
    const deck = makeDeckRow.build({ owner_id: "someone-else" });
    server.use(http.get(`${SB}/rest/v1/decks`, () => HttpResponse.json([deck])));
    render(wrap(<RequireOwner deckId={deck.id}>protected</RequireOwner>));
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({ to: "/deck/$deckId", params: { deckId: deck.id } }),
    );
  });
});
