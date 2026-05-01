import type { ReactNode } from "react";
import { Dialog, Modal, ModalOverlay } from "react-aria-components";
import styles from "./DialogShell.module.css";

export type DialogShellProps = {
  "aria-label": string;
  size?: "md" | "lg";
  height?: "fit" | { fixed: string };
  padding?: "default" | "none";
  isDismissable?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: (renderProps: { close: () => void }) => ReactNode;
};

export function DialogShell({
  size = "md",
  height = "fit",
  padding = "default",
  isDismissable = true,
  isOpen,
  onOpenChange,
  children,
  "aria-label": ariaLabel,
}: DialogShellProps) {
  const isFit = height === "fit";
  const modalStyle = isFit ? undefined : { height: height.fixed };
  return (
    <ModalOverlay
      className={styles.overlay}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      isDismissable={isDismissable}
    >
      <Modal
        className={styles.modal}
        data-size={size}
        data-height={isFit ? "fit" : undefined}
        style={modalStyle}
      >
        <Dialog aria-label={ariaLabel} className={styles.dialog} data-padding={padding}>
          {children}
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
