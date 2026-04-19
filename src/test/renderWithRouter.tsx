import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { type RenderResult, render, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

export async function renderWithRouter(ui: ReactNode, initialPath = "/"): Promise<RenderResult> {
  const rootRoute = createRootRoute({ component: () => <>{ui}</> });
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  });
  await router.load();
  const result = render(<RouterProvider router={router} />);
  await waitFor(() => {
    if (document.body.textContent?.trim() === "") throw new Error("router still loading");
  });
  return result;
}
