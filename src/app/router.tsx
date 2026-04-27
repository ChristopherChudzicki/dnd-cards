import { createRootRoute, createRoute, createRouter, RouterProvider } from "@tanstack/react-router";
import { AuthCallback } from "../auth/AuthCallback";
import { LoginView } from "../auth/LoginView";
import { RequireOwner } from "../auth/RequireOwner";
import { DeckView } from "../views/DeckView";
import { EditorView } from "../views/EditorView";
import { HomeView } from "../views/HomeView";
import { PrintView } from "../views/PrintView";
import { Root } from "./Root";

const rootRoute = createRootRoute({ component: Root });

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomeView,
});

const deckViewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/deck/$deckId",
  component: function DeckViewRoute() {
    const { deckId } = deckViewRoute.useParams();
    return <DeckView deckId={deckId} />;
  },
});

const editorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/deck/$deckId/edit/$cardId",
  component: function EditorRoute() {
    const { deckId } = editorRoute.useParams();
    return (
      <RequireOwner deckId={deckId}>
        <EditorView />
      </RequireOwner>
    );
  },
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
  homeRoute,
  deckViewRoute,
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
