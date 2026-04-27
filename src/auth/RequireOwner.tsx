import { useNavigate } from "@tanstack/react-router";
import { type ReactNode, useEffect } from "react";
import { useDeck } from "../decks/queries";
import { useSession } from "./useSession";

type Props = { deckId: string; children: ReactNode };

export function RequireOwner({ deckId, children }: Props) {
  const session = useSession();
  const deckQuery = useDeck(deckId);
  const navigate = useNavigate();

  const sessionLoading = session.status === "loading";
  const userId = session.status === "authenticated" ? session.user.id : null;
  const ownerId = deckQuery.data?.owner_id;

  useEffect(() => {
    if (sessionLoading || deckQuery.isLoading) return;

    if (!userId) {
      const next = `${window.location.pathname}${window.location.search}`;
      // Routes /login and /deck/$deckId are added in T18; cast until then.
      (navigate as (opts: unknown) => void)({ to: "/login", search: { next } });
      return;
    }
    if (ownerId && ownerId !== userId) {
      (navigate as (opts: unknown) => void)({ to: "/deck/$deckId", params: { deckId } });
    }
  }, [sessionLoading, deckQuery.isLoading, userId, ownerId, deckId, navigate]);

  if (sessionLoading || deckQuery.isLoading) return null;
  if (!userId) return null;
  if (ownerId !== userId) return null;
  return <>{children}</>;
}
