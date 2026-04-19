import type { ChangeEvent } from "react";
import { nowIso } from "../lib/time";
import styles from "./ItemEditor.module.css";
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
