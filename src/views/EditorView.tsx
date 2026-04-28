import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AutoFitCard } from "../cards/AutoFitCard";
import { ItemEditor } from "../cards/ItemEditor";
import type { ItemCard } from "../cards/types";
import { useDeleteCard, useSaveCard } from "../decks/mutations";
import { useDeckCards } from "../decks/queries";
import { newId } from "../lib/id";
import { nowIso } from "../lib/time";
import styles from "./EditorView.module.css";

const isPristineNewCard = (card: ItemCard): boolean =>
  card.name === "Untitled item" &&
  card.typeLine === "" &&
  card.body === "" &&
  card.costWeight === undefined &&
  card.imageUrl === undefined &&
  card.createdAt === card.updatedAt;

const isTemplateItem = (card: ItemCard): boolean =>
  card.source === "api" && /\(any /i.test(card.body);

type Props = { deckId: string; cardId: string };

export function EditorView({ deckId, cardId }: Props) {
  const cardsQuery = useDeckCards(deckId);
  const saveCard = useSaveCard();
  const deleteCard = useDeleteCard();
  const navigate = useNavigate();

  const isNew = cardId === "new";

  // For a brand-new card, generate a stub locally without inserting.
  // The stub stays client-only until Save is clicked, so closing the
  // tab mid-edit doesn't leave an orphan row.
  const stub: ItemCard | null = useMemo(() => {
    if (!isNew) return null;
    const now = nowIso();
    return {
      id: newId(),
      kind: "item",
      name: "Untitled item",
      typeLine: "",
      body: "",
      source: "custom",
      createdAt: now,
      updatedAt: now,
    };
  }, [isNew]);

  const existing = cardsQuery.data?.find((c) => c.id === cardId) ?? null;
  const initial = isNew ? stub : existing;

  const [draft, setDraft] = useState<ItemCard | null>(
    initial && initial.kind === "item" ? initial : null,
  );

  useEffect(() => {
    if (initial && initial.kind === "item") setDraft(initial);
  }, [initial]);

  if (cardsQuery.isLoading && !isNew) return <p>Loading…</p>;
  if (!isNew && !existing) return <p>Card not found.</p>;
  if (existing && existing.kind !== "item") return <p>Only item cards are supported in v1.</p>;
  if (!draft) return null;

  const handleSave = async () => {
    await saveCard.mutateAsync({ card: draft, deckId, isNew });
    navigate({ to: "/deck/$deckId", params: { deckId } });
  };

  const handleCancel = async () => {
    // Brand-new: stub was never persisted, just navigate away.
    // Existing & pristine: delete the row before navigating (only happens
    // if a server-side flow created a stub up front; not used in v1).
    if (!isNew && existing && existing.kind === "item" && isPristineNewCard(existing)) {
      await deleteCard.mutateAsync({ cardId: existing.id, deckId });
    }
    navigate({ to: "/deck/$deckId", params: { deckId } });
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
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={handleSave}
            disabled={saveCard.isPending}
          >
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
