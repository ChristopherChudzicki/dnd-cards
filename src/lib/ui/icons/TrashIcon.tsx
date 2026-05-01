import { Icon } from "@iconify/react";
import trashIcon from "@iconify-icons/lucide/trash-2";

export function TrashIcon({ size = 16 }: { size?: number }) {
  return <Icon icon={trashIcon} width={size} height={size} aria-hidden="true" />;
}
