import { useState } from "react";
import styles from "./Card.module.css";
import { pickIconKey } from "./iconRules";
import { ResolvedIcon } from "./resolveIcon";
import type { ItemCard } from "./types";

export type CardLayout = "4-up" | "2-up";

export type CardPagination = { page: number; total: number };

type Props = {
  card: ItemCard;
  layout: CardLayout;
  pagination?: CardPagination;
  bodyOverride?: string;
};

const splitParagraphs = (text: string): string[] =>
  text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

export function Card({ card, layout, pagination, bodyOverride }: Props) {
  const layoutClass = layout === "4-up" ? styles["four-up"] : styles["two-up"];
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null);

  // Treat empty string the same as undefined: rendering <img src=""> makes the
  // browser refetch the document URL, which doesn't fire onError reliably and
  // leaves the styled-but-empty image element visible instead of falling back.
  const showImage = !!card.imageUrl && brokenUrl !== card.imageUrl;
  const iconKey = card.iconKey ?? pickIconKey(card);

  const isFirstPage = !pagination || pagination.page === 1;
  const titleText = pagination
    ? `${card.name} (p${pagination.page} of ${pagination.total})`
    : card.name;
  const bodyText = bodyOverride ?? card.body;

  return (
    <div className={`${styles.card} ${layoutClass}`} data-role="card-root">
      {showImage ? (
        <img
          className={styles.image}
          src={card.imageUrl}
          alt=""
          data-testid="card-image"
          onError={() => setBrokenUrl(card.imageUrl ?? null)}
        />
      ) : (
        <div className={styles.fallbackIcon} data-testid="card-fallback-icon" aria-hidden="true">
          <ResolvedIcon iconKey={iconKey} />
        </div>
      )}
      <div className={styles.header}>
        <h3 className={styles.title}>{titleText}</h3>
        {isFirstPage && <div className={styles.typeLine}>{card.typeLine}</div>}
      </div>
      <hr className={styles.divider} />
      <div className={styles.body} data-role="card-body">
        {splitParagraphs(bodyText).map((p) => (
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
