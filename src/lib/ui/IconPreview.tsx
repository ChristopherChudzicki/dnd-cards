import { ResolvedIcon } from "../../cards/resolveIcon";
import styles from "./IconPreview.module.css";

export type IconPreviewSize = "sm" | "md";

type Props = {
  iconKey: string;
  label: string;
  size?: IconPreviewSize;
};

export function IconPreview({ iconKey, label, size = "sm" }: Props) {
  const sizeClass = size === "sm" ? styles.sm : styles.md;
  return (
    <span className={`${styles.preview} ${sizeClass}`} role="img" aria-label={label}>
      <ResolvedIcon iconKey={iconKey} />
    </span>
  );
}
