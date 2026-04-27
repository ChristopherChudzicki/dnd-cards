import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { type ReactNode, StrictMode } from "react";
import { describe, expect, test, vi } from "vitest";
import { magicItemDetail2024Factory, magicItemIndexEntryFactory } from "../api/factories";
import { makeCardRow } from "../test/factories";
import {
  apiErrorHandler,
  magicItemDetailHandler,
  magicItemIndexHandler,
  SB_URL,
  server,
} from "../test/msw";
import { BrowseApiModal } from "./BrowseApiModal";

const wrap = (ui: ReactNode) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
};

describe("<BrowseApiModal>", () => {
  test("shows index entries once the list loads", async () => {
    const entryA = magicItemIndexEntryFactory.build({ name: "Bag of Holding" });
    const entryB = magicItemIndexEntryFactory.build({ name: "Cloak of Protection" });
    server.use(magicItemIndexHandler("2024", { count: 2, results: [entryA, entryB] }));

    wrap(<BrowseApiModal deckId="d1" onClose={() => {}} onSelected={() => {}} />);

    expect(await screen.findByText("Bag of Holding")).toBeInTheDocument();
    expect(screen.getByText("Cloak of Protection")).toBeInTheDocument();
  });

  test("search filters the list", async () => {
    const entryA = magicItemIndexEntryFactory.build({ name: "Bag of Holding" });
    const entryB = magicItemIndexEntryFactory.build({ name: "Cloak of Protection" });
    server.use(magicItemIndexHandler("2024", { count: 2, results: [entryA, entryB] }));

    wrap(<BrowseApiModal deckId="d1" onClose={() => {}} onSelected={() => {}} />);

    await screen.findByText("Bag of Holding");
    await userEvent.type(screen.getByPlaceholderText(/search/i), "bag");

    expect(screen.getByText("Bag of Holding")).toBeInTheDocument();
    expect(screen.queryByText("Cloak of Protection")).not.toBeInTheDocument();
  });

  test("switching ruleset loads a different list", async () => {
    const v2024 = magicItemIndexEntryFactory.build({ name: "Ring A" });
    const v2014 = magicItemIndexEntryFactory.build({ name: "Ring Z" });
    server.use(
      magicItemIndexHandler("2024", { count: 1, results: [v2024] }),
      magicItemIndexHandler("2014", { count: 1, results: [v2014] }),
    );

    wrap(<BrowseApiModal deckId="d1" onClose={() => {}} onSelected={() => {}} />);

    await screen.findByText("Ring A");
    await userEvent.click(screen.getByRole("button", { name: /2014/i }));

    await waitFor(() => expect(screen.getByText("Ring Z")).toBeInTheDocument());
    expect(screen.queryByText("Ring A")).not.toBeInTheDocument();
  });

  test("clicking a row POSTs the card to the persistence layer and calls onSelected", async () => {
    const entry = magicItemIndexEntryFactory.build({ name: "Bag of Holding" });
    const detail = magicItemDetail2024Factory.build({
      index: entry.index,
      name: entry.name,
    });
    server.use(
      magicItemIndexHandler("2024", { count: 1, results: [entry] }),
      magicItemDetailHandler("2024", entry.index, detail),
    );
    const onPost = vi.fn();
    server.use(
      http.post(`${SB_URL}/rest/v1/cards`, async ({ request }) => {
        onPost(await request.json());
        return HttpResponse.json([makeCardRow.build()], { status: 201 });
      }),
    );
    const onSelected = vi.fn();

    wrap(<BrowseApiModal deckId="d1" onClose={() => {}} onSelected={onSelected} />);

    await userEvent.click(await screen.findByText("Bag of Holding"));

    await waitFor(() => expect(onPost).toHaveBeenCalled());
    expect(onSelected).toHaveBeenCalled();
  });

  test("clicking the same row only POSTs once even under StrictMode double-render", async () => {
    const entry = magicItemIndexEntryFactory.build({ name: "Flame Tongue" });
    const detail = magicItemDetail2024Factory.build({
      index: entry.index,
      name: entry.name,
    });
    server.use(
      magicItemIndexHandler("2024", { count: 1, results: [entry] }),
      magicItemDetailHandler("2024", entry.index, detail),
    );
    const onPost = vi.fn();
    server.use(
      http.post(`${SB_URL}/rest/v1/cards`, async ({ request }) => {
        onPost(await request.json());
        return HttpResponse.json([makeCardRow.build()], { status: 201 });
      }),
    );

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <StrictMode>
        <QueryClientProvider client={client}>
          <BrowseApiModal deckId="d1" onClose={() => {}} onSelected={() => {}} />
        </QueryClientProvider>
      </StrictMode>,
    );

    await userEvent.click(await screen.findByText("Flame Tongue"));

    await waitFor(() => expect(onPost).toHaveBeenCalledTimes(1));
    // Give any stray effects a chance to fire before asserting final count.
    await new Promise((r) => setTimeout(r, 50));
    expect(onPost).toHaveBeenCalledTimes(1);
  });

  test("Escape calls onClose", async () => {
    const onClose = vi.fn();
    server.use(magicItemIndexHandler("2024", { count: 0, results: [] }));

    wrap(<BrowseApiModal deckId="d1" onClose={onClose} onSelected={() => {}} />);

    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  test("error state shows retry button", async () => {
    server.use(apiErrorHandler("/api/2024/magic-items", 500));

    wrap(<BrowseApiModal deckId="d1" onClose={() => {}} onSelected={() => {}} />);

    expect(await screen.findByRole("button", { name: /retry/i })).toBeInTheDocument();
  });
});
