import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LoadingState } from "./LoadingState";

describe("<LoadingState>", () => {
  it("renders the default 'Loading…' label", () => {
    render(<LoadingState />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading…");
  });

  it("renders a custom label", () => {
    render(<LoadingState label="Signing you in…" />);
    expect(screen.getByRole("status")).toHaveTextContent("Signing you in…");
  });
});
