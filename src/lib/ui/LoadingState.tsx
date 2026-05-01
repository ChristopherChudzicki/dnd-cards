import styles from "./LoadingState.module.css";

export type LoadingStateProps = {
  label?: string;
};

export function LoadingState({ label = "Loading…" }: LoadingStateProps) {
  return (
    <div role="status" className={styles.root}>
      {label}
    </div>
  );
}
