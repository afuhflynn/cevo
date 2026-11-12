import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fns = vi.hoisted(() => ({
  push: vi.fn(),
  resetPassword: vi.fn(),
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

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: fns.push }),
}));

vi.mock("@/lib/auth-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-client")>();
  return { ...actual, authClient: { resetPassword: fns.resetPassword } };
});

import { ResetPasswordForm } from "./reset-password-form";

beforeEach(() => {
  vi.clearAllMocks();
  fns.resetPassword.mockResolvedValue({ error: null });
});

async function fillAndSubmit(password: string, confirm: string) {
  const user = userEvent.setup();
  const fields = screen.getAllByLabelText(/password/i);
  await user.type(fields[0]!, password);
  await user.type(fields[1]!, confirm);
  await user.click(screen.getByRole("button", { name: /update password/i }));
}

describe("ResetPasswordForm", () => {
  it("AC-3: shows the expired state with a way back when the link is dead", () => {
    render(<ResetPasswordForm token={null} expired />);
    expect(screen.getByText(/this link has expired/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /request a new reset link/i }),
    ).toHaveAttribute("href", "/forgot-password");
    expect(fns.resetPassword).not.toHaveBeenCalled();
  });

  it("AC-3: stops mismatched passwords before any request", async () => {
    render(<ResetPasswordForm token="tok" expired={false} />);
    await fillAndSubmit("correct-horse-12", "different-horse-34");

    expect(await screen.findByText(/do not match/i)).toBeInTheDocument();
    expect(fns.resetPassword).not.toHaveBeenCalled();
  });

  it("AC-3: sets the new password and confirms it", async () => {
    render(<ResetPasswordForm token="tok123" expired={false} />);
    await fillAndSubmit("new-horse-99", "new-horse-99");

    expect(fns.resetPassword).toHaveBeenCalledWith({
      newPassword: "new-horse-99",
      token: "tok123",
    });
    expect(await screen.findByText(/password updated/i)).toBeInTheDocument();
  });

  it("AC-3: sends expired or invalid tokens back to the expired state", async () => {
    fns.resetPassword.mockResolvedValueOnce({
      error: { code: "INVALID_TOKEN", message: "Invalid token" },
    });
    render(<ResetPasswordForm token="stale" expired={false} />);
    await fillAndSubmit("new-horse-99", "new-horse-99");

    expect(fns.push).toHaveBeenCalledWith("/reset-password?error=expired");
  });
});
