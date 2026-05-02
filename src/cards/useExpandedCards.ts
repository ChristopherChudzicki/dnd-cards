import { useEffect, useMemo, useRef } from "react";
import type { CardLayout } from "./Card";
import { expandCard, type PhysicalCard } from "./expandCard";
import { acquireMeasurer, type CardMeasurer } from "./measurer";
import type { ItemCard } from "./types";

export type { PhysicalCard };

export function useExpandedCards(
  items: ItemCard[],
  layout: CardLayout,
): { physicalCards: PhysicalCard[] } {
  const measurerRef = useRef<{ layout: CardLayout; m: CardMeasurer } | null>(null);

  if (typeof document !== "undefined") {
    if (measurerRef.current === null) {
      measurerRef.current = { layout, m: acquireMeasurer(layout) };
    } else if (measurerRef.current.layout !== layout) {
      measurerRef.current.m.release();
      measurerRef.current = { layout, m: acquireMeasurer(layout) };
    }
  }

  useEffect(
    () => () => {
      measurerRef.current?.m.release();
      measurerRef.current = null;
    },
    [],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: measurerRef is a ref; layout is included so the memo invalidates when the measurer swaps
  const physicalCards = useMemo<PhysicalCard[]>(() => {
    const m = measurerRef.current?.m;
    if (!m) return [];
    return items.flatMap((item) => expandCard(item, m));
  }, [items, layout]);

  return { physicalCards };
}
