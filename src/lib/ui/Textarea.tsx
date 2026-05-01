import type { TextareaHTMLAttributes } from "react";
import styles from "./Textarea.module.css";

export type TextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className"> & {
  className?: string;
};

export function Textarea({ className, ...rest }: TextareaProps) {
  return (
    <textarea {...rest} className={[styles.textarea, className].filter(Boolean).join(" ")} />
  );
}
