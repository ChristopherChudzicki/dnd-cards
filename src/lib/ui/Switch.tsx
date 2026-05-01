import type { ReactNode } from "react";
import { Switch as RACSwitch, type SwitchProps as RACSwitchProps } from "react-aria-components";
import styles from "./Switch.module.css";

export type SwitchProps = Omit<RACSwitchProps, "className" | "children"> & {
  className?: string;
  children: ReactNode;
};

export function Switch({ className, children, ...rest }: SwitchProps) {
  return (
    <RACSwitch {...rest} className={[styles.switch, className].filter(Boolean).join(" ")}>
      <span className={styles.indicator} />
      {children}
    </RACSwitch>
  );
}
