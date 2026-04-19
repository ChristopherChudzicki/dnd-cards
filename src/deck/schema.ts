import { z } from "zod";

const apiRefSchema = z.object({
  system: z.literal("dnd5eapi"),
  slug: z.string(),
  ruleset: z.enum(["2014", "2024"]),
});

const baseCardSchema = z.object({
  id: z.string(),
  name: z.string(),
  body: z.string(),
  imageUrl: z.string().optional(),
  source: z.enum(["custom", "api"]),
  apiRef: apiRefSchema.optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const itemCardSchema = baseCardSchema.extend({
  kind: z.literal("item"),
  typeLine: z.string(),
  costWeight: z.string().optional(),
});

export const spellCardSchema = baseCardSchema.extend({
  kind: z.literal("spell"),
});

export const abilityCardSchema = baseCardSchema.extend({
  kind: z.literal("ability"),
});

export const cardSchema = z.discriminatedUnion("kind", [
  itemCardSchema,
  spellCardSchema,
  abilityCardSchema,
]);

export const deckSchema = z.object({
  version: z.literal(1),
  cards: z.array(cardSchema),
});
