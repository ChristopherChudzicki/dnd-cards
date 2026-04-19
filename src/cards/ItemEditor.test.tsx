import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, test, vi } from "vitest";
import { itemCardFactory } from "./factories";
import { ItemEditor } from "./ItemEditor";
import type { ItemCard } from "./types";

type HarnessProps = {
  initial: ItemCard;
  onEach?: (next: ItemCard) => void;
};

function Harness({ initial, onEach }: HarnessProps) {
  const [card, setCard] = useState(initial);
  return (
    <ItemEditor
      card={card}
      onChange={(next) => {
        setCard(next);
        onEach?.(next);
      }}
    />
  );
}

describe("<ItemEditor>", () => {
  test("typing in the name field updates the rendered value", async () => {
    const card = itemCardFactory.build({ name: "" });
    render(<Harness initial={card} />);

    const nameInput = screen.getByLabelText(/name/i) as HTMLInputElement;
    await userEvent.type(nameInput, "Vorpal");

    expect(nameInput.value).toBe("Vorpal");
  });

  test("onChange is called with the updated card on body edits", async () => {
    const card = itemCardFactory.build({ body: "" });
    const seen: ItemCard[] = [];
    render(<Harness initial={card} onEach={(c) => seen.push(c)} />);

    await userEvent.type(screen.getByLabelText(/body/i), "hi");

    expect(seen[seen.length - 1]?.body).toBe("hi");
  });

  test("updates updatedAt on every change", async () => {
    const card = itemCardFactory.build({ updatedAt: "2000-01-01T00:00:00.000Z" });
    const onEach = vi.fn<(c: ItemCard) => void>();
    render(<Harness initial={card} onEach={onEach} />);

    await userEvent.type(screen.getByLabelText(/name/i), "x");

    const lastCall = onEach.mock.lastCall?.[0];
    expect(lastCall?.updatedAt).not.toBe("2000-01-01T00:00:00.000Z");
  });
});
