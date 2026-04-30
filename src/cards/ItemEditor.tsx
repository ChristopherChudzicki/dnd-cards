import type { ChangeEvent } from "react";
import { nowIso } from "../lib/time";
import { IconPickerDialog } from "../lib/ui/IconPickerDialog";
import { IconPreview } from "../lib/ui/IconPreview";
import styles from "./ItemEditor.module.css";
import { FALLBACK_ICON_KEY, pickIconKey } from "./iconRules";
import type { ItemCard } from "./types";

type Props = {
  card: ItemCard;
  onChange: (next: ItemCard) => void;
};

type EditableField = "name" | "typeLine" | "body" | "costWeight" | "imageUrl";

export function ItemEditor({ card, onChange }: Props) {
  const handle =
    (field: EditableField) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange({ ...card, [field]: e.target.value, updatedAt: nowIso() });
    };

  const handleIconChange = (next: string | undefined) => {
    onChange({ ...card, iconKey: next, updatedAt: nowIso() });
  };

  const resolvedKey = card.iconKey ?? pickIconKey(card);
  const showHint = card.iconKey === undefined && resolvedKey !== FALLBACK_ICON_KEY;

  return (
    <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
      <label className={styles.field}>
        <span className={styles.label}>Name</span>
        <input className={styles.input} value={card.name} onChange={handle("name")} />
      </label>
      <label className={styles.field}>
        <span className={styles.label}>Type line</span>
        <input
          className={styles.input}
          value={card.typeLine}
          onChange={handle("typeLine")}
          placeholder="Wondrous item, uncommon"
        />
      </label>
      <div className={styles.field}>
        <span className={styles.label}>Icon (optional)</span>
        <div className={styles.iconRow}>
          <IconPreview iconKey={resolvedKey} label={resolvedKey} size="sm" />
          <IconPickerDialog value={card.iconKey} onChange={handleIconChange} />
        </div>
        {showHint && <div className={styles.iconHint}>Currently auto-picking: {resolvedKey}</div>}
      </div>
      <label className={styles.field}>
        <span className={styles.label}>Body</span>
        <textarea
          className={styles.textarea}
          value={card.body}
          onChange={handle("body")}
          rows={8}
        />
      </label>
      <label className={styles.field}>
        <span className={styles.label}>Cost / weight (optional)</span>
        <input
          className={styles.input}
          value={card.costWeight ?? ""}
          onChange={handle("costWeight")}
          placeholder="500 gp · 15 lb"
        />
      </label>
      <label className={styles.field}>
        <span className={styles.label}>Image URL (optional)</span>
        <input
          className={styles.input}
          value={card.imageUrl ?? ""}
          onChange={handle("imageUrl")}
          placeholder="https://…"
        />
      </label>
    </form>
  );
}
