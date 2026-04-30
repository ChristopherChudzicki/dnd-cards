import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, test } from "vitest";
import { IconPickerDialog } from "./IconPickerDialog";

function Harness({ initial }: { initial: string | undefined }) {
  const [value, setValue] = useState<string | undefined>(initial);
  return (
    <>
      <IconPickerDialog value={value} onChange={setValue} />
      <div data-testid="value">{value === undefined ? "<auto>" : value}</div>
    </>
  );
}

// react-aria-components' GridListItem uses role="row" (not "option").
// Each tile carries the kebab key (or "Auto") as its accessible name via textValue.
const tile = (name: RegExp | string) => screen.getByRole("row", { name });
const queryTile = (name: RegExp | string) => screen.queryByRole("row", { name });

describe("<IconPickerDialog>", () => {
  test("opens on trigger press", async () => {
    render(<Harness initial={undefined} />);
    await userEvent.click(screen.getByRole("button", { name: /pick icon/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  test("selecting the Auto tile sets value to undefined and closes", async () => {
    render(<Harness initial="trident" />);
    await userEvent.click(screen.getByRole("button", { name: /pick icon/i }));
    await userEvent.click(tile(/auto/i));
    expect(screen.getByTestId("value")).toHaveTextContent("<auto>");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("selecting a curated tile sets the kebab key and closes", async () => {
    render(<Harness initial={undefined} />);
    await userEvent.click(screen.getByRole("button", { name: /pick icon/i }));
    await userEvent.click(tile("trident"));
    expect(screen.getByTestId("value")).toHaveTextContent("trident");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("search filters visible tiles", async () => {
    render(<Harness initial={undefined} />);
    await userEvent.click(screen.getByRole("button", { name: /pick icon/i }));
    await userEvent.type(screen.getByRole("searchbox"), "trident");
    expect(tile("trident")).toBeInTheDocument();
    expect(queryTile("broadsword")).not.toBeInTheDocument();
  });

  test("trigger button shows the current key when one is set", () => {
    render(<Harness initial="trident" />);
    expect(screen.getByRole("button", { name: /pick icon.*trident/i })).toBeInTheDocument();
  });

  test("trigger button shows 'Auto' when value is undefined", () => {
    render(<Harness initial={undefined} />);
    expect(screen.getByRole("button", { name: /pick icon.*auto/i })).toBeInTheDocument();
  });
});
