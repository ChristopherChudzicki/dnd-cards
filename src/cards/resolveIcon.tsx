import { addCollection, Icon, iconLoaded } from "@iconify/react";
import type { IconifyIcon, IconifyJSON } from "@iconify/types";
import iconAnkh from "@iconify-icons/game-icons/ankh";
import iconAnvil from "@iconify-icons/game-icons/anvil";
import iconArrowCluster from "@iconify-icons/game-icons/arrow-cluster";
import iconBarbute from "@iconify-icons/game-icons/barbute";
import iconBattleAxe from "@iconify-icons/game-icons/battle-axe";
import iconBloodyStash from "@iconify-icons/game-icons/bloody-stash";
import iconBoots from "@iconify-icons/game-icons/boots";
import iconBottleVapors from "@iconify-icons/game-icons/bottle-vapors";
import iconBowArrow from "@iconify-icons/game-icons/bow-arrow";
import iconBowieKnife from "@iconify-icons/game-icons/bowie-knife";
import iconBread from "@iconify-icons/game-icons/bread";
import iconBroadsword from "@iconify-icons/game-icons/broadsword";
import iconCape from "@iconify-icons/game-icons/cape";
import iconChainMail from "@iconify-icons/game-icons/chain-mail";
import iconCheckedShield from "@iconify-icons/game-icons/checked-shield";
import iconChestArmor from "@iconify-icons/game-icons/chest-armor";
import iconClaws from "@iconify-icons/game-icons/claws";
import iconCompass from "@iconify-icons/game-icons/compass";
import iconCrossbow from "@iconify-icons/game-icons/crossbow";
import iconCrystalBall from "@iconify-icons/game-icons/crystal-ball";
import iconCrystalCluster from "@iconify-icons/game-icons/crystal-cluster";
import iconCrystalShrine from "@iconify-icons/game-icons/crystal-shrine";
import iconDiamondRing from "@iconify-icons/game-icons/diamond-ring";
import iconDragonHead from "@iconify-icons/game-icons/dragon-head";
import iconDrinkMe from "@iconify-icons/game-icons/drink-me";
import iconEvilEyes from "@iconify-icons/game-icons/evil-eyes";
import iconFangs from "@iconify-icons/game-icons/fangs";
import iconFireFlower from "@iconify-icons/game-icons/fire-flower";
import iconFishingPole from "@iconify-icons/game-icons/fishing-pole";
import iconFizzingFlask from "@iconify-icons/game-icons/fizzing-flask";
import iconFlail from "@iconify-icons/game-icons/flail";
import iconGauntlet from "@iconify-icons/game-icons/gauntlet";
import iconGemPendant from "@iconify-icons/game-icons/gem-pendant";
import iconGlaive from "@iconify-icons/game-icons/glaive";
import iconHalberd from "@iconify-icons/game-icons/halberd";
import iconHandSaw from "@iconify-icons/game-icons/hand-saw";
import iconHeavyBullets from "@iconify-icons/game-icons/heavy-bullets";
import iconHighShot from "@iconify-icons/game-icons/high-shot";
import iconHolySymbol from "@iconify-icons/game-icons/holy-symbol";
import iconHoneyJar from "@iconify-icons/game-icons/honey-jar";
import iconHornedSkull from "@iconify-icons/game-icons/horned-skull";
import iconIceCube from "@iconify-icons/game-icons/ice-cube";
import iconKatana from "@iconify-icons/game-icons/katana";
import iconKnapsack from "@iconify-icons/game-icons/knapsack";
import iconLanternFlame from "@iconify-icons/game-icons/lantern-flame";
import iconLeatherArmor from "@iconify-icons/game-icons/leather-armor";
import iconLightningArc from "@iconify-icons/game-icons/lightning-arc";
import iconLockedChest from "@iconify-icons/game-icons/locked-chest";
import iconLockpicks from "@iconify-icons/game-icons/lockpicks";
import iconMaceHead from "@iconify-icons/game-icons/mace-head";
import iconMagicLamp from "@iconify-icons/game-icons/magic-lamp";
import iconMagicPortal from "@iconify-icons/game-icons/magic-portal";
import iconMagicShield from "@iconify-icons/game-icons/magic-shield";
import iconMagicSwirl from "@iconify-icons/game-icons/magic-swirl";
import iconMagnifyingGlass from "@iconify-icons/game-icons/magnifying-glass";
import iconMeat from "@iconify-icons/game-icons/meat";
import iconMoon from "@iconify-icons/game-icons/moon";
import iconNecklace from "@iconify-icons/game-icons/necklace";
import iconPerspectiveDiceSixFacesRandom from "@iconify-icons/game-icons/perspective-dice-six-faces-random";
import iconPlainDagger from "@iconify-icons/game-icons/plain-dagger";
import iconPotionBall from "@iconify-icons/game-icons/potion-ball";
import iconRing from "@iconify-icons/game-icons/ring";
import iconRopeCoil from "@iconify-icons/game-icons/rope-coil";
import iconRoundBottomFlask from "@iconify-icons/game-icons/round-bottom-flask";
import iconRuneStone from "@iconify-icons/game-icons/rune-stone";
import iconScrollUnfurled from "@iconify-icons/game-icons/scroll-unfurled";
import iconScythe from "@iconify-icons/game-icons/scythe";
import iconShield from "@iconify-icons/game-icons/shield";
import iconShinyApple from "@iconify-icons/game-icons/shiny-apple";
import iconSkullCrossedBones from "@iconify-icons/game-icons/skull-crossed-bones";
import iconSnowflake1 from "@iconify-icons/game-icons/snowflake-1";
import iconSpade from "@iconify-icons/game-icons/spade";
import iconSparklingSabre from "@iconify-icons/game-icons/sparkling-sabre";
import iconSpearHook from "@iconify-icons/game-icons/spear-hook";
import iconSpellBook from "@iconify-icons/game-icons/spell-book";
import iconSun from "@iconify-icons/game-icons/sun";
import iconSwapBag from "@iconify-icons/game-icons/swap-bag";
import iconThrownKnife from "@iconify-icons/game-icons/thrown-knife";
import iconThrownSpear from "@iconify-icons/game-icons/thrown-spear";
import iconTorch from "@iconify-icons/game-icons/torch";
import iconTornado from "@iconify-icons/game-icons/tornado";
import iconTrident from "@iconify-icons/game-icons/trident";
import iconVial from "@iconify-icons/game-icons/vial";
import iconVisoredHelm from "@iconify-icons/game-icons/visored-helm";
import iconWarhammer from "@iconify-icons/game-icons/warhammer";
import iconWhip from "@iconify-icons/game-icons/whip";
import iconWingedScepter from "@iconify-icons/game-icons/winged-scepter";
import iconWizardStaff from "@iconify-icons/game-icons/wizard-staff";
import iconWolfHead from "@iconify-icons/game-icons/wolf-head";
import iconWoodClub from "@iconify-icons/game-icons/wood-club";
import { isCurated } from "./curatedIcons";

const CURATED_PREFIX = "game-icons";

const CURATED: Record<string, IconifyIcon> = {
  broadsword: iconBroadsword,
  "battle-axe": iconBattleAxe,
  warhammer: iconWarhammer,
  trident: iconTrident,
  "bow-arrow": iconBowArrow,
  crossbow: iconCrossbow,
  "plain-dagger": iconPlainDagger,
  "spear-hook": iconSpearHook,
  scythe: iconScythe,
  flail: iconFlail,
  "mace-head": iconMaceHead,
  halberd: iconHalberd,
  "sparkling-sabre": iconSparklingSabre,
  "wood-club": iconWoodClub,
  whip: iconWhip,
  glaive: iconGlaive,
  "thrown-knife": iconThrownKnife,
  "winged-scepter": iconWingedScepter,
  "bowie-knife": iconBowieKnife,
  katana: iconKatana,
  shield: iconShield,
  "checked-shield": iconCheckedShield,
  barbute: iconBarbute,
  "visored-helm": iconVisoredHelm,
  "chest-armor": iconChestArmor,
  "chain-mail": iconChainMail,
  "leather-armor": iconLeatherArmor,
  gauntlet: iconGauntlet,
  cape: iconCape,
  boots: iconBoots,
  ring: iconRing,
  "diamond-ring": iconDiamondRing,
  "gem-pendant": iconGemPendant,
  "crystal-cluster": iconCrystalCluster,
  "wizard-staff": iconWizardStaff,
  "magic-swirl": iconMagicSwirl,
  "scroll-unfurled": iconScrollUnfurled,
  "spell-book": iconSpellBook,
  "crystal-ball": iconCrystalBall,
  "magic-lamp": iconMagicLamp,
  necklace: iconNecklace,
  ankh: iconAnkh,
  "rune-stone": iconRuneStone,
  "magic-portal": iconMagicPortal,
  "magic-shield": iconMagicShield,
  "potion-ball": iconPotionBall,
  "round-bottom-flask": iconRoundBottomFlask,
  "drink-me": iconDrinkMe,
  "bottle-vapors": iconBottleVapors,
  vial: iconVial,
  meat: iconMeat,
  bread: iconBread,
  "shiny-apple": iconShinyApple,
  "honey-jar": iconHoneyJar,
  "fizzing-flask": iconFizzingFlask,
  "arrow-cluster": iconArrowCluster,
  "high-shot": iconHighShot,
  "heavy-bullets": iconHeavyBullets,
  "thrown-spear": iconThrownSpear,
  lockpicks: iconLockpicks,
  "magnifying-glass": iconMagnifyingGlass,
  "rope-coil": iconRopeCoil,
  "hand-saw": iconHandSaw,
  anvil: iconAnvil,
  "fishing-pole": iconFishingPole,
  spade: iconSpade,
  "lantern-flame": iconLanternFlame,
  torch: iconTorch,
  compass: iconCompass,
  "fire-flower": iconFireFlower,
  "ice-cube": iconIceCube,
  "lightning-arc": iconLightningArc,
  "holy-symbol": iconHolySymbol,
  "skull-crossed-bones": iconSkullCrossedBones,
  "evil-eyes": iconEvilEyes,
  moon: iconMoon,
  sun: iconSun,
  "snowflake-1": iconSnowflake1,
  tornado: iconTornado,
  "dragon-head": iconDragonHead,
  "wolf-head": iconWolfHead,
  claws: iconClaws,
  fangs: iconFangs,
  "horned-skull": iconHornedSkull,
  knapsack: iconKnapsack,
  "swap-bag": iconSwapBag,
  "locked-chest": iconLockedChest,
  "bloody-stash": iconBloodyStash,
  "crystal-shrine": iconCrystalShrine,
  "perspective-dice-six-faces-random": iconPerspectiveDiceSixFacesRandom,
};

let fullSetPromise: Promise<void> | null = null;
export function ensureFullSet(): Promise<void> {
  fullSetPromise ??= import("@iconify-json/game-icons/icons.json").then((m) => {
    addCollection(m.default as IconifyJSON);
  });
  return fullSetPromise;
}

const warned = new Set<string>();

type Props = {
  iconKey: string;
};

export function ResolvedIcon({ iconKey }: Props) {
  const curated = CURATED[iconKey];
  if (curated) {
    return <Icon icon={curated} />;
  }
  if (!isCurated(iconKey)) {
    void ensureFullSet().then(() => {
      if (
        import.meta.env.DEV &&
        !iconLoaded(`${CURATED_PREFIX}:${iconKey}`) &&
        !warned.has(iconKey)
      ) {
        warned.add(iconKey);
        console.warn(`[ResolvedIcon] Unknown iconKey "${iconKey}" — rendering nothing.`);
      }
    });
  }
  return <Icon icon={`${CURATED_PREFIX}:${iconKey}`} />;
}
