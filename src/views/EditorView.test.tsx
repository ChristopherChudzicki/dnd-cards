import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test } from "vitest";
import { itemCardFactory } from "../cards/factories";
import { useDeckStore } from "../deck/store";
import { renderWithRouter } from "../test/renderWithRouter";
import { EditorView } from "./EditorView";

beforeEach(() => {
  useDeckStore.setState({ deck: { version: 1, cards: [] } });
  localStorage.clear();
});

describe("<EditorView>", () => {
  test("edits the card identified by the cardId prop", async () => {
    const card = itemCardFactory.build({ name: "Old" });
    useDeckStore.setState({ deck: { version: 1, cards: [card] } });

    await renderWithRouter(<EditorView cardId={card.id} />);

    await userEvent.clear(screen.getByLabelText(/name/i));
    await userEvent.type(screen.getByLabelText(/name/i), "New");

    const stored = useDeckStore.getState().deck.cards[0];
    expect(stored?.name).toBe("New");
  });

  test("shows not-found state when the card is missing", async () => {
    await renderWithRouter(<EditorView cardId="missing" />);
    expect(screen.getByText(/card not found/i)).toBeInTheDocument();
  });

  test("renders a live preview alongside the form", async () => {
    const card = itemCardFactory.build();
    useDeckStore.setState({ deck: { version: 1, cards: [card] } });
    await renderWithRouter(<EditorView cardId={card.id} />);
    expect(screen.getByRole("heading", { name: card.name })).toBeInTheDocument();
  });
});
