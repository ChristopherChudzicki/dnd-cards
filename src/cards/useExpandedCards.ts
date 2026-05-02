import { useMemo, useSyncExternalStore } from "react";
import type { CardLayout } from "./Card";
import { expandCard, type PhysicalCard } from "./expandCard";
import { getMeasurer } from "./measurer";
import type { ItemCard } from "./types";

export type { PhysicalCard };

// Each layout's hidden measurer scaffold mounts once on first use and lives
// for the SPA's lifetime — see measurer.ts. The store never changes, so
// subscribe is a no-op.
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
