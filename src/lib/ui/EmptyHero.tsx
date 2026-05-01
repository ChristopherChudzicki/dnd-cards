import type { ReactNode } from "react";
import styles from "./EmptyHero.module.css";

export type EmptyHeroProps = {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
};

export function EmptyHero({ title, description, actions }: EmptyHeroProps) {
  return (
    <section className={styles.root}>
      <h2 className={styles.title}>{title}</h2>
      {description !== undefined && <p className={styles.description}>{description}</p>}
      {actions !== undefined && <div className={styles.actions}>{actions}</div>}
    </section>
  );
}
