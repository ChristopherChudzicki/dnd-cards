import { useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AutoFitCard } from "../cards/AutoFitCard";
import { ItemEditor } from "../cards/ItemEditor";
import type { ItemCard } from "../cards/types";
import { useDeckStore } from "../decks/store";
import styles from "./EditorView.module.css";

type Props = {
  cardId?: string;
};

const isPristineNewCard = (card: ItemCard): boolean =>
  card.name === "Untitled item" &&
  card.typeLine === "" &&
  card.body === "" &&
  card.costWeight === undefined &&
  card.imageUrl === undefined &&
  card.createdAt === card.updatedAt;

const isTemplateItem = (card: ItemCard): boolean =>
  card.source === "api" && /\(any /i.test(card.body);

export function EditorView({ cardId: propId }: Props = {}) {
  const params = useParams({ strict: false }) as { id?: string };
  const id = propId ?? params.id;
  const storeCard = useDeckStore((s) => s.deck.cards.find((c) => c.id === id));
  const upsertCard = useDeckStore((s) => s.upsertCard);
  const removeCard = useDeckStore((s) => s.removeCard);
  const navigate = useNavigate();

  const [draft, setDraft] = useState<ItemCard | null>(() =>
    storeCard && storeCard.kind === "item" ? storeCard : null,
  );

  useEffect(() => {
    if (storeCard && storeCard.kind === "item") setDraft(storeCard);
  }, [storeCard]);

  if (!id) return <p>Card not found.</p>;
  if (!storeCard) return <p>Card not found.</p>;
  if (storeCard.kind !== "item") return <p>Only item cards are supported in v1.</p>;
  if (!draft) return null;

  const handleSave = () => {
    upsertCard(draft);
    navigate({ to: "/" });
  };

  const handleCancel = () => {
    if (isPristineNewCard(storeCard)) {
      removeCard(storeCard.id);
    }
    navigate({ to: "/" });
  };

  return (
    <section className={styles.editor}>
      <div className={styles.form}>
        {isTemplateItem(draft) && (
          <div className={styles.templateNotice} data-testid="template-notice">
            <strong>Template item.</strong> The dnd5eapi entry is weapon-type-agnostic (e.g.
            &ldquo;Any melee weapon&rdquo;). Rename and edit the description to match your specific
            weapon or armor.
          </div>
        )}
        <ItemEditor card={draft} onChange={setDraft} />
        <div className={styles.formActions}>
          <button type="button" className={styles.primaryBtn} onClick={handleSave}>
            Save
          </button>
          <button type="button" className={styles.secondaryBtn} onClick={handleCancel}>
            Cancel
          </button>
        </div>
      </div>
      <div className={styles.preview}>
        <div className={styles.previewLabel}>Preview (4-up size)</div>
        <AutoFitCard card={draft} layout="4-up" />
      </div>
    </section>
  );
}
