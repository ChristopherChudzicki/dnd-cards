import type { ReactNode } from "react";
import styles from "./DialogHeader.module.css";
import { IconButton } from "./IconButton";
import { XIcon } from "./icons/XIcon";

export type DialogHeaderProps = {
  title: string;
  onClose: () => void;
  children?: ReactNode;
};

export function DialogHeader({ title, onClose, children }: DialogHeaderProps) {
  return (
    <header className={styles.header}>
      <h2 className={styles.title}>{title}</h2>
      {children !== undefined && <div className={styles.slot}>{children}</div>}
      <IconButton aria-label="Close" onPress={onClose}>
        <XIcon size={20} />
      </IconButton>
    </header>
  );
}
