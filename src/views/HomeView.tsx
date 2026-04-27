import { Link, useNavigate } from "@tanstack/react-router";
import { useSession } from "../auth/useSession";
import { useCreateDeck, useDeleteDeck } from "../decks/mutations";
import { useDecks } from "../decks/queries";
import styles from "./HomeView.module.css";

export function HomeView() {
  const session = useSession();
  const navigate = useNavigate();
  const ownerId = session.status === "authenticated" ? session.user.id : undefined;
  const decks = useDecks(ownerId);
  const createDeck = useCreateDeck();
  const deleteDeck = useDeleteDeck();

  if (session.status === "loading") return null;

  if (session.status === "unauthenticated") {
    return (
      <section className={styles.splash}>
        <h2>D&amp;D Cards</h2>
        <p>Sign in to create and edit decks. Anyone can view shared decks via link.</p>
        <Link to="/login" className={styles.cta}>
          Sign in
        </Link>
      </section>
    );
  }

  const handleCreate = async () => {
    if (!ownerId) return;
    const deck = await createDeck.mutateAsync({ name: "Untitled deck", ownerId });
    // @ts-expect-error -- /deck/$deckId registered in T20; remove this directive then.
    navigate({ to: "/deck/$deckId", params: { deckId: deck.id } });
  };

  const handleDelete = (deckId: string, name: string) => {
    if (!window.confirm(`Delete "${name}" and all its cards?`)) return;
    deleteDeck.mutate(deckId);
  };

  if (!decks.data || decks.data.length === 0) {
    return (
      <section className={styles.empty}>
        <h2>No decks yet</h2>
        <button type="button" onClick={handleCreate} disabled={createDeck.isPending}>
          Create your first deck
        </button>
      </section>
    );
  }

  return (
    <section>
      <header className={styles.header}>
        <h2>Your decks</h2>
        <button type="button" onClick={handleCreate} disabled={createDeck.isPending}>
          New deck
        </button>
      </header>
      <ul className={styles.list}>
        {decks.data.map((d) => (
          <li key={d.id} className={styles.row}>
            {/* @ts-expect-error -- /deck/$deckId registered in T20; remove this directive then. */}
            <Link to="/deck/$deckId" params={{ deckId: d.id }} className={styles.deckLink}>
              {d.name}
            </Link>
            <button
              type="button"
              className={styles.deleteBtn}
              aria-label={`Delete ${d.name}`}
              onClick={() => handleDelete(d.id, d.name)}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
