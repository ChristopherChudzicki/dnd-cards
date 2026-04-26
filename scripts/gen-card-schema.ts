// scripts/gen-card-schema.ts
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { toJSONSchema } from "zod";
import { cardPayloadSchema } from "../src/decks/schema";

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = resolve(__dirname, "../supabase/schemas/card-payload.json");
const schema = toJSONSchema(cardPayloadSchema);

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(schema, null, 2)}\n`, "utf8");
console.log(`Wrote ${out}`);
