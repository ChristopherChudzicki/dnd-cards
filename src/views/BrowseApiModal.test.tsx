import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ReactNode, StrictMode } from "react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { magicItemDetail2024Factory, magicItemIndexEntryFactory } from "../api/factories";
import { useDeckStore } from "../deck/store";
import {
  apiErrorHandler,
  magicItemDetailHandler,
  magicItemIndexHandler,
  server,
} from "../test/msw";
import { BrowseApiModal } from "./BrowseApiModal";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

beforeEach(() => {
  useDeckStore.setState({ deck: { version: 1, cards: [] } });
});

const wrap = (ui: ReactNode) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
};

describe("<BrowseApiModal>", () => {
  test("shows index entries once the list loads", async () => {
    const entryA = magicItemIndexEntryFactory.build({ name: "Bag of Holding" });
    const entryB = magicItemIndexEntryFactory.build({ name: "Cloak of Protection" });
    server.use(magicItemIndexHandler("2024", { count: 2, results: [entryA, entryB] }));

    wrap(<BrowseApiModal onClose={() => {}} onSelected={() => {}} />);

    expect(await screen.findByText("Bag of Holding")).toBeInTheDocument();
    expect(screen.getByText("Cloak of Protection")).toBeInTheDocument();
  });

  test("search filters the list", async () => {
    const entryA = magicItemIndexEntryFactory.build({ name: "Bag of Holding" });
    const entryB = magicItemIndexEntryFactory.build({ name: "Cloak of Protection" });
    server.use(magicItemIndexHandler("2024", { count: 2, results: [entryA, entryB] }));

    wrap(<BrowseApiModal onClose={() => {}} onSelected={() => {}} />);

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

    wrap(<BrowseApiModal onClose={() => {}} onSelected={() => {}} />);

    await screen.findByText("Ring A");
    await userEvent.click(screen.getByRole("button", { name: /2014/i }));

    await waitFor(() => expect(screen.getByText("Ring Z")).toBeInTheDocument());
    expect(screen.queryByText("Ring A")).not.toBeInTheDocument();
  });

  test("clicking a row creates a card in the deck store and calls onSelected", async () => {
    const entry = magicItemIndexEntryFactory.build({ name: "Bag of Holding" });
    const detail = magicItemDetail2024Factory.build({
      index: entry.index,
      name: entry.name,
    });
    server.use(
      magicItemIndexHandler("2024", { count: 1, results: [entry] }),
      magicItemDetailHandler("2024", entry.index, detail),
    );
    const onSelected = vi.fn();

    wrap(<BrowseApiModal onClose={() => {}} onSelected={onSelected} />);

    await userEvent.click(await screen.findByText("Bag of Holding"));

    await waitFor(() => {
      expect(useDeckStore.getState().deck.cards).toHaveLength(1);
    });
    const created = useDeckStore.getState().deck.cards[0];
    expect(created?.source).toBe("api");
    expect(onSelected).toHaveBeenCalledWith(created?.id);
  });

  test("clicking the same row only creates one card even under StrictMode double-render", async () => {
    const entry = magicItemIndexEntryFactory.build({ name: "Flame Tongue" });
    const detail = magicItemDetail2024Factory.build({
      index: entry.index,
      name: entry.name,
    });
    server.use(
      magicItemIndexHandler("2024", { count: 1, results: [entry] }),
      magicItemDetailHandler("2024", entry.index, detail),
    );

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <StrictMode>
        <QueryClientProvider client={client}>
          <BrowseApiModal onClose={() => {}} onSelected={() => {}} />
        </QueryClientProvider>
      </StrictMode>,
    );

    await userEvent.click(await screen.findByText("Flame Tongue"));

    await waitFor(() => {
      expect(useDeckStore.getState().deck.cards).toHaveLength(1);
    });
    // Give any stray effects a chance to fire before asserting final count.
    await new Promise((r) => setTimeout(r, 50));
    expect(useDeckStore.getState().deck.cards).toHaveLength(1);
  });

  test("Escape calls onClose", async () => {
    const onClose = vi.fn();
    server.use(magicItemIndexHandler("2024", { count: 0, results: [] }));

    wrap(<BrowseApiModal onClose={onClose} onSelected={() => {}} />);

    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });

  test("error state shows retry button", async () => {
    server.use(apiErrorHandler("/api/2024/magic-items", 500));

    wrap(<BrowseApiModal onClose={() => {}} onSelected={() => {}} />);

    expect(await screen.findByRole("button", { name: /retry/i })).toBeInTheDocument();
  });
});
