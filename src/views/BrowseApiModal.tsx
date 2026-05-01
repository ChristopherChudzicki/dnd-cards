import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Dialog,
  Modal,
  ModalOverlay,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from "react-aria-components";
import { fetchMagicItemDetail, type Ruleset } from "../api/endpoints/magicItems";
import { useMagicItemIndex } from "../api/hooks";
import { magicItemDetailToCard } from "../api/mappers/magicItems";
import { useSaveCard } from "../decks/mutations";
import { Button } from "../lib/ui/Button";
import { IconButton } from "../lib/ui/IconButton";
import { Input } from "../lib/ui/Input";
import styles from "./BrowseApiModal.module.css";

type Props = {
  deckId: string;
  onClose: () => void;
  onSelected: (cardId: string) => void;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function BrowseApiModal({ deckId, onClose, onSelected }: Props) {
  const [ruleset, setRuleset] = useState<Ruleset>("2024");
  const [query, setQuery] = useState("");
  const [pickingSlug, setPickingSlug] = useState<string | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);

  const index = useMagicItemIndex(ruleset);
  const queryClient = useQueryClient();
  const saveCard = useSaveCard();

  const filtered = useMemo(() => {
    const all = index.data?.results ?? [];
    if (query.trim() === "") return all;
    const q = query.toLowerCase();
    return all.filter((e) => e.name.toLowerCase().includes(q));
  }, [index.data, query]);

  const handlePick = async (slug: string) => {
    if (pickingSlug !== null) return;
    setPickingSlug(slug);
    setPickError(null);
    try {
      const detail = await queryClient.fetchQuery({
        queryKey: ["magic-items", ruleset, "detail", slug],
        queryFn: () => fetchMagicItemDetail(ruleset, slug),
        staleTime: DAY_MS,
      });
      const card = magicItemDetailToCard(detail);
      await saveCard.mutateAsync({ card, deckId, isNew: true });
      onSelected(card.id);
    } catch (err) {
      console.error("Failed to add magic-item to deck", err);
      setPickError(
        err instanceof Error ? err.message : "Couldn't add this card. Please try again.",
      );
    } finally {
      setPickingSlug(null);
    }
  };

  return (
    <ModalOverlay
      isOpen
      isDismissable
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      className={styles.overlay}
    >
      <Modal className={styles.modal}>
        <Dialog aria-label="Browse magic items" data-stable-size="true" className={styles.dialog}>
          <header className={styles.header}>
            <h2 className={styles.title}>Browse magic items</h2>
            <ToggleButtonGroup
              selectionMode="single"
              disallowEmptySelection
              selectedKeys={[ruleset]}
              onSelectionChange={(keys) => {
                const next = Array.from(keys)[0];
                if (next === "2014" || next === "2024") setRuleset(next);
              }}
              className={styles.rulesetToggle}
            >
              <ToggleButton id="2014" className={styles.rulesetBtn}>
                2014
              </ToggleButton>
              <ToggleButton id="2024" className={styles.rulesetBtn}>
                2024
              </ToggleButton>
            </ToggleButtonGroup>
            <IconButton aria-label="Close" onPress={onClose} className={styles.closeBtn}>
              <span aria-hidden="true">×</span>
            </IconButton>
          </header>

          <div className={styles.searchRow}>
            <TextField aria-label="Search magic items" className={styles.searchField}>
              <Input
                type="search"
                placeholder="Search magic items…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
            </TextField>
          </div>

          <div className={styles.results}>
            {index.isLoading && <div className={styles.state}>Loading…</div>}
            {index.isError && (
              <div className={styles.state}>
                Couldn't load the magic-items list.
                <div className={styles.errorActions}>
                  <Button variant="secondary" size="sm" onPress={() => index.refetch()}>
                    Retry
                  </Button>
                </div>
              </div>
            )}
            {index.isSuccess && filtered.length === 0 && (
              <div className={styles.state}>No items match your search.</div>
            )}
            {pickError && (
              <div className={styles.state} role="alert">
                {pickError}
              </div>
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
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
