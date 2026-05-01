import { Icon } from "@iconify/react";
import pencilIcon from "@iconify-icons/lucide/pencil";

export function PencilIcon({ size = 16 }: { size?: number }) {
  return <Icon icon={pencilIcon} width={size} height={size} aria-hidden="true" />;
}
