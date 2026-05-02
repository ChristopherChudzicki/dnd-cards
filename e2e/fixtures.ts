import type { Page } from "@playwright/test";

const SB_URL = "http://localhost:54321";
const TEST_DECK_ID = "e2e-deck-00000000-0000-0000-0000-000000000001";
const TEST_USER_ID = "11111111-1111-1111-1111-111111111111";
const AUTH_STORAGE_KEY = "sb-localhost-auth-token";

export type SeedItem = {
  id?: string;
  name: string;
  typeLine?: string;
  body: string;
  costWeight?: string;
};

function makeFakeJwt(claims: Record<string, unknown>): string {
  const b64url = (s: string) => btoa(s).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify(claims));
  return `${header}.${payload}.fake-signature`;
}

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
    route.fulfill({ json: [deckRow] });
  });

  await page.route(`${SB_URL}/rest/v1/cards*`, (route) => {
    route.fulfill({ json: cardRows });
  });

  await page.route(`${SB_URL}/auth/v1/**`, (route) => {
    route.fulfill({
      status: 200,
      json: user,
    });
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
