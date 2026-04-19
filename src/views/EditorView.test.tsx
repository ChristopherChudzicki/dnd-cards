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

  test("typing updates the preview but not the store until Save", async () => {
    const card = itemCardFactory.build({ name: "Before" });
    useDeckStore.setState({ deck: { version: 1, cards: [card] } });
    await renderWithRouter(<EditorView cardId={card.id} />);

    await userEvent.clear(screen.getByLabelText(/name/i));
    await userEvent.type(screen.getByLabelText(/name/i), "After");

    expect(screen.getByRole("heading", { name: "After" })).toBeInTheDocument();
    expect(useDeckStore.getState().deck.cards[0]?.name).toBe("Before");
  });

  test("Save commits the draft to the store", async () => {
    const card = itemCardFactory.build({ name: "Before" });
    useDeckStore.setState({ deck: { version: 1, cards: [card] } });
    await renderWithRouter(<EditorView cardId={card.id} />);

    await userEvent.clear(screen.getByLabelText(/name/i));
    await userEvent.type(screen.getByLabelText(/name/i), "After");
    await userEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(useDeckStore.getState().deck.cards[0]?.name).toBe("After");
  });

  test("Cancel leaves existing card unchanged in the store", async () => {
    const card = itemCardFactory.build({ name: "Original" });
    useDeckStore.setState({ deck: { version: 1, cards: [card] } });
    await renderWithRouter(<EditorView cardId={card.id} />);

    await userEvent.clear(screen.getByLabelText(/name/i));
    await userEvent.type(screen.getByLabelText(/name/i), "Different");
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(useDeckStore.getState().deck.cards[0]?.name).toBe("Original");
  });

  test("shows template notice for API items whose body says '(Any …)'", async () => {
    const card = itemCardFactory.build({
      source: "api",
      apiRef: { system: "dnd5eapi", slug: "flame-tongue", ruleset: "2024" },
      body: "Weapon (Any Melee Weapon). While holding this magic weapon…",
    });
    useDeckStore.setState({ deck: { version: 1, cards: [card] } });
    await renderWithRouter(<EditorView cardId={card.id} />);
    expect(screen.getByTestId("template-notice")).toBeInTheDocument();
  });

  test("does not show template notice for concrete API items", async () => {
    const card = itemCardFactory.build({
      source: "api",
      apiRef: { system: "dnd5eapi", slug: "bag-of-holding", ruleset: "2024" },
      body: "This bag has an interior space considerably larger…",
    });
    useDeckStore.setState({ deck: { version: 1, cards: [card] } });
    await renderWithRouter(<EditorView cardId={card.id} />);
    expect(screen.queryByTestId("template-notice")).not.toBeInTheDocument();
  });

  test("does not show template notice for custom items even if body contains '(any'", async () => {
    const card = itemCardFactory.build({
      source: "custom",
      body: "Any hostile creature within 30 feet…",
    });
    useDeckStore.setState({ deck: { version: 1, cards: [card] } });
    await renderWithRouter(<EditorView cardId={card.id} />);
    expect(screen.queryByTestId("template-notice")).not.toBeInTheDocument();
  });

  test("Cancel removes a pristine new card from the store", async () => {
    const now = "2026-04-19T12:00:00.000Z";
    const pristine = itemCardFactory.build({
      name: "Untitled item",
      typeLine: "",
      body: "",
      costWeight: undefined,
      imageUrl: undefined,
      createdAt: now,
      updatedAt: now,
    });
    useDeckStore.setState({ deck: { version: 1, cards: [pristine] } });
    await renderWithRouter(<EditorView cardId={pristine.id} />);

    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(useDeckStore.getState().deck.cards).toEqual([]);
  });
});
