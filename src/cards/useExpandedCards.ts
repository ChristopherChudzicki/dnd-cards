import { useEffect, useMemo, useState } from "react";
import type { CardLayout } from "./Card";
import { expandCard, type PhysicalCard } from "./expandCard";
import { acquireMeasurer, type CardMeasurer } from "./measurer";
import type { ItemCard } from "./types";

export type { PhysicalCard };

export function useExpandedCards(
  items: ItemCard[],
  layout: CardLayout,
): { physicalCards: PhysicalCard[] } {
  const [measurer, setMeasurer] = useState<CardMeasurer>(() => acquireMeasurer(layout));
  const [currentLayout, setCurrentLayout] = useState<CardLayout>(layout);

  let effectiveMeasurer = measurer;
  if (currentLayout !== layout) {
    const next = acquireMeasurer(layout);
    setMeasurer(next);
    setCurrentLayout(layout);
    effectiveMeasurer = next;
  }

  // Releases the measurer when it is swapped out (layout change) or when the
  // component unmounts.
  useEffect(
    () => () => {
      measurer.release();
    },
    [measurer],
  );

  const physicalCards = useMemo<PhysicalCard[]>(
    () => items.flatMap((item) => expandCard(item, effectiveMeasurer)),
    [items, effectiveMeasurer],
  );

  return { physicalCards };
}
