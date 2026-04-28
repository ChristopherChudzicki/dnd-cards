import { useState } from "react";
import { AutoFitCard } from "../cards/AutoFitCard";
import type { ItemCard } from "../cards/types";
import { useDeckCards } from "../decks/queries";
import styles from "./PrintView.module.css";

type PerPage = 2 | 4;
type Props = { deckId: string };

const chunk = <T,>(arr: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

export function PrintView({ deckId }: Props) {
  const cardsQuery = useDeckCards(deckId);
  const [perPage, setPerPage] = useState<PerPage>(4);

  if (cardsQuery.isLoading) return <p>Loading…</p>;

  const cards = cardsQuery.data ?? [];
  const items = cards.filter((c): c is ItemCard => c.kind === "item");
  const pages = items.length === 0 ? [] : chunk(items, perPage);
  const layout = perPage === 4 ? "4-up" : "2-up";

  return (
    <div>
      <div className={styles.controls}>
        <label>
          Cards per page{" "}
          <select value={perPage} onChange={(e) => setPerPage(Number(e.target.value) as PerPage)}>
            <option value={4}>4</option>
            <option value={2}>2</option>
          </select>
        </label>
        <button type="button" onClick={() => window.print()} disabled={items.length === 0}>
          Print
        </button>
        <span className={styles.tip}>
          Tip: in the print dialog, choose <em>Margins: None</em> and uncheck{" "}
          <em>Headers and footers</em> for best results.
        </span>
      </div>

      {items.length === 0 && <p>No item cards in this deck yet.</p>}

      <div className={styles.sheet}>
        {pages.map((pageCards) => (
          <div
            key={pageCards[0]?.id ?? "empty"}
            data-testid="page"
            className={`${styles.page} ${perPage === 4 ? styles.fourUp : styles.twoUp}`}
          >
            {pageCards.map((card) => (
              <div key={card.id} className={styles.slot}>
                <AutoFitCard card={card} layout={layout} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
