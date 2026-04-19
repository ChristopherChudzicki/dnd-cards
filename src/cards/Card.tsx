import styles from "./Card.module.css";
import type { ItemCard } from "./types";

export type CardLayout = "4-up" | "2-up";

type Props = {
  card: ItemCard;
  layout: CardLayout;
};

const splitParagraphs = (text: string): string[] =>
  text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

export function Card({ card, layout }: Props) {
  const layoutClass = layout === "4-up" ? styles["four-up"] : styles["two-up"];
  return (
    <div className={`${styles.card} ${layoutClass}`} data-role="card-root">
      {card.imageUrl && (
        <img className={styles.image} src={card.imageUrl} alt="" data-testid="card-image" />
      )}
      <div className={styles.header}>
        <h3 className={styles.title}>{card.name}</h3>
        <div className={styles.typeLine}>{card.typeLine}</div>
      </div>
      <hr className={styles.divider} />
      <div className={styles.body} data-role="card-body">
        {splitParagraphs(card.body).map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
      {card.costWeight && (
        <div className={styles.footer} data-testid="card-footer">
          {card.costWeight}
        </div>
      )}
    </div>
  );
}
