import { useNavigate } from "@tanstack/react-router";
import { supabase } from "../api/supabase";
import { OAuthButton } from "../lib/ui/OAuthButton";
import styles from "./LoginView.module.css";

const DEV_EMAIL = "dev@local";
const DEV_PASSWORD = "devpass";

export function LoginView() {
  const navigate = useNavigate();

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
    // OAuth providers route back through /auth/callback which navigates;
    // dev sign-in is direct, so navigate manually.
    const next = new URLSearchParams(window.location.search).get("next") ?? "/";
    navigate({ to: next });
  };

  return (
    <section className={styles.login} aria-labelledby="signin-heading">
      <h1 id="signin-heading">Sign in</h1>
      <p className={styles.copy}>
        Sign in to create and edit decks. Anyone can view shared decks via link.
      </p>
      {/* biome-ignore lint/a11y/noRedundantRoles: required because list-style:none strips the implicit list role in WebKit */}
      <ul className={styles.providers} role="list">
        {import.meta.env.VITE_AUTH_GOOGLE_ENABLED === "true" && (
          <li>
            <OAuthButton provider="google" onPress={() => signIn("google")} />
          </li>
        )}
        {import.meta.env.VITE_AUTH_GITHUB_ENABLED === "true" && (
          <li>
            <OAuthButton provider="github" onPress={() => signIn("github")} />
          </li>
        )}
        {import.meta.env.DEV && (
          <li>
            <OAuthButton provider="dev" onPress={() => void devSignIn()} />
          </li>
        )}
      </ul>
    </section>
  );
}
