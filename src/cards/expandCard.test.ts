import { describe, expect, test } from "vitest";
import { expandCard } from "./expandCard";
import { itemCardFactory } from "./factories";
import type { CardMeasurer } from "./measurer";

const measurerFromBudget = (firstMax: number, contMax: number): CardMeasurer => ({
	measureFirst: (_card, chunk) => chunk.length <= firstMax,
	measureContinuation: (_card, chunk) => chunk.length <= contMax,
	release: () => {},
});

describe("expandCard", () => {
	test("single physical card with no pagination metadata when body fits", () => {
		const card = itemCardFactory.build({ body: "tiny" });
		const result = expandCard(card, measurerFromBudget(1000, 1000));
		expect(result).toEqual([
			{ card, bodyChunk: "tiny", pagination: undefined, needsScaleFit: true },
		]);
	});

	test("multiple physical cards with pagination metadata when body splits", () => {
		const card = itemCardFactory.build({ body: "alpha beta gamma" });
		const result = expandCard(card, measurerFromBudget(5, 5));
		expect(result.map((p) => p.bodyChunk)).toEqual(["alpha", "beta", "gamma"]);
		expect(result[0].pagination).toEqual({ page: 1, total: 3 });
		expect(result[1].pagination).toEqual({ page: 2, total: 3 });
		expect(result[2].pagination).toEqual({ page: 3, total: 3 });
		expect(result.every((p) => p.needsScaleFit === false)).toBe(true);
	});
});
