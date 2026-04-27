import { createRootRoute, createRoute, createRouter, RouterProvider } from "@tanstack/react-router";
import { AuthCallback } from "../auth/AuthCallback";
import { LoginView } from "../auth/LoginView";
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

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginView,
});

const authCallbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/auth/callback",
  component: AuthCallback,
});

const routeTree = rootRoute.addChildren([
  deckRoute,
  editorRoute,
  printRoute,
  loginRoute,
  authCallbackRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export { RouterProvider };
