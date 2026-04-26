import { supabase } from "../api/supabase";

const FAKE_JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMTExMTExMS0xMTExLTExMTEtMTExMS0xMTExMTExMTExMTEifQ.fake";

export type TestUser = { id: string; email: string };

export async function signInTestUser(
  user: TestUser = { id: "11111111-1111-1111-1111-111111111111", email: "alice@test" },
): Promise<TestUser> {
  await supabase.auth.setSession({
    access_token: FAKE_JWT,
    refresh_token: "fake-refresh",
  });
  return user;
}

export async function signOutTestUser(): Promise<void> {
  await supabase.auth.signOut();
}
