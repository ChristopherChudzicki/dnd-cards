import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test } from "vitest";
import { itemCardFactory } from "../cards/factories";
import { useDeckStore } from "../decks/store";
import { renderWithRouter } from "../test/renderWithRouter";
import { PrintView } from "./PrintView";

beforeEach(() => {
  useDeckStore.setState({ deck: { version: 1, cards: [] } });
});

describe("<PrintView>", () => {
  test("renders one page at 4-up for up to 4 cards", async () => {
    useDeckStore.setState({
      deck: { version: 1, cards: itemCardFactory.buildList(3) },
    });
    await renderWithRouter(<PrintView />);
    expect(screen.getAllByTestId("page")).toHaveLength(1);
  });

  test("renders two pages when there are 5 cards at 4-up", async () => {
    useDeckStore.setState({
      deck: { version: 1, cards: itemCardFactory.buildList(5) },
    });
    await renderWithRouter(<PrintView />);
    expect(screen.getAllByTestId("page")).toHaveLength(2);
  });

  test("switches to 2-up and repaginates accordingly", async () => {
    useDeckStore.setState({
      deck: { version: 1, cards: itemCardFactory.buildList(3) },
    });
    await renderWithRouter(<PrintView />);
    await userEvent.selectOptions(screen.getByLabelText(/cards per page/i), "2");
    expect(screen.getAllByTestId("page")).toHaveLength(2);
  });
});
