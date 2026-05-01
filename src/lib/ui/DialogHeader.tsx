import type { ReactNode } from "react";
import { IconButton } from "./IconButton";
import styles from "./DialogHeader.module.css";

export type DialogHeaderProps = {
  title: string;
  onClose: () => void;
  children?: ReactNode;
  closeLabel?: string;
};

export function DialogHeader({
  title,
  onClose,
  children,
  closeLabel = "Close",
}: DialogHeaderProps) {
  return (
    <header className={styles.header}>
      <h2 className={styles.title}>{title}</h2>
      {children}
      <IconButton aria-label={closeLabel} onPress={onClose} className={styles.closeBtn}>
        <span aria-hidden="true">×</span>
      </IconButton>
    </header>
  );
}
