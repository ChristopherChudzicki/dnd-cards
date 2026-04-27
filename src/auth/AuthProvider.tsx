import { type ReactNode, useEffect, useState } from "react";
import { supabase } from "../api/supabase";
import { SessionContext, type SessionState } from "./useSession";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({
    status: "loading",
    user: null,
    session: null,
  });

  useEffect(() => {
    let cancelled = false;
    // onAuthStateChange synthesizes an INITIAL_SESSION event on subscribe,
    // so we don't need a separate getSession() call — the listener seeds
    // initial state and tracks changes uniformly. (This matches the pattern
    // Supabase recommends for React contexts.)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      setState(
        session
          ? { status: "authenticated", user: session.user, session }
          : { status: "unauthenticated", user: null, session: null },
      );
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return <SessionContext.Provider value={state}>{children}</SessionContext.Provider>;
}
