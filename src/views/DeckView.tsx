import { Link, useNavigate } from "@tanstack/react-router";
import { type ChangeEvent, useRef } from "react";
import { parseDeckJson, serializeDeck } from "../deck/io";
import { useDeckStore } from "../deck/store";
import { downloadText } from "../lib/download";
import { newId } from "../lib/id";
import { nowIso } from "../lib/time";
import styles from "./DeckView.module.css";

export function DeckView() {
  const deck = useDeckStore((s) => s.deck);
  const upsertCard = useDeckStore((s) => s.upsertCard);
  const removeCard = useDeckStore((s) => s.removeCard);
  const replaceDeck = useDeckStore((s) => s.replaceDeck);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleNew = () => {
    const id = newId();
    const now = nowIso();
    upsertCard({
      id,
      kind: "item",
      name: "Untitled item",
      typeLine: "",
      body: "",
      source: "custom",
      createdAt: now,
      updatedAt: now,
    });
    navigate({ to: "/editor/$id", params: { id } });
  };

  const handleExport = () => {
    downloadText("deck.json", serializeDeck(deck));
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const result = parseDeckJson(text);
    if (result.ok) {
      replaceDeck(result.deck);
    } else {
      alert(`Import failed: ${result.error}`);
    }
    e.target.value = "";
  };

  return (
    <section>
      <header className={styles.header}>
        <h2 className={styles.title}>Deck</h2>
        <div className={styles.actions}>
          <button type="button" onClick={handleImportClick}>
            Import JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            hidden
            onChange={handleImport}
          />
          <button type="button" onClick={handleExport} disabled={deck.cards.length === 0}>
            Export JSON
          </button>
          <button type="button" onClick={handleNew}>
            New card
          </button>
        </div>
      </header>

      {deck.cards.length === 0 ? (
        <p className={styles.empty}>No cards yet. Create one or import JSON.</p>
      ) : (
        <ul className={styles.list}>
          {deck.cards.map((card) => (
            <li key={card.id} className={styles.row}>
              <div className={styles.rowMain}>
                <Link to="/editor/$id" params={{ id: card.id }} className={styles.cardLink}>
                  <strong>{card.name}</strong>
                </Link>
                {card.kind === "item" && card.typeLine && (
                  <span className={styles.typeLine}>{card.typeLine}</span>
                )}
              </div>
              <button
                type="button"
                className={styles.deleteBtn}
                aria-label={`Delete ${card.name}`}
                onClick={() => removeCard(card.id)}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
