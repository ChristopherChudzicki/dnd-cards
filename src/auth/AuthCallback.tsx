import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "../api/supabase";
import { useSession } from "./useSession";

export function AuthCallback() {
  const navigate = useNavigate();
  const session = useSession();

  // Force the SDK to surface URL-fragment sessions even for browsers that
  // race the listener. Most flows don't need it; it costs nothing.
  useEffect(() => {
    supabase.auth.getSession();
  }, []);

  useEffect(() => {
    if (session.status !== "authenticated") return;
    const next = new URLSearchParams(window.location.search).get("next") ?? "/";
    navigate({ to: next });
  }, [session.status, navigate]);

  return (
    <section style={{ textAlign: "center", padding: "4rem" }}>
      <p>Signing you in…</p>
    </section>
  );
}
