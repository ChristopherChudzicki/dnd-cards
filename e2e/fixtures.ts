import type { Page } from "@playwright/test";
import { SB_URL, TEST_USER_ID } from "../src/test/constants";
import { makeFakeJwt } from "../src/test/fakeJwt";

const TEST_DECK_ID = "00000000-0000-0000-0000-000000000001";
const AUTH_STORAGE_KEY = "sb-localhost-auth-token";

export type SeedItem = {
  id?: string;
  name: string;
  typeLine?: string;
  body: string;
  costWeight?: string;
};

export async function seedDeck(page: Page, items: SeedItem[]): Promise<void> {
  const now = new Date().toISOString();
  const expiresAt = Math.floor(Date.now() / 1000) + 3600;
  const accessToken = makeFakeJwt({
    sub: TEST_USER_ID,
    exp: expiresAt,
    iat: Math.floor(Date.now() / 1000),
    role: "authenticated",
    aud: "authenticated",
    email: "alice@test.invalid",
  });

  const user = {
    id: TEST_USER_ID,
    aud: "authenticated",
    role: "authenticated",
    email: "alice@test.invalid",
    app_metadata: {},
    user_metadata: {},
    created_at: now,
    updated_at: now,
  };

  const session = {
    access_token: accessToken,
    refresh_token: "fake-refresh-token",
    expires_in: 3600,
    expires_at: expiresAt,
    token_type: "bearer",
    user,
  };

  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, JSON.stringify(value));
    },
    { key: AUTH_STORAGE_KEY, value: session },
  );

  const deckRow = {
    id: TEST_DECK_ID,
    owner_id: TEST_USER_ID,
    name: "E2E Test Deck",
    created_at: now,
    updated_at: now,
  };

  const cardRows = items.map((it, i) => ({
    id: it.id ?? `seed-card-${i}`,
    deck_id: TEST_DECK_ID,
    position: i,
    payload: {
      kind: "item",
      name: it.name,
      typeLine: it.typeLine ?? "Wondrous item",
      body: it.body,
      ...(it.costWeight ? { costWeight: it.costWeight } : {}),
      source: "custom",
      createdAt: now,
      updatedAt: now,
    },
    created_at: now,
    updated_at: now,
  }));

  await page.route(`${SB_URL}/rest/v1/decks*`, (route) => {
    const method = route.request().method();
    if (method === "GET") {
      route.fulfill({ json: [deckRow] });
      return;
    }
    route.abort("failed");
    throw new Error(
      `e2e fixture: unsupported ${method} on /rest/v1/decks. ` +
        "seedDeck currently mocks reads only; extend it before adding write-path specs.",
    );
  });

  await page.route(`${SB_URL}/rest/v1/cards*`, (route) => {
    const method = route.request().method();
    if (method === "GET") {
      route.fulfill({ json: cardRows });
      return;
    }
    route.abort("failed");
    throw new Error(
      `e2e fixture: unsupported ${method} on /rest/v1/cards. ` +
        "seedDeck currently mocks reads only; extend it before adding write-path specs.",
    );
  });

  await page.route(`${SB_URL}/auth/v1/**`, (route) => {
    const url = route.request().url();
    if (url.includes("/auth/v1/user")) {
      route.fulfill({ status: 200, json: user });
      return;
    }
    route.abort("failed");
    throw new Error(
      `e2e fixture: unhandled auth endpoint ${url}. Add explicit handling in seedDeck.`,
    );
  });
}

export { TEST_DECK_ID };

const LONG_BODY = Array.from(
  { length: 60 },
  () =>
    "The wand vibrates briefly before unleashing an unpredictable wave of magic. " +
    "Roll on the wild magic table.",
).join(" ");

export const longItem: SeedItem = {
  id: "wand-of-wonder",
  name: "Wand of Wonder",
  typeLine: "Wand, rare (requires attunement by a spellcaster)",
  body: LONG_BODY,
  costWeight: "5,000 gp · 1 lb",
};
