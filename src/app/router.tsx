import { createRootRoute, createRoute, createRouter, RouterProvider } from "@tanstack/react-router";
import { DeckView } from "../views/DeckView";
import { EditorView } from "../views/EditorView";
import { PrintView } from "../views/PrintView";
import { Root } from "./Root";

const rootRoute = createRootRoute({ component: Root });

const deckRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: DeckView,
});

const editorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/editor/$id",
  component: () => <EditorView />,
});

const printRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/print",
  component: PrintView,
});

const routeTree = rootRoute.addChildren([deckRoute, editorRoute, printRoute]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export { RouterProvider };
