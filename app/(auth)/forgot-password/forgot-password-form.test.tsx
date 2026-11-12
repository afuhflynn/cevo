import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fns = vi.hoisted(() => ({
  requestPasswordReset: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/auth-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-client")>();
  return {
    ...actual,
    authClient: { requestPasswordReset: fns.requestPasswordReset },
  };
});

import { ForgotPasswordForm } from "./forgot-password-form";

beforeEach(() => {
  vi.clearAllMocks();
  fns.requestPasswordReset.mockResolvedValue({ error: null });
});

describe("ForgotPasswordForm", () => {
  it("AC-3: sends the reset link and always shows the same confirmation", async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);
    await user.type(screen.getByLabelText(/email/i), "  student@example.com  ");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    expect(fns.requestPasswordReset).toHaveBeenCalledWith({
      email: "student@example.com",
      redirectTo: "/reset-password",
    });
    expect(await screen.findByText(/check your inbox/i)).toBeInTheDocument();
    expect(screen.getByText(/if an account exists/i)).toBeInTheDocument();
  });

  it("AC-3: surfaces rate limiting without changing the flow", async () => {
    const user = userEvent.setup();
    fns.requestPasswordReset.mockResolvedValueOnce({
      error: { code: "RATE_LIMITED" },
    });
    render(<ForgotPasswordForm />);
    await user.type(screen.getByLabelText(/email/i), "a@b.c");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    expect(await screen.findByText(/too many attempts/i)).toBeInTheDocument();
  });
});
