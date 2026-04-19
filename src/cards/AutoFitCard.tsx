import { type CSSProperties, useLayoutEffect, useRef, useState } from "react";
import { Card, type CardLayout } from "./Card";
import type { ItemCard } from "./types";

const SCALES = [1, 0.9, 0.8] as const;

type Props = {
  card: ItemCard;
  layout: CardLayout;
};

export function AutoFitCard({ card, layout }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const prevKeyRef = useRef<string>("");
  const [scaleIndex, setScaleIndex] = useState(0);

  useLayoutEffect(() => {
    const key = `${card.id}:${layout}`;
    if (prevKeyRef.current !== key) {
      prevKeyRef.current = key;
      if (scaleIndex !== 0) {
        setScaleIndex(0);
        return;
      }
    }
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const body = wrapper.querySelector<HTMLElement>("[data-role='card-body']");
    const measureEl = body ?? wrapper;
    if (measureEl.scrollHeight > measureEl.clientHeight && scaleIndex < SCALES.length - 1) {
      setScaleIndex(scaleIndex + 1);
    }
  });

  const scale = SCALES[scaleIndex] ?? 1;

  return (
    <div
      ref={wrapperRef}
      data-testid="autofit-card"
      style={{ "--scale": String(scale) } as CSSProperties}
    >
      <Card card={card} layout={layout} />
    </div>
  );
}
