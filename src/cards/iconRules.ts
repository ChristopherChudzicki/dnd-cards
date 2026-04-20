import {
  Crosshair,
  FlaskRound,
  Gem,
  type LucideIcon,
  ScrollText,
  Shield,
  Sparkles,
  Sword,
  Wand2,
} from "lucide-react";
import type { ItemCard } from "./types";

/**
 * Ordered list of icon-picking rules. The first rule whose pattern matches
 * the concatenated `name + " " + typeLine` wins. Order matters: more specific
 * weapon terms must come before armor patterns, etc.
 *
 * Extend by adding a new entry here — keep overlapping concerns adjacent and
 * document what a rule is for in `description`.
 */
export type IconRule = {
  pattern: RegExp;
  icon: LucideIcon;
  description: string;
};

export const ICON_RULES: readonly IconRule[] = [
  {
    pattern:
      /\bweapons?\b|sword|blade|dagger|axe|\bbow\b|crossbow|spear|mace|hammer|trident|flail|pick|lance|glaive|halberd|scimitar|rapier|greataxe|greatsword|longsword|shortsword/i,
    icon: Sword,
    description: "weapon / blade / ranged weapon",
  },
  {
    pattern: /\barmor\b|\bshield\b|\bplate\b|chainmail|\bmail\b|\bhelm\b|cuirass|gauntlet|bracers/i,
    icon: Shield,
    description: "armor / shield / helmet",
  },
  {
    pattern: /\brings?\b/i,
    icon: Gem,
    description: "ring",
  },
  {
    pattern: /\bpotions?\b|elixir|philter|oil\b/i,
    icon: FlaskRound,
    description: "potion / elixir",
  },
  {
    pattern: /\bscrolls?\b/i,
    icon: ScrollText,
    description: "scroll",
  },
  {
    pattern: /\brods?\b|\bwands?\b|\bstaff\b|staves/i,
    icon: Wand2,
    description: "rod / wand / staff",
  },
  {
    pattern: /ammunition|arrows?|bolts?|bullets?|darts?/i,
    icon: Crosshair,
    description: "ammunition",
  },
];

export const FALLBACK_ICON: LucideIcon = Sparkles;

export function pickIcon(card: ItemCard): LucideIcon {
  const haystack = `${card.name} ${card.typeLine}`;
  for (const rule of ICON_RULES) {
    if (rule.pattern.test(haystack)) return rule.icon;
  }
  return FALLBACK_ICON;
}
