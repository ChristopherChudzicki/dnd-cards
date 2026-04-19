import { Link, useParams } from "@tanstack/react-router";
import { useCallback } from "react";
import { AutoFitCard } from "../cards/AutoFitCard";
import { ItemEditor } from "../cards/ItemEditor";
import type { ItemCard } from "../cards/types";
import { useDeckStore } from "../deck/store";
import styles from "./EditorView.module.css";

type Props = {
  cardId?: string;
};

export function EditorView({ cardId: propId }: Props = {}) {
  const params = useParams({ strict: false }) as { id?: string };
  const id = propId ?? params.id;
  const card = useDeckStore((s) => s.deck.cards.find((c) => c.id === id));
  const upsertCard = useDeckStore((s) => s.upsertCard);

  const handleChange = useCallback((next: ItemCard) => upsertCard(next), [upsertCard]);

  if (!card) return <p>Card not found.</p>;
  if (card.kind !== "item") return <p>Only item cards are supported in v1.</p>;

  return (
    <section className={styles.editor}>
      <div className={styles.form}>
        <Link to="/" className={styles.back}>
          &larr; Back to deck
        </Link>
        <ItemEditor card={card} onChange={handleChange} />
      </div>
      <div className={styles.preview}>
        <div className={styles.previewLabel}>Preview (4-up size)</div>
        <AutoFitCard card={card} layout="4-up" />
      </div>
    </section>
  );
}
