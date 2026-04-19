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
