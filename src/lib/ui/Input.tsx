import { Input as RACInput, type InputProps as RACInputProps } from "react-aria-components";
import styles from "./Input.module.css";

export type InputProps = Omit<RACInputProps, "className"> & {
  className?: string;
};

export function Input({ className, ...rest }: InputProps) {
  return <RACInput {...rest} className={[styles.input, className].filter(Boolean).join(" ")} />;
}
