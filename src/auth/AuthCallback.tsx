import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useSession } from "./useSession";

export function AuthCallback() {
  const navigate = useNavigate();
  const session = useSession();

  useEffect(() => {
    if (session.status !== "authenticated") return;
    const next = new URLSearchParams(window.location.search).get("next") ?? "/";
    navigate({ to: next });
  }, [session.status, navigate]);

  // AuthProvider handles the URL-based session detection via
  // onAuthStateChange (which the supabase client fires on its own
  // when detectSessionInUrl is true, the SDK default).

  return (
    <section style={{ textAlign: "center", padding: "4rem" }}>
      <p>Signing you in…</p>
    </section>
  );
}
