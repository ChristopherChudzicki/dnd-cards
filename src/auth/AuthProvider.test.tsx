import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { supabase } from "../api/supabase";
import { AuthProvider } from "./AuthProvider";
import { useSession } from "./useSession";

function ShowSession() {
  const { user, status } = useSession();
  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="user-id">{user?.id ?? "anon"}</span>
    </div>
  );
}

describe("AuthProvider", () => {
  beforeEach(async () => {
    await supabase.auth.signOut();
  });

  it("starts in 'loading' and resolves to 'unauthenticated' when no session", async () => {
    render(
      <AuthProvider>
        <ShowSession />
      </AuthProvider>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("unauthenticated");
    });
    expect(screen.getByTestId("user-id").textContent).toBe("anon");
  });
});
