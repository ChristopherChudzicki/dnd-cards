import type { Session, User } from "@supabase/supabase-js";
import { createContext, useContext } from "react";

export type SessionState =
  | { status: "loading"; user: null; session: null }
  | { status: "unauthenticated"; user: null; session: null }
  | { status: "authenticated"; user: User; session: Session };

export const SessionContext = createContext<SessionState>({
  status: "loading",
  user: null,
  session: null,
});

export function useSession() {
  return useContext(SessionContext);
}
