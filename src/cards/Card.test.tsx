import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { Card } from "./Card";
import { itemCardFactory } from "./factories";

describe("<Card>", () => {
  test("shows name, type line, and body", () => {
    const card = itemCardFactory.build();
    render(<Card card={card} layout="4-up" />);
    expect(screen.getByRole("heading", { name: card.name })).toBeInTheDocument();
    expect(screen.getByText(card.typeLine)).toBeInTheDocument();
    expect(screen.getByText(card.body)).toBeInTheDocument();
  });

  test("renders cost/weight when present", () => {
    const card = itemCardFactory.build({ costWeight: "500 gp · 15 lb" });
    render(<Card card={card} layout="4-up" />);
    expect(screen.getByText("500 gp · 15 lb")).toBeInTheDocument();
  });

  test("omits footer when cost/weight is absent", () => {
    const card = itemCardFactory.build({ costWeight: undefined });
    render(<Card card={card} layout="4-up" />);
    expect(screen.queryByTestId("card-footer")).not.toBeInTheDocument();
  });

  test("renders image when imageUrl is set", () => {
    const card = itemCardFactory.build({ imageUrl: "https://example.com/pic.png" });
    render(<Card card={card} layout="4-up" />);
    const img = screen.getByTestId("card-image");
    expect(img).toHaveAttribute("src", "https://example.com/pic.png");
  });

  test("splits body on blank lines into paragraphs", () => {
    const card = itemCardFactory.build({ body: "First paragraph.\n\nSecond paragraph." });
    render(<Card card={card} layout="4-up" />);
    expect(screen.getByText("First paragraph.")).toBeInTheDocument();
    expect(screen.getByText("Second paragraph.")).toBeInTheDocument();
  });

  test("replaces the image with a fallback icon when the src fails to load", () => {
    const card = itemCardFactory.build({ imageUrl: "https://example.com/broken.png" });
    render(<Card card={card} layout="4-up" />);
    const img = screen.getByTestId("card-image");
    fireEvent.error(img);
    expect(screen.queryByTestId("card-image")).not.toBeInTheDocument();
    expect(screen.getByTestId("card-fallback-icon")).toBeInTheDocument();
  });

  test("shows a fallback icon when the card has no imageUrl", () => {
    const card = itemCardFactory.build({ imageUrl: undefined });
    render(<Card card={card} layout="4-up" />);
    expect(screen.queryByTestId("card-image")).not.toBeInTheDocument();
    expect(screen.getByTestId("card-fallback-icon")).toBeInTheDocument();
  });

  test("renders the heuristic-picked icon when iconKey is unset", () => {
    const card = itemCardFactory.build({
      name: "Flame Tongue Trident",
      typeLine: "Weapon, rare",
      imageUrl: undefined,
      iconKey: undefined,
    });
    render(<Card card={card} layout="4-up" />);
    const slot = screen.getByTestId("card-fallback-icon");
    expect(slot.querySelector("svg")).not.toBeNull();
  });

  test("renders the explicit override icon when iconKey is set", () => {
    const card = itemCardFactory.build({
      name: "Anything",
      typeLine: "",
      imageUrl: undefined,
      iconKey: "trident",
    });
    render(<Card card={card} layout="4-up" />);
    const slot = screen.getByTestId("card-fallback-icon");
    expect(slot.querySelector("svg")).not.toBeNull();
  });

  test("does not crash for a stale or unknown iconKey", () => {
    const card = itemCardFactory.build({
      name: "X",
      typeLine: "",
      imageUrl: undefined,
      iconKey: "definitely-removed-icon",
    });
    expect(() => render(<Card card={card} layout="4-up" />)).not.toThrow();
  });
});
