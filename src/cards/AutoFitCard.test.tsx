import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, test, vi } from "vitest";
import { AutoFitCard } from "./AutoFitCard";
import { itemCardFactory } from "./factories";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", ResizeObserverMock);
});

describe("<AutoFitCard>", () => {
  test("scale stays at 1 when body fits", () => {
    const card = itemCardFactory.build({ body: "short" });
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

    render(<AutoFitCard card={card} layout="4-up" />);
    const el = screen.getByTestId("autofit-card");
    expect(el.style.getPropertyValue("--scale")).toBe("1");
  });

  test("scale steps down when body overflows", async () => {
    const card = itemCardFactory.build({ body: "long ".repeat(500) });
    Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
      configurable: true,
      get() {
        return 400;
      },
    });
    Object.defineProperty(HTMLElement.prototype, "clientHeight", {
      configurable: true,
      get() {
        return 200;
      },
    });

    render(<AutoFitCard card={card} layout="4-up" />);
    const el = await screen.findByTestId("autofit-card");
    await new Promise((r) => setTimeout(r, 0));
    expect(["0.8", "0.9"]).toContain(el.style.getPropertyValue("--scale"));
  });
});
