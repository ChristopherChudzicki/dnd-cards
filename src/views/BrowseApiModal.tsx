import { useQueryClient } from "@tanstack/react-query";
import { type MouseEvent, useEffect, useMemo, useState } from "react";
import { fetchMagicItemDetail, type Ruleset } from "../api/endpoints/magicItems";
import { useMagicItemIndex } from "../api/hooks";
import { magicItemDetailToCard } from "../api/mappers/magicItems";
import { useDeckStore } from "../decks/store";
import styles from "./BrowseApiModal.module.css";

type Props = {
  onClose: () => void;
  onSelected: (cardId: string) => void;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function BrowseApiModal({ onClose, onSelected }: Props) {
  const [ruleset, setRuleset] = useState<Ruleset>("2024");
  const [query, setQuery] = useState("");
  const [pickingSlug, setPickingSlug] = useState<string | null>(null);

  const index = useMagicItemIndex(ruleset);
  const queryClient = useQueryClient();
  const upsertCard = useDeckStore((s) => s.upsertCard);

  const filtered = useMemo(() => {
    const all = index.data?.results ?? [];
    if (query.trim() === "") return all;
    const q = query.toLowerCase();
    return all.filter((e) => e.name.toLowerCase().includes(q));
  }, [index.data, query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handlePick = async (slug: string) => {
    if (pickingSlug !== null) return;
    setPickingSlug(slug);
    try {
      const detail = await queryClient.fetchQuery({
        queryKey: ["magic-items", ruleset, "detail", slug],
        queryFn: () => fetchMagicItemDetail(ruleset, slug),
        staleTime: DAY_MS,
      });
      const card = magicItemDetailToCard(detail);
      upsertCard(card);
      onSelected(card.id);
    } catch (err) {
      console.error("Failed to fetch magic-item detail", err);
      setPickingSlug(null);
    }
  };

  const onBackdropClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: Escape key handler is wired via window listener
    // biome-ignore lint/a11y/noStaticElementInteractions: backdrop is non-semantic dismissal; dialog content handles focus
    <div className={styles.backdrop} onClick={onBackdropClick}>
      <div className={styles.modal} role="dialog" aria-label="Browse magic items">
        <header className={styles.header}>
          <h2 className={styles.title}>Browse magic items</h2>
          {/* biome-ignore lint/a11y/useSemanticElements: fieldset styling is more opinionated than this toggle needs */}
          <div className={styles.rulesetToggle} role="group" aria-label="Ruleset">
            <button
              type="button"
              className={`${styles.rulesetBtn} ${ruleset === "2014" ? styles.rulesetBtnActive : ""}`}
              onClick={() => setRuleset("2014")}
            >
              2014
            </button>
            <button
              type="button"
              className={`${styles.rulesetBtn} ${ruleset === "2024" ? styles.rulesetBtnActive : ""}`}
              onClick={() => setRuleset("2024")}
            >
              2024
            </button>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className={styles.searchRow}>
          <input
            className={styles.searchInput}
            type="search"
            placeholder="Search magic items…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            // biome-ignore lint/a11y/noAutofocus: modal entry point
            autoFocus
          />
        </div>

        <div className={styles.results}>
          {index.isLoading && <div className={styles.state}>Loading…</div>}
          {index.isError && (
            <div className={styles.state}>
              Couldn't load the magic-items list.
              <div className={styles.errorActions}>
                <button type="button" onClick={() => index.refetch()}>
                  Retry
                </button>
              </div>
            </div>
          )}
          {index.isSuccess && filtered.length === 0 && (
            <div className={styles.state}>No items match your search.</div>
          )}
          {index.isSuccess &&
            filtered.map((entry) => (
              <button
                key={entry.index}
                type="button"
                className={styles.row}
                onClick={() => handlePick(entry.index)}
                disabled={pickingSlug !== null}
              >
                <span className={styles.rowName}>{entry.name}</span>
                {pickingSlug === entry.index && <span className={styles.rowMeta}>Loading…</span>}
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
