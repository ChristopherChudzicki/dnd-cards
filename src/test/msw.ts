import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import type { MagicItemDetail, MagicItemIndex, Ruleset } from "../api/endpoints/magicItems";

export const server = setupServer();

export const magicItemIndexHandler = (ruleset: Ruleset, body: MagicItemIndex) =>
  http.get(`https://www.dnd5eapi.co/api/${ruleset}/magic-items`, () => HttpResponse.json(body));

export const magicItemDetailHandler = (ruleset: Ruleset, slug: string, body: MagicItemDetail) => {
  const { ruleset: _ruleset, ...rest } = body as MagicItemDetail & { ruleset: Ruleset };
  return http.get(`https://www.dnd5eapi.co/api/${ruleset}/magic-items/${slug}`, () =>
    HttpResponse.json(rest),
  );
};

export const apiErrorHandler = (path: string, status: number) =>
  http.get(`https://www.dnd5eapi.co${path}`, () => new HttpResponse(null, { status }));

const SB_URL = "http://localhost:54321";

// Default empty responses for the endpoints we rely on.
// Tests can override with `server.use(...)` for specific cases.
export const supabaseDefaultHandlers = [
  http.get(`${SB_URL}/rest/v1/decks`, () => HttpResponse.json([])),
  http.get(`${SB_URL}/rest/v1/cards`, () => HttpResponse.json([])),
  http.post(`${SB_URL}/rest/v1/decks`, async ({ request }) => {
    const body = (await request.json()) as Array<Record<string, unknown>> | Record<string, unknown>;
    const arr = Array.isArray(body) ? body : [body];
    return HttpResponse.json(arr, { status: 201 });
  }),
  http.post(`${SB_URL}/rest/v1/cards`, async ({ request }) => {
    const body = (await request.json()) as Array<Record<string, unknown>> | Record<string, unknown>;
    const arr = Array.isArray(body) ? body : [body];
    return HttpResponse.json(arr, { status: 201 });
  }),
  http.patch(`${SB_URL}/rest/v1/cards`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json([body]);
  }),
  http.patch(`${SB_URL}/rest/v1/decks`, async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json([body]);
  }),
  http.delete(`${SB_URL}/rest/v1/decks`, () => HttpResponse.json([])),
  http.delete(`${SB_URL}/rest/v1/cards`, () => HttpResponse.json([])),
];

// Register the default handlers on import. Per-test `server.use(...)`
// overrides take precedence; `server.resetHandlers()` in afterEach
// restores this baseline.
server.use(...supabaseDefaultHandlers);
