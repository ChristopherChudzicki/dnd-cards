import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useSession } from "../auth/useSession";
import { serializeDeck } from "../decks/io";
import { useDeleteCard, useRenameDeck } from "../decks/mutations";
import { useDeck, useDeckCards } from "../decks/queries";
import { downloadText } from "../lib/download";
import { BrowseApiModal } from "./BrowseApiModal";
import styles from "./DeckView.module.css";

type Props = { deckId: string };

export function DeckView({ deckId }: Props) {
  const session = useSession();
  const deckQuery = useDeck(deckId);
  const cardsQuery = useDeckCards(deckId);
  const renameDeck = useRenameDeck();
  const deleteCard = useDeleteCard();
  const [browseOpen, setBrowseOpen] = useState(false);

  if (deckQuery.isLoading || cardsQuery.isLoading) return <p>Loading…</p>;
  if (!deckQuery.data) return <p>This deck no longer exists.</p>;

  const deck = deckQuery.data;
  const cards = cardsQuery.data ?? [];
  const isOwner = session.status === "authenticated" && session.user.id === deck.owner_id;

  const handleExport = () => {
    downloadText(`${deck.name}.json`, serializeDeck({ version: 1, cards }));
  };

  return (
    <section>
      <header className={styles.header}>
        {isOwner ? (
          <DeckTitle name={deck.name} onRename={(n) => renameDeck.mutate({ deckId, name: n })} />
        ) : (
          <h2 className={styles.title}>{deck.name}</h2>
        )}
        <div className={styles.actions}>
          <button type="button" onClick={handleExport} disabled={cards.length === 0}>
            Export JSON
          </button>
          <Link to="/deck/$deckId/print" params={{ deckId }} className={styles.printLink}>
            Print
          </Link>
          {isOwner && (
            <>
              <button type="button" onClick={() => setBrowseOpen(true)}>
                Browse from API
              </button>
              <Link
                to="/deck/$deckId/edit/$cardId"
                params={{ deckId, cardId: "new" }}
                className={styles.newCardLink}
              >
                New card
              </Link>
            </>
          )}
        </div>
      </header>

      {cards.length === 0 ? (
        <p className={styles.empty}>No cards yet.</p>
      ) : (
        <ul className={styles.list}>
          {cards.map((card) => (
            <li key={card.id} className={styles.row}>
              <div className={styles.rowMain}>
                {isOwner ? (
                  <Link
                    to="/deck/$deckId/edit/$cardId"
                    params={{ deckId, cardId: card.id }}
                    className={styles.cardLink}
                  >
                    <strong>{card.name}</strong>
                  </Link>
                ) : (
                  <strong>{card.name}</strong>
                )}
                {card.kind === "item" && card.typeLine && (
                  <span className={styles.typeLine}>{card.typeLine}</span>
                )}
              </div>
              {isOwner && (
                <button
                  type="button"
                  className={styles.deleteBtn}
                  aria-label={`Delete ${card.name}`}
                  onClick={() => deleteCard.mutate({ cardId: card.id, deckId })}
                >
                  Delete
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {browseOpen && (
        <BrowseApiModal
          deckId={deckId}
          onClose={() => setBrowseOpen(false)}
          onSelected={() => setBrowseOpen(false)}
        />
      )}
    </section>
  );
}

function DeckTitle({ name, onRename }: { name: string; onRename: (next: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  if (!editing) {
    // The <h2> stays a heading (preserves landmark navigation) while the
    // <button> sibling provides an explicit, focusable rename affordance.
    return (
      <div className={styles.titleRow}>
        <h2 className={styles.title}>{name}</h2>
        <button
          type="button"
          className={styles.renameBtn}
          aria-label={`Rename deck ${name}`}
          onClick={() => {
            setDraft(name);
            setEditing(true);
          }}
        >
          Rename
        </button>
      </div>
    );
  }
  return (
    <input
      className={styles.titleInput}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft && draft !== name) onRename(draft);
        setEditing(false);
      }}
      aria-label={`Rename deck (currently: ${name})`}
      // biome-ignore lint/a11y/noAutofocus: user just clicked to enter edit mode
      autoFocus
    />
  );
}
