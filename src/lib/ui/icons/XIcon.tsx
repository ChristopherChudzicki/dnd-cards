import { Icon } from "@iconify/react";
import xIcon from "@iconify-icons/lucide/x";

export function XIcon({ size = 16 }: { size?: number }) {
  return <Icon icon={xIcon} width={size} height={size} aria-hidden="true" />;
}
