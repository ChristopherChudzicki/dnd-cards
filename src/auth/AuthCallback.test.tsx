import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "../api/supabase";
import { signInTestUser } from "../test/signInTestUser";
import { AuthCallback } from "./AuthCallback";
import { AuthProvider } from "./AuthProvider";

const navigate = vi.fn();
vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof import("@tanstack/react-router")>("@tanstack/react-router");
  return { ...actual, useNavigate: () => navigate };
});

describe("AuthCallback", () => {
  beforeEach(async () => {
    await supabase.auth.signOut();
    navigate.mockClear();
  });

  it("renders a loading state while the SDK exchanges the code", () => {
    render(<AuthCallback />);
    expect(screen.getByText(/signing you in/i)).toBeInTheDocument();
  });

  it("navigates to ?next= once a session is present", async () => {
    Object.defineProperty(window, "location", {
      value: { ...window.location, search: "?next=%2Fdeck%2Fabc" },
      writable: true,
    });

    await signInTestUser();

    render(
      <AuthProvider>
        <AuthCallback />
      </AuthProvider>,
    );

    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: "/deck/abc" }), {
      timeout: 1500,
    });
  });
});
