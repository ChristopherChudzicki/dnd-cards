import { expect, test } from "@playwright/test";
import { longItem, seedDeck, TEST_DECK_ID } from "./fixtures";

test("editor preview shows counts label and paginator for an oversized body", async ({ page }) => {
  await seedDeck(page, [longItem]);
  await page.goto(`/deck/${TEST_DECK_ID}/edit/${longItem.id}`);

  const counts = page.getByTestId("preview-counts");
  await expect(counts).toContainText(/cards \(4-up\) · /);

  const paginator = page.getByTestId("preview-paginator");
  await expect(paginator).toBeVisible();

  await expect(page.getByRole("heading", { name: /\(p1 of \d+\)/ })).toBeVisible();

  const cardBody = page.locator('[data-role="card-body"]:visible').first();
  const page1Body = await cardBody.innerText();

  await paginator.getByRole("button", { name: /next preview page/i }).click();
  await expect(page.getByRole("heading", { name: /\(p2 of \d+\)/ })).toBeVisible();

  const page2Body = await cardBody.innerText();
  expect(page2Body).not.toBe(page1Body);
});
