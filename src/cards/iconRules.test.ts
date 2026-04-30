import { describe, expect, test } from "vitest";
import { itemCardFactory } from "./factories";
import { FALLBACK_ICON_KEY, pickIconKey } from "./iconRules";

describe("pickIconKey", () => {
  test("Trident in the name picks 'trident', not 'broadsword'", () => {
    const card = itemCardFactory.build({ name: "Flame Tongue Trident", typeLine: "Weapon, rare" });
    expect(pickIconKey(card)).toBe("trident");
  });

  test("Axe variants pick 'battle-axe'", () => {
    expect(pickIconKey(itemCardFactory.build({ name: "Battleaxe", typeLine: "" }))).toBe(
      "battle-axe",
    );
    expect(pickIconKey(itemCardFactory.build({ name: "Greataxe of Vorpal", typeLine: "" }))).toBe(
      "battle-axe",
    );
    expect(pickIconKey(itemCardFactory.build({ name: "Handaxe", typeLine: "" }))).toBe(
      "battle-axe",
    );
  });

  test("Hammer variants pick 'warhammer'", () => {
    expect(pickIconKey(itemCardFactory.build({ name: "Warhammer of Thunder", typeLine: "" }))).toBe(
      "warhammer",
    );
    expect(pickIconKey(itemCardFactory.build({ name: "Maul +1", typeLine: "" }))).toBe(
      "warhammer",
    );
  });

  test("Bow variants pick 'bow-arrow' (not the broadsword catch-all)", () => {
    expect(pickIconKey(itemCardFactory.build({ name: "Elven Longbow", typeLine: "" }))).toBe(
      "bow-arrow",
    );
    expect(pickIconKey(itemCardFactory.build({ name: "Shortbow", typeLine: "" }))).toBe(
      "bow-arrow",
    );
  });

  test("Crossbow picks 'crossbow', not 'bow-arrow'", () => {
    expect(pickIconKey(itemCardFactory.build({ name: "Crossbow of Speed", typeLine: "" }))).toBe(
      "crossbow",
    );
  });

  test("Generic weapon catch-all picks 'broadsword'", () => {
    const card = itemCardFactory.build({ name: "Vorpal Sword", typeLine: "Weapon, very rare" });
    expect(pickIconKey(card)).toBe("broadsword");
  });

  test("Armor typeLine picks 'shield'", () => {
    const card = itemCardFactory.build({
      name: "Sentinel Shield",
      typeLine: "Armor (shield), uncommon",
    });
    expect(pickIconKey(card)).toBe("shield");
  });

  test("Rings typeLine picks 'ring'", () => {
    const card = itemCardFactory.build({ name: "Ring of Protection", typeLine: "Rings, rare" });
    expect(pickIconKey(card)).toBe("ring");
  });

  test("Potion typeLine picks 'potion-ball'", () => {
    const card = itemCardFactory.build({ name: "Potion of Healing", typeLine: "Potions, common" });
    expect(pickIconKey(card)).toBe("potion-ball");
  });

  test("Scroll typeLine picks 'scroll-unfurled'", () => {
    const card = itemCardFactory.build({ name: "Spell Scroll", typeLine: "Scrolls, uncommon" });
    expect(pickIconKey(card)).toBe("scroll-unfurled");
  });

  test("Rod/wand/staff picks 'wizard-staff'", () => {
    expect(
      pickIconKey(
        itemCardFactory.build({ name: "Rod of Absorption", typeLine: "Rods, very rare" }),
      ),
    ).toBe("wizard-staff");
    expect(
      pickIconKey(
        itemCardFactory.build({ name: "Wand of Magic Missiles", typeLine: "Wands, uncommon" }),
      ),
    ).toBe("wizard-staff");
    expect(
      pickIconKey(itemCardFactory.build({ name: "Staff of Power", typeLine: "Staves, very rare" })),
    ).toBe("wizard-staff");
  });

  test("Ammunition typeLine picks 'arrow-cluster'", () => {
    const card = itemCardFactory.build({ name: "Arrow +1", typeLine: "Ammunition, uncommon" });
    expect(pickIconKey(card)).toBe("arrow-cluster");
  });

  test("Wondrous Items falls through to the fallback", () => {
    const card = itemCardFactory.build({
      name: "Bag of Holding",
      typeLine: "Wondrous Items, uncommon",
    });
    expect(pickIconKey(card)).toBe(FALLBACK_ICON_KEY);
  });

  test("Completely unmatched item falls through to the fallback", () => {
    const card = itemCardFactory.build({ name: "Mysterious Object", typeLine: "" });
    expect(pickIconKey(card)).toBe(FALLBACK_ICON_KEY);
  });

  test("Case-insensitive matching", () => {
    const card = itemCardFactory.build({ name: "POTION OF HEALING", typeLine: "" });
    expect(pickIconKey(card)).toBe("potion-ball");
  });
});
