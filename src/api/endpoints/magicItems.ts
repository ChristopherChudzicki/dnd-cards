import { apiGet } from "../apiClient";

export type Ruleset = "2014" | "2024";

export type MagicItemIndexEntry = {
  index: string;
  name: string;
  url: string;
};

export type MagicItemIndex = {
  count: number;
  results: MagicItemIndexEntry[];
};

export type EquipmentCategoryRef = {
  index: string;
  name: string;
  url: string;
};

type MagicItemDetail2024Raw = {
  index: string;
  name: string;
  equipment_category: EquipmentCategoryRef;
  rarity: { name: string };
  attunement: boolean;
  desc: string;
  image?: string;
  variants: unknown[];
  variant: boolean;
};

type MagicItemDetail2014Raw = {
  index: string;
  name: string;
  equipment_category: EquipmentCategoryRef;
  rarity: { name: string };
  desc: string[];
  image?: string;
  variants: unknown[];
  variant: boolean;
};

export type MagicItemDetail2024 = MagicItemDetail2024Raw & { ruleset: "2024" };
export type MagicItemDetail2014 = MagicItemDetail2014Raw & { ruleset: "2014" };
export type MagicItemDetail = MagicItemDetail2014 | MagicItemDetail2024;

export const fetchMagicItemIndex = (ruleset: Ruleset): Promise<MagicItemIndex> =>
  apiGet<MagicItemIndex>(`/api/${ruleset}/magic-items`);

export const fetchMagicItemDetail = async (
  ruleset: Ruleset,
  slug: string,
): Promise<MagicItemDetail> => {
  if (ruleset === "2024") {
    const raw = await apiGet<MagicItemDetail2024Raw>(`/api/2024/magic-items/${slug}`);
    return { ...raw, ruleset: "2024" };
  }
  const raw = await apiGet<MagicItemDetail2014Raw>(`/api/2014/magic-items/${slug}`);
  return { ...raw, ruleset: "2014" };
};
