import { supabase } from "../api/supabase";

export type TestUser = { id: string; email: string };

const DEFAULT_USER: TestUser = {
  id: "11111111-1111-1111-1111-111111111111",
  email: "alice@test.invalid",
};

function base64UrlEncode(input: string): string {
  return btoa(input).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

// Mints a JWT-shaped string with the supplied claims. Signature isn't validated
// by supabase-js — the SDK only decodes the payload — so a literal "fake" suffix
// is fine. The `exp` claim must be in the future, otherwise `setSession` routes
// through `_callRefreshToken` which would hit /auth/v1/token (we'd need another
// MSW handler).
function makeFakeJWT(claims: Record<string, unknown>): string {
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64UrlEncode(JSON.stringify(claims));
  return `${header}.${payload}.fake-signature`;
}

/**
 * Installs a fake authenticated session into the supabase-js client so
 * `useSession()` returns "authenticated" and RLS-aware code paths execute.
 *
 * Implementation note: supabase-js's `setSession` calls `_getUser(access_token)`
 * when the JWT's `exp` is in the future, which hits GET /auth/v1/user. The
 * baseline handler in msw.ts answers that endpoint with the default test user.
 * To impersonate a different user, register a per-test override before calling
 * this helper:
 *
 *   server.use(http.get(`${SB_URL}/auth/v1/user`, () => HttpResponse.json({...})));
 */
export async function signInTestUser(user: TestUser = DEFAULT_USER): Promise<TestUser> {
  const now = Math.floor(Date.now() / 1000);
  const accessToken = makeFakeJWT({
    sub: user.id,
    exp: now + 3600,
    iat: now,
    role: "authenticated",
    aud: "authenticated",
    email: user.email,
  });
  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: "fake-refresh-token",
  });
  if (error) throw error;
  return user;
}

export async function signOutTestUser(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
