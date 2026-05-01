import {
  ToggleButton as RACToggleButton,
  type ToggleButtonProps as RACToggleButtonProps,
} from "react-aria-components";
import styles from "./ToggleButton.module.css";

export type ToggleButtonProps = Omit<RACToggleButtonProps, "className"> & {
  className?: string;
};

export function ToggleButton({ className, ...rest }: ToggleButtonProps) {
  return (
    <RACToggleButton {...rest} className={[styles.btn, className].filter(Boolean).join(" ")} />
  );
}
