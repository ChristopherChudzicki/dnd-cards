import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { itemCardFactory } from "./factories";
import { acquireMeasurer } from "./measurer";

// What this test covers vs. what e2e covers:
//
// This file unit-tests the slot-population paths in measurer.ts (title text,
// type-line presence, footer toggle, body innerHTML structure) by stubbing
// scrollHeight/clientHeight at the prototype level. It verifies that the
// measurer writes the right content into the right DOM slots and reads
// scrollHeight/clientHeight on the body element to decide fit.
//
// What it CAN'T verify (because JSDOM has no real layout): that real CSS
// produces the expected body height, that title wrapping under the sentinel
// suffix shrinks the body budget by the right amount, or that the per-layout
// (4-up vs 2-up) sizes line up with print dimensions. Those invariants are
// the job of the Playwright e2e specs, which run the app against a real
// browser and assert on the rendered chunk count and continuation-page
// behavior end-to-end.

describe("measurer", () => {
  let measurer: ReturnType<typeof acquireMeasurer> | null = null;

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

  afterEach(() => {
    measurer?.release();
    measurer = null;
  });

  test("measureFirst writes the title with the sentinel suffix and the type line", () => {
    measurer = acquireMeasurer("4-up");
    const card = itemCardFactory.build();
    measurer.measureFirst(card, "body chunk");

    const titleEl = document.querySelector<HTMLElement>('[data-shape="first"] [data-slot="title"]');
    const typeLineEl = document.querySelector<HTMLElement>(
      '[data-shape="first"] [data-slot="typeLine"]',
    );

    expect(titleEl?.textContent).toBe(`${card.name} (p99 of 99)`);
    expect(typeLineEl?.textContent).toBe(card.typeLine);
  });

  test("measureContinuation has no type line slot in its scaffold", () => {
    measurer = acquireMeasurer("4-up");
    const card = itemCardFactory.build();
    measurer.measureContinuation(card, "body chunk");

    const typeLineEl = document.querySelector('[data-shape="continuation"] [data-slot="typeLine"]');
    expect(typeLineEl).toBeNull();
  });

  test("footer is hidden when costWeight is undefined", () => {
    measurer = acquireMeasurer("4-up");
    const card = itemCardFactory.build({ costWeight: undefined });
    measurer.measureFirst(card, "body chunk");

    const footerEl = document.querySelector<HTMLElement>(
      '[data-shape="first"] [data-slot="footer"]',
    );
    expect(footerEl?.style.display).toBe("none");
  });

  test("footer renders costWeight when present", () => {
    measurer = acquireMeasurer("4-up");
    const card = itemCardFactory.build();
    measurer.measureFirst(card, "body chunk");

    const footerEl = document.querySelector<HTMLElement>(
      '[data-shape="first"] [data-slot="footer"]',
    );
    expect(footerEl?.style.display).toBe("");
    expect(footerEl?.textContent).toBe(card.costWeight);
  });

  test("body chunk is split into <p> elements on blank-line paragraph breaks", () => {
    measurer = acquireMeasurer("4-up");
    const card = itemCardFactory.build();
    measurer.measureFirst(card, "para one\n\npara two");

    const paragraphs = document.querySelectorAll('[data-shape="first"] [data-slot="body"] p');
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0]?.textContent).toBe("para one");
    expect(paragraphs[1]?.textContent).toBe("para two");
  });

  test("returns true when scrollHeight <= clientHeight (fits)", () => {
    measurer = acquireMeasurer("4-up");
    const card = itemCardFactory.build();
    expect(measurer.measureFirst(card, "any body")).toBe(true);
  });

  test("returns false when scrollHeight > clientHeight (overflows)", () => {
    Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
      configurable: true,
      get() {
        return 500;
      },
    });
    measurer = acquireMeasurer("4-up");
    const card = itemCardFactory.build();
    expect(measurer.measureFirst(card, "any body")).toBe(false);
  });

  test("throws when used after release", () => {
    measurer = acquireMeasurer("4-up");
    measurer.release();
    measurer.release(); // double-release is a no-op
    const m = measurer;
    measurer = null; // prevent afterEach from double-releasing
    const card = itemCardFactory.build();
    expect(() => m.measureFirst(card, "x")).toThrow(/measurer used after release/);
  });
});
