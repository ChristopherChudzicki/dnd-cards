import type { CardLayout } from "./Card";
import cardStyles from "./Card.module.css";
import type { ItemCard } from "./types";

export type CardMeasurer = {
  measureFirst: (card: ItemCard, chunk: string) => boolean;
  measureContinuation: (card: ItemCard, chunk: string) => boolean;
  release: () => void;
};

type CachedMeasurer = {
  container: HTMLDivElement;
  refCount: number;
  firstTitle: HTMLElement;
  firstTypeLine: HTMLElement;
  firstBody: HTMLElement;
  firstFooter: HTMLElement;
  contTitle: HTMLElement;
  contBody: HTMLElement;
  contFooter: HTMLElement;
};

const cache = new Map<CardLayout, CachedMeasurer>();
const SENTINEL_SUFFIX = " (p9 of 9)";

export function acquireMeasurer(layout: CardLayout): CardMeasurer {
  let entry = cache.get(layout);
  if (!entry) {
    entry = build(layout);
    cache.set(layout, entry);
  }
  entry.refCount++;

  const setBodyContent = (el: HTMLElement, text: string) => {
    el.replaceChildren(
      ...text
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => {
          const node = document.createElement("p");
          node.textContent = p;
          return node;
        }),
    );
  };

  const setFooter = (el: HTMLElement, costWeight: string | undefined) => {
    if (costWeight) {
      el.style.display = "";
      el.textContent = costWeight;
    } else {
      el.style.display = "none";
      el.textContent = "";
    }
  };

  const measureFirst = (card: ItemCard, chunk: string): boolean => {
    if (!entry) return true;
    entry.firstTitle.textContent = card.name + SENTINEL_SUFFIX;
    entry.firstTypeLine.textContent = card.typeLine;
    setFooter(entry.firstFooter, card.costWeight);
    setBodyContent(entry.firstBody, chunk);
    return entry.firstBody.scrollHeight <= entry.firstBody.clientHeight;
  };

  const measureContinuation = (card: ItemCard, chunk: string): boolean => {
    if (!entry) return true;
    entry.contTitle.textContent = card.name + SENTINEL_SUFFIX;
    setFooter(entry.contFooter, card.costWeight);
    setBodyContent(entry.contBody, chunk);
    return entry.contBody.scrollHeight <= entry.contBody.clientHeight;
  };

  const release = () => {
    if (!entry) return;
    entry.refCount--;
    if (entry.refCount <= 0) {
      entry.container.remove();
      cache.delete(layout);
      entry = undefined;
    }
  };

  return { measureFirst, measureContinuation, release };
}

function build(layout: CardLayout): CachedMeasurer {
  const container = document.createElement("div");
  container.setAttribute("data-measurer", layout);
  container.style.cssText =
    "position:absolute;left:-99999px;top:0;visibility:hidden;pointer-events:none;";

  const layoutClass = layout === "4-up" ? cardStyles["four-up"] : cardStyles["two-up"];
  const cardClass = `${cardStyles.card} ${layoutClass}`;

  container.innerHTML = `
    <div class="${cardClass}" data-shape="first" data-role="card-root">
      <div class="${cardStyles.header}">
        <h3 class="${cardStyles.title}" data-slot="title"></h3>
        <div class="${cardStyles.typeLine}" data-slot="typeLine"></div>
      </div>
      <hr class="${cardStyles.divider}" />
      <div class="${cardStyles.body}" data-slot="body" data-role="card-body"></div>
      <div class="${cardStyles.footer}" data-slot="footer"></div>
    </div>
    <div class="${cardClass}" data-shape="continuation" data-role="card-root">
      <div class="${cardStyles.header}">
        <h3 class="${cardStyles.title}" data-slot="title"></h3>
      </div>
      <hr class="${cardStyles.divider}" />
      <div class="${cardStyles.body}" data-slot="body" data-role="card-body"></div>
      <div class="${cardStyles.footer}" data-slot="footer"></div>
    </div>
  `;

  document.body.appendChild(container);

  const find = (shape: "first" | "continuation", slot: string): HTMLElement => {
    const el = container.querySelector<HTMLElement>(
      `[data-shape="${shape}"] [data-slot="${slot}"]`,
    );
    if (!el) throw new Error(`measurer: missing ${shape}.${slot}`);
    return el;
  };

  return {
    container,
    refCount: 0,
    firstTitle: find("first", "title"),
    firstTypeLine: find("first", "typeLine"),
    firstBody: find("first", "body"),
    firstFooter: find("first", "footer"),
    contTitle: find("continuation", "title"),
    contBody: find("continuation", "body"),
    contFooter: find("continuation", "footer"),
  };
}
