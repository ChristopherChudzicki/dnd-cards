import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { itemCardFactory } from "./factories";
import { useExpandedCards } from "./useExpandedCards";

beforeEach(() => {
  Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
    configurable: true,
    get() {
      return 100;
    },
  });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", {
    configurable: true,
    get() {
      return 200;
    },
  });
});

describe("useExpandedCards", () => {
  test("returns one PhysicalCard per item when bodies fit", () => {
    const items = itemCardFactory.buildList(3);
    const { result } = renderHook(() => useExpandedCards(items, "4-up"));
    expect(result.current.physicalCards).toHaveLength(3);
    expect(result.current.physicalCards.every((p) => p.pagination === undefined)).toBe(true);
  });

  test("layout change re-runs measurement", () => {
    const items = itemCardFactory.buildList(2);
    const { result, rerender } = renderHook(
      ({ layout }: { layout: "4-up" | "2-up" }) => useExpandedCards(items, layout),
      { initialProps: { layout: "4-up" } },
    );
    const before = result.current.physicalCards;
    rerender({ layout: "2-up" });
    expect(result.current.physicalCards).toHaveLength(before.length);
  });
});

vi.mock("./Card.module.css", () => ({
  default: new Proxy({}, { get: (_, k) => String(k) }),
}));
