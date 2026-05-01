-- 20260430081056_add_iconkey_to_cards.sql
-- Re-issue cards_payload_valid with iconKey allowed on every card variant.
--
-- The embedded JSON Schema below is generated from src/decks/schema.ts via
-- `npm run gen:schema`. To update it, regenerate the JSON file and write a
-- NEW migration that follows the same drop-then-add pattern below — never
-- edit this file in place.

create extension if not exists pg_jsonschema;

alter table public.cards drop constraint if exists cards_payload_valid;

alter table public.cards
  add constraint cards_payload_valid
  check (jsonb_matches_schema(
    $cardpayload$
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "oneOf": [
    {
      "type": "object",
      "properties": {
        "name": {
          "type": "string"
        },
        "body": {
          "type": "string"
        },
        "imageUrl": {
          "type": "string"
        },
        "source": {
          "type": "string",
          "enum": [
            "custom",
            "api"
          ]
        },
        "apiRef": {
          "type": "object",
          "properties": {
            "system": {
              "type": "string",
              "const": "dnd5eapi"
            },
            "slug": {
              "type": "string"
            },
            "ruleset": {
              "type": "string",
              "enum": [
                "2014",
                "2024"
              ]
            }
          },
          "required": [
            "system",
            "slug",
            "ruleset"
          ],
          "additionalProperties": false
        },
        "createdAt": {
          "type": "string"
        },
        "updatedAt": {
          "type": "string"
        },
        "iconKey": {
          "type": "string"
        },
        "kind": {
          "type": "string",
          "const": "item"
        },
        "typeLine": {
          "type": "string"
        },
        "costWeight": {
          "type": "string"
        }
      },
      "required": [
        "name",
        "body",
        "source",
        "createdAt",
        "updatedAt",
        "kind",
        "typeLine"
      ],
      "additionalProperties": false
    },
    {
      "type": "object",
      "properties": {
        "name": {
          "type": "string"
        },
        "body": {
          "type": "string"
        },
        "imageUrl": {
          "type": "string"
        },
        "source": {
          "type": "string",
          "enum": [
            "custom",
            "api"
          ]
        },
        "apiRef": {
          "type": "object",
          "properties": {
            "system": {
              "type": "string",
              "const": "dnd5eapi"
            },
            "slug": {
              "type": "string"
            },
            "ruleset": {
              "type": "string",
              "enum": [
                "2014",
                "2024"
              ]
            }
          },
          "required": [
            "system",
            "slug",
            "ruleset"
          ],
          "additionalProperties": false
        },
        "createdAt": {
          "type": "string"
        },
        "updatedAt": {
          "type": "string"
        },
        "iconKey": {
          "type": "string"
        },
        "kind": {
          "type": "string",
          "const": "spell"
        }
      },
      "required": [
        "name",
        "body",
        "source",
        "createdAt",
        "updatedAt",
        "kind"
      ],
      "additionalProperties": false
    },
    {
      "type": "object",
      "properties": {
        "name": {
          "type": "string"
        },
        "body": {
          "type": "string"
        },
        "imageUrl": {
          "type": "string"
        },
        "source": {
          "type": "string",
          "enum": [
            "custom",
            "api"
          ]
        },
        "apiRef": {
          "type": "object",
          "properties": {
            "system": {
              "type": "string",
              "const": "dnd5eapi"
            },
            "slug": {
              "type": "string"
            },
            "ruleset": {
              "type": "string",
              "enum": [
                "2014",
                "2024"
              ]
            }
          },
          "required": [
            "system",
            "slug",
            "ruleset"
          ],
          "additionalProperties": false
        },
        "createdAt": {
          "type": "string"
        },
        "updatedAt": {
          "type": "string"
        },
        "iconKey": {
          "type": "string"
        },
        "kind": {
          "type": "string",
          "const": "ability"
        }
      },
      "required": [
        "name",
        "body",
        "source",
        "createdAt",
        "updatedAt",
        "kind"
      ],
      "additionalProperties": false
    }
  ]
}
    $cardpayload$::json,
    payload
  ));

comment on constraint cards_payload_valid on public.cards is
  'JSON Schema validation generated from src/decks/schema.ts via npm run gen:schema. Regen requires a new migration that drops + re-adds this constraint.';
