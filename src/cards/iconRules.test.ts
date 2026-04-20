import {
  Crosshair,
  FlaskRound,
  Gem,
  ScrollText,
  Shield,
  Sparkles,
  Sword,
  Wand2,
} from "lucide-react";
import { describe, expect, test } from "vitest";
import { itemCardFactory } from "./factories";
import { pickIcon } from "./iconRules";

describe("pickIcon", () => {
  test("weapon typeLine picks Sword", () => {
    const card = itemCardFactory.build({ name: "Flame Tongue", typeLine: "Weapons, rare" });
    expect(pickIcon(card)).toBe(Sword);
  });

  test("armor typeLine picks Shield", () => {
    const card = itemCardFactory.build({
      name: "Sentinel Shield",
      typeLine: "Armor (shield), uncommon",
    });
    expect(pickIcon(card)).toBe(Shield);
  });

  test("rings typeLine picks Gem", () => {
    const card = itemCardFactory.build({ name: "Ring of Protection", typeLine: "Rings, rare" });
    expect(pickIcon(card)).toBe(Gem);
  });

  test("potion typeLine picks FlaskRound", () => {
    const card = itemCardFactory.build({ name: "Potion of Healing", typeLine: "Potions, common" });
    expect(pickIcon(card)).toBe(FlaskRound);
  });

  test("scroll typeLine picks ScrollText", () => {
    const card = itemCardFactory.build({ name: "Spell Scroll", typeLine: "Scrolls, uncommon" });
    expect(pickIcon(card)).toBe(ScrollText);
  });

  test("rod/wand/staff typeLine picks Wand2", () => {
    const rod = itemCardFactory.build({ name: "Rod of Absorption", typeLine: "Rods, very rare" });
    const wand = itemCardFactory.build({
      name: "Wand of Magic Missiles",
      typeLine: "Wands, uncommon",
    });
    const staff = itemCardFactory.build({ name: "Staff of Power", typeLine: "Staves, very rare" });
    expect(pickIcon(rod)).toBe(Wand2);
    expect(pickIcon(wand)).toBe(Wand2);
    expect(pickIcon(staff)).toBe(Wand2);
  });

  test("ammunition typeLine picks Crosshair", () => {
    const card = itemCardFactory.build({ name: "Arrow +1", typeLine: "Ammunition, uncommon" });
    expect(pickIcon(card)).toBe(Crosshair);
  });

  test("wondrous-items typeLine falls through to Sparkles", () => {
    const card = itemCardFactory.build({
      name: "Bag of Holding",
      typeLine: "Wondrous Items, uncommon",
    });
    expect(pickIcon(card)).toBe(Sparkles);
  });

  test("completely unmatched item falls through to Sparkles", () => {
    const card = itemCardFactory.build({ name: "Mysterious Object", typeLine: "" });
    expect(pickIcon(card)).toBe(Sparkles);
  });

  test("name alone can trigger a match for custom items", () => {
    const card = itemCardFactory.build({ name: "Vorpal Sword", typeLine: "" });
    expect(pickIcon(card)).toBe(Sword);
  });

  test("specific weapon keywords in custom names work", () => {
    expect(pickIcon(itemCardFactory.build({ name: "Frost Dagger", typeLine: "" }))).toBe(Sword);
    expect(pickIcon(itemCardFactory.build({ name: "Elven Bow", typeLine: "" }))).toBe(Sword);
    expect(pickIcon(itemCardFactory.build({ name: "Warhammer of Thunder", typeLine: "" }))).toBe(
      Sword,
    );
    expect(pickIcon(itemCardFactory.build({ name: "Trident of Fish Command", typeLine: "" }))).toBe(
      Sword,
    );
  });

  test("armor-like names in custom items pick Shield", () => {
    expect(pickIcon(itemCardFactory.build({ name: "Chainmail +1", typeLine: "" }))).toBe(Shield);
    expect(pickIcon(itemCardFactory.build({ name: "Dragon Helm", typeLine: "" }))).toBe(Shield);
  });

  test("potion-like names in custom items pick FlaskRound", () => {
    expect(pickIcon(itemCardFactory.build({ name: "Elixir of Life", typeLine: "" }))).toBe(
      FlaskRound,
    );
    expect(pickIcon(itemCardFactory.build({ name: "Philter of Love", typeLine: "" }))).toBe(
      FlaskRound,
    );
  });

  test("earlier rules win when patterns overlap", () => {
    // "Bow" (weapon) appears before armor; "Crossbow" should be Sword, not Shield.
    const card = itemCardFactory.build({ name: "Crossbow of Speed", typeLine: "" });
    expect(pickIcon(card)).toBe(Sword);
  });

  test("case-insensitive matching", () => {
    const card = itemCardFactory.build({ name: "POTION OF HEALING", typeLine: "" });
    expect(pickIcon(card)).toBe(FlaskRound);
  });
});
