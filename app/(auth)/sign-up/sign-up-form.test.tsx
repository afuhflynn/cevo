import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fns = vi.hoisted(() => ({
  signUpEmail: vi.fn(),
  sendVerificationEmail: vi.fn(),
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
    authClient: {
      signUp: { email: fns.signUpEmail },
      sendVerificationEmail: fns.sendVerificationEmail,
    },
  };
});

import { SignUpForm } from "./sign-up-form";

beforeEach(() => {
  vi.clearAllMocks();
  fns.signUpEmail.mockResolvedValue({ error: null });
  fns.sendVerificationEmail.mockResolvedValue({});
});

async function fillAndSubmit(name: string, email: string, password: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/full name/i), name);
  await user.type(screen.getByLabelText(/email/i), email);
  await user.type(screen.getByLabelText(/^password/i), password);
  await user.click(screen.getByRole("button", { name: "Create account" }));
}

describe("SignUpForm", () => {
  it("AC-1: explains the password rule next to the field", () => {
    render(<SignUpForm />);
    expect(screen.getByText(/at least 12 characters/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toHaveAccessibleDescription(
      /at least 12 characters/i,
    );
  });

  it("AC-1: creates the account with trimmed values and asks for inbox check", async () => {
    render(<SignUpForm />);
    await fillAndSubmit("  Ada  ", "  Ada@Example.com  ", "correct-horse-12");

    expect(fns.signUpEmail).toHaveBeenCalledWith({
      name: "Ada",
      email: "Ada@Example.com",
      password: "correct-horse-12",
      callbackURL: "/sign-in?verified=1",
    });
    expect(await screen.findByText(/check your inbox/i)).toBeInTheDocument();
  });

  it("AC-1: offers a resend that targets the same address", async () => {
    const user = userEvent.setup();
    render(<SignUpForm />);
    await fillAndSubmit("Ada", "ada@example.com", "correct-horse-12");
    await screen.findByText(/check your inbox/i);

    await user.click(
      screen.getByRole("button", { name: /resend verification email/i }),
    );
    expect(fns.sendVerificationEmail).toHaveBeenCalledWith({
      email: "ada@example.com",
      callbackURL: "/sign-in?verified=1",
    });
    expect(
      await screen.findByText(/fresh verification link/i),
    ).toBeInTheDocument();
  });

  it("AC-1: shows failures without leaving the form", async () => {
    fns.signUpEmail.mockResolvedValueOnce({
      error: { code: "RATE_LIMITED" },
    });
    render(<SignUpForm />);
    await fillAndSubmit("Ada", "ada@example.com", "correct-horse-12");

    expect(await screen.findByText(/too many attempts/i)).toBeInTheDocument();
    expect(screen.queryByText(/check your inbox/i)).not.toBeInTheDocument();
  });
});
