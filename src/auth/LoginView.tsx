import { supabase } from "../api/supabase";
import styles from "./LoginView.module.css";

const DEV_EMAIL = "dev@local";
const DEV_PASSWORD = "devpass";

export function LoginView() {
  const signIn = (provider: "google" | "github") => {
    const next = new URLSearchParams(window.location.search).get("next") ?? "/";
    supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
  };

  const devSignIn = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email: DEV_EMAIL,
      password: DEV_PASSWORD,
    });
    if (error?.message === "Invalid login credentials") {
      // First run on this local DB — create the user. With
      // enable_confirmations=false (set in supabase/config.toml),
      // signUp establishes a session immediately.
      await supabase.auth.signUp({ email: DEV_EMAIL, password: DEV_PASSWORD });
    }
  };

  return (
    <section className={styles.login}>
      <h2>Sign in</h2>
      <p>Sign in to create and edit decks. Anyone can view shared decks without signing in.</p>
      <div className={styles.buttons}>
        <button type="button" onClick={() => signIn("google")}>
          Sign in with Google
        </button>
        <button type="button" onClick={() => signIn("github")}>
          Sign in with GitHub
        </button>
        {import.meta.env.DEV && (
          <button type="button" className={styles.dev} onClick={devSignIn}>
            Sign in as Dev User
          </button>
        )}
      </div>
    </section>
  );
}
