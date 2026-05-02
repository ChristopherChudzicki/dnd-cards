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
  });

  test("releases measurer on unmount", () => {
    const items = itemCardFactory.buildList(1);
    const { unmount } = renderHook(() => useExpandedCards(items, "4-up"));
    unmount();
    expect(document.querySelectorAll("[data-measurer]")).toHaveLength(0);
  });
});

vi.mock("./Card.module.css", () => ({
  default: new Proxy({}, { get: (_, k) => String(k) }),
}));
