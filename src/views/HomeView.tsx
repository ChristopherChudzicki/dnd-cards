import { Link, useNavigate } from "@tanstack/react-router";
import { type ChangeEvent, useRef } from "react";
import { useSession } from "../auth/useSession";
import { parseDeckJson } from "../decks/io";
import { useCreateDeck, useDeleteDeck, useSaveCard } from "../decks/mutations";
import { useDecks } from "../decks/queries";
import { newId } from "../lib/id";
import { Button } from "../lib/ui/Button";
import { IconButton } from "../lib/ui/IconButton";
import { TrashIcon } from "../lib/ui/icons/TrashIcon";
import styles from "./HomeView.module.css";

export function HomeView() {
  const session = useSession();
  const navigate = useNavigate();
  const ownerId = session.status === "authenticated" ? session.user.id : undefined;
  const decks = useDecks(ownerId);
  const createDeck = useCreateDeck();
  const deleteDeck = useDeleteDeck();
  const saveCard = useSaveCard();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !ownerId) return;
    try {
      const text = await file.text();
      const result = parseDeckJson(text);
      if (!result.ok) {
        alert(`Import failed: ${result.error}`);
        return;
      }
      const name = file.name.replace(/\.json$/i, "") || "Imported deck";
      const deck = await createDeck.mutateAsync({ name, ownerId });
      try {
        for (const card of result.deck.cards) {
          const fresh = { ...card, id: newId() };
          await saveCard.mutateAsync({ card: fresh, deckId: deck.id, isNew: true });
        }
      } catch (err) {
        await deleteDeck.mutateAsync(deck.id).catch(() => {});
        alert(`Import failed mid-way: ${err instanceof Error ? err.message : "unknown error"}`);
        return;
      }
      navigate({ to: "/deck/$deckId", params: { deckId: deck.id } });
    } finally {
      e.target.value = "";
    }
  };

  const handleCreate = async () => {
    if (!ownerId) return;
    const deck = await createDeck.mutateAsync({ name: "Untitled deck", ownerId });
    navigate({ to: "/deck/$deckId", params: { deckId: deck.id } });
  };

  const handleDelete = (deckId: string, name: string) => {
    if (!window.confirm(`Delete "${name}" and all its cards?`)) return;
    deleteDeck.mutate(deckId);
  };

  if (decks.isLoading) return <p>Loading…</p>;

  if (!decks.data || decks.data.length === 0) {
    return (
      <section className={styles.empty}>
        <h2>No decks yet</h2>
        <div className={styles.headerActions}>
          <Button variant="secondary" onPress={() => fileInputRef.current?.click()}>
            Import JSON
          </Button>
          <Button variant="primary" onPress={handleCreate} isDisabled={createDeck.isPending}>
            Create your first deck
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          aria-label="Import JSON"
          hidden
          onChange={handleImport}
        />
      </section>
    );
  }

  return (
    <section>
      <header className={styles.header}>
        <h2>Your decks</h2>
        <div className={styles.headerActions}>
          <Button variant="secondary" onPress={() => fileInputRef.current?.click()}>
            Import JSON
          </Button>
          <Button variant="primary" onPress={handleCreate} isDisabled={createDeck.isPending}>
            New deck
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          aria-label="Import JSON"
          hidden
          onChange={handleImport}
        />
      </header>
      <ul className={styles.list}>
        {decks.data.map((d) => (
          <li key={d.id} className={styles.row}>
            <Link to="/deck/$deckId" params={{ deckId: d.id }} className={styles.deckLink}>
              {d.name}
            </Link>
            <IconButton
              aria-label={`Delete ${d.name}`}
              variant="danger"
              onPress={() => handleDelete(d.id, d.name)}
            >
              <TrashIcon />
            </IconButton>
          </li>
        ))}
      </ul>
    </section>
  );
}
