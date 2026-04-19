import { createRootRoute, createRoute, createRouter, RouterProvider } from "@tanstack/react-router";
import { Root } from "./Root";

const rootRoute = createRootRoute({ component: Root });

const deckRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => <div>Deck view (placeholder)</div>,
});

const editorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/editor/$id",
  component: () => <div>Editor (placeholder)</div>,
});

const printRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/print",
  component: () => <div>Print (placeholder)</div>,
});

const routeTree = rootRoute.addChildren([deckRoute, editorRoute, printRoute]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export { RouterProvider };
