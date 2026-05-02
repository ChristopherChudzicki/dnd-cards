import { describe, expect, test } from "vitest";
import { type PaginateMeasurer, paginateBody } from "./paginate";

const fitsUpTo =
  (n: number): PaginateMeasurer =>
  (s) =>
    s.length <= n;

describe("paginateBody", () => {
  test("returns single chunk when body fits the first card", () => {
    expect(
      paginateBody({
        body: "short",
        measureFirst: fitsUpTo(100),
        measureContinuation: fitsUpTo(100),
      }),
    ).toEqual(["short"]);
  });

  test("splits at word boundary when body overflows", () => {
    expect(
      paginateBody({
        body: "alpha beta gamma delta",
        measureFirst: fitsUpTo(11),
        measureContinuation: fitsUpTo(11),
      }),
    ).toEqual(["alpha beta", "gamma delta"]);
  });

  test("uses different budgets for first vs continuation", () => {
    expect(
      paginateBody({
        body: "alpha beta gamma delta",
        measureFirst: fitsUpTo(5),
        measureContinuation: fitsUpTo(100),
      }),
    ).toEqual(["alpha", "beta gamma delta"]);
  });

  test("splits across three or more pages", () => {
    expect(
      paginateBody({
        body: "aa bb cc dd ee ff",
        measureFirst: fitsUpTo(5),
        measureContinuation: fitsUpTo(5),
      }),
    ).toEqual(["aa bb", "cc dd", "ee ff"]);
  });

  test("falls back to character split when a single token exceeds the card", () => {
    const result = paginateBody({
      body: "supercalifragilistic",
      measureFirst: fitsUpTo(5),
      measureContinuation: fitsUpTo(5),
    });
    expect(result.join("")).toBe("supercalifragilistic");
    expect(result.every((c) => c.length <= 5)).toBe(true);
  });

  test("returns single empty chunk for empty body", () => {
    expect(
      paginateBody({
        body: "",
        measureFirst: fitsUpTo(0),
        measureContinuation: fitsUpTo(0),
      }),
    ).toEqual([""]);
  });

  test("trims leading whitespace between chunks but keeps in-chunk paragraph breaks", () => {
    const result = paginateBody({
      body: "para one\n\npara two",
      measureFirst: fitsUpTo(8),
      measureContinuation: fitsUpTo(100),
    });
    expect(result).toEqual(["para one", "para two"]);
  });
});
