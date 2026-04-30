import { addCollection, Icon, iconLoaded } from "@iconify/react";
import type { IconifyJSON } from "@iconify/types";
import gameIcons from "@iconify-json/game-icons/icons.json";
import { CURATED_ICONS, isCurated } from "./curatedIcons";

const CURATED_PREFIX = "game-icons";

const allIcons = gameIcons.icons as IconifyJSON["icons"];
const curatedCollection: IconifyJSON = {
  prefix: gameIcons.prefix,
  icons: Object.fromEntries(
    CURATED_ICONS.map((key) => [key, allIcons[key]]),
  ) as IconifyJSON["icons"],
};
addCollection(curatedCollection);

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
  "data-testid"?: string;
};

export function ResolvedIcon({ iconKey, "data-testid": testId }: Props) {
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
  return (
    <span data-testid={testId}>
      <Icon icon={`${CURATED_PREFIX}:${iconKey}`} />
    </span>
  );
}
