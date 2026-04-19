import { Link, Outlet } from "@tanstack/react-router";
import styles from "./root.module.css";

export function Root() {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <span className={styles.brand}>D&amp;D Cards</span>
        <nav className={styles.nav}>
          <Link to="/" className={styles.link} activeProps={{ className: styles.active }}>
            Cards
          </Link>
          <Link to="/print" className={styles.link} activeProps={{ className: styles.active }}>
            Print
          </Link>
        </nav>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
