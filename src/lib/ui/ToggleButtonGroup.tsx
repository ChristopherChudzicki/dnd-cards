import {
  ToggleButtonGroup as RACToggleButtonGroup,
  type ToggleButtonGroupProps as RACToggleButtonGroupProps,
} from "react-aria-components";
import styles from "./ToggleButtonGroup.module.css";

export type ToggleButtonGroupProps = Omit<RACToggleButtonGroupProps, "className"> & {
  className?: string;
};

export function ToggleButtonGroup({ className, ...rest }: ToggleButtonGroupProps) {
  return (
    <RACToggleButtonGroup
      {...rest}
      className={[styles.group, className].filter(Boolean).join(" ")}
    />
  );
}
