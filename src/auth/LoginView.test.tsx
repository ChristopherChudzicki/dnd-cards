import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { supabase } from "../api/supabase";
import { LoginView } from "./LoginView";

describe("LoginView", () => {
  it("calls signInWithOAuth with google when the Google button is clicked", async () => {
    const spy = vi
      .spyOn(supabase.auth, "signInWithOAuth")
      .mockResolvedValue({ data: { provider: "google", url: "https://x" }, error: null });
    render(<LoginView />);
    await userEvent.click(screen.getByRole("button", { name: /sign in with google/i }));
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "google", options: expect.any(Object) }),
    );
  });

  it("calls signInWithOAuth with github when the GitHub button is clicked", async () => {
    const spy = vi
      .spyOn(supabase.auth, "signInWithOAuth")
      .mockResolvedValue({ data: { provider: "github", url: "https://x" }, error: null });
    render(<LoginView />);
    await userEvent.click(screen.getByRole("button", { name: /sign in with github/i }));
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ provider: "github" }));
  });

  it("shows a dev sign-in button in dev mode that signs in as the dev user", async () => {
    vi.stubEnv("DEV", true);
    const signInSpy = vi
      .spyOn(supabase.auth, "signInWithPassword")
      .mockResolvedValue({ data: { session: null, user: null }, error: null } as never);
    render(<LoginView />);
    await userEvent.click(screen.getByRole("button", { name: /sign in as dev user/i }));
    expect(signInSpy).toHaveBeenCalledWith({ email: "dev@local", password: "devpass" });
    vi.unstubAllEnvs();
  });

  it("falls back to signUp if the dev user doesn't exist yet", async () => {
    vi.stubEnv("DEV", true);
    vi.spyOn(supabase.auth, "signInWithPassword").mockResolvedValue({
      data: { session: null, user: null },
      error: { message: "Invalid login credentials" } as never,
    } as never);
    const signUpSpy = vi
      .spyOn(supabase.auth, "signUp")
      .mockResolvedValue({ data: { session: null, user: null }, error: null } as never);
    render(<LoginView />);
    await userEvent.click(screen.getByRole("button", { name: /sign in as dev user/i }));
    expect(signUpSpy).toHaveBeenCalledWith({ email: "dev@local", password: "devpass" });
    vi.unstubAllEnvs();
  });

  it("does NOT show the dev sign-in button outside dev mode", () => {
    vi.stubEnv("DEV", false);
    render(<LoginView />);
    expect(screen.queryByRole("button", { name: /sign in as dev user/i })).not.toBeInTheDocument();
    vi.unstubAllEnvs();
  });
});
