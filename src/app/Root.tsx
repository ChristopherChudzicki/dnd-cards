import { Link, Outlet } from "@tanstack/react-router";
import { UserMenu } from "../lib/ui/UserMenu";
import styles from "./root.module.css";

export function Root() {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link to="/" className={styles.brand}>
          D&amp;D Cards
        </Link>
        <nav aria-label="Primary" className={styles.nav}>
          <Link to="/" className={styles.link} activeProps={{ className: styles.active }}>
            Decks
          </Link>
        </nav>
        <UserMenu />
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
