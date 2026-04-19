import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test } from "vitest";
import { itemCardFactory } from "../cards/factories";
import { deckFactory } from "../deck/factories";
import { useDeckStore } from "../deck/store";
import { renderWithRouter } from "../test/renderWithRouter";
import { DeckView } from "./DeckView";

beforeEach(() => {
  useDeckStore.setState({ deck: deckFactory.build() });
  localStorage.clear();
});

describe("<DeckView>", () => {
  test("shows empty state when there are no cards", async () => {
    await renderWithRouter(<DeckView />);
    expect(screen.getByText(/no cards yet/i)).toBeInTheDocument();
  });

  test("lists existing cards", async () => {
    const a = itemCardFactory.build();
    const b = itemCardFactory.build();
    useDeckStore.setState({ deck: { version: 1, cards: [a, b] } });

    await renderWithRouter(<DeckView />);
    expect(screen.getByText(a.name)).toBeInTheDocument();
    expect(screen.getByText(b.name)).toBeInTheDocument();
  });

  test("'New card' button adds a card to the store", async () => {
    await renderWithRouter(<DeckView />);
    await userEvent.click(screen.getByRole("button", { name: /new card/i }));
    expect(useDeckStore.getState().deck.cards).toHaveLength(1);
  });

  test("'Delete' removes a card", async () => {
    const card = itemCardFactory.build();
    useDeckStore.setState({ deck: { version: 1, cards: [card] } });
    await renderWithRouter(<DeckView />);

    await userEvent.click(
      screen.getByRole("button", { name: new RegExp(`delete ${card.name}`, "i") }),
    );
    expect(useDeckStore.getState().deck.cards).toEqual([]);
  });
});
