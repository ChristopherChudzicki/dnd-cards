import { useMemo, useSyncExternalStore } from "react";
import type { CardLayout } from "./Card";
import { expandCard, type PhysicalCard } from "./expandCard";
import { getMeasurer } from "./measurer";
import type { ItemCard } from "./types";

export type { PhysicalCard };

// Card measurement is an SPA-global capability, not a per-component lifecycle.
// Each layout's measurer scaffold mounts once on first use and stays mounted.
// `getMeasurer` is idempotent, so concurrent renders that get discarded mid-flight
// don't leak (no refcount to drift, no DOM to clean up).
const subscribe = () => () => {};

export function useExpandedCards(
  items: ItemCard[],
  layout: CardLayout,
): { physicalCards: PhysicalCard[] } {
  const measurer = useSyncExternalStore(subscribe, () => getMeasurer(layout));

  const physicalCards = useMemo<PhysicalCard[]>(
    () => items.flatMap((item) => expandCard(item, measurer)),
    [items, measurer],
  );

  return { physicalCards };
}
