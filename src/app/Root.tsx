import { Link, Outlet } from "@tanstack/react-router";
import { supabase } from "../api/supabase";
import { useSession } from "../auth/useSession";
import styles from "./root.module.css";

export function Root() {
  const session = useSession();

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <span className={styles.brand}>D&amp;D Cards</span>
        <nav className={styles.nav}>
          <Link to="/" className={styles.link} activeProps={{ className: styles.active }}>
            Decks
          </Link>
          <Link to="/print" className={styles.link} activeProps={{ className: styles.active }}>
            Print
          </Link>
          {session.status === "authenticated" ? (
            <>
              <span className={styles.user}>{session.user.email}</span>
              <button
                type="button"
                className={styles.signOut}
                onClick={() => supabase.auth.signOut()}
              >
                Sign out
              </button>
            </>
          ) : session.status === "unauthenticated" ? (
            <Link to="/login" className={styles.link}>
              Sign in
            </Link>
          ) : null}
        </nav>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
