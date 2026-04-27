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

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setState(
        data.session
          ? { status: "authenticated", user: data.session.user, session: data.session }
          : { status: "unauthenticated", user: null, session: null },
      );
    });

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
