import { describe, expect, it } from "vitest";
import { supabase } from "../api/supabase";
import { signInTestUser, signOutTestUser } from "./signInTestUser";

describe("signInTestUser", () => {
  it("establishes a session that getSession() returns", async () => {
    const user = await signInTestUser();
    const { data } = await supabase.auth.getSession();
    expect(data.session?.user?.id).toBe(user.id);
  });

  it("signOutTestUser clears the session", async () => {
    await signInTestUser();
    await signOutTestUser();
    const { data } = await supabase.auth.getSession();
    expect(data.session).toBeNull();
  });
});
