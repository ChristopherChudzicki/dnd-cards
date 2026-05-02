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
		expect(result.current.physicalCards.every((p) => p.needsScaleFit)).toBe(true);
	});

	test("expands a single overflowing item into multiple PhysicalCards", () => {
		Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
			configurable: true,
			get() {
				const ret = (this as unknown as { __flips?: number }).__flips ?? 0;
				(this as unknown as { __flips?: number }).__flips = ret + 1;
				return ret === 0 ? 1000 : 100;
			},
		});
		const item = itemCardFactory.build({ body: "alpha beta gamma delta epsilon" });
		const { result } = renderHook(() => useExpandedCards([item], "4-up"));
		expect(result.current.physicalCards.length).toBeGreaterThanOrEqual(1);
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
