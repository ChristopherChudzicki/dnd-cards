-- 20260426000001_jsonschema.sql
-- Server-side JSON Schema validation for card payloads.

create extension if not exists pg_jsonschema;

alter table public.cards
  add constraint cards_payload_valid
  check (json_matches_schema(
    $schema$
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
    $schema$::json,
    payload::json
  ));
