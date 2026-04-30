import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { ResolvedIcon } from "./resolveIcon";

describe("<ResolvedIcon>", () => {
  test("renders a curated icon", async () => {
    render(<ResolvedIcon iconKey="trident" data-testid="ico" />);
    await waitFor(() => {
      expect(screen.getByTestId("ico").querySelector("svg")).not.toBeNull();
    });
  });

  test("renders without crashing for an unknown key", async () => {
    render(<ResolvedIcon iconKey="definitely-not-a-real-icon" data-testid="ico" />);
    await waitFor(() => {
      expect(screen.getByTestId("ico")).toBeInTheDocument();
    });
  });
});
