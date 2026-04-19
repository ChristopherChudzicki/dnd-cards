import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

test("renders a heading", () => {
  render(<h1>hello</h1>);
  expect(screen.getByRole("heading", { name: "hello" })).toBeInTheDocument();
});
