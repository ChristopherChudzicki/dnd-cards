import { expect, test } from "@playwright/test";
import { longItem, seedDeck, TEST_DECK_ID } from "./fixtures";

test("print view paginates an oversized item across multiple physical cards at 4-up", async ({
  page,
}) => {
  await seedDeck(page, [longItem]);
  await page.goto(`/deck/${TEST_DECK_ID}/print`);

  const sheet = page.locator('[data-testid="page"]');
  const titles = sheet.getByRole("heading").filter({ hasText: /\(p\d+ of \d+\)/ });
  await expect(titles.first()).toBeVisible();
  const total = await titles.count();
  expect(total).toBeGreaterThan(1);

  await expect(titles.first()).toHaveText(new RegExp(`\\(p1 of ${total}\\)`));
  await expect(titles.last()).toHaveText(new RegExp(`\\(p${total} of ${total}\\)`));

  const occurrences = await sheet.getByText(longItem.typeLine!, { exact: true }).count();
  expect(occurrences).toBe(1);

  const footers = await sheet.getByText(longItem.costWeight!, { exact: true }).count();
  expect(footers).toBe(total);
});
