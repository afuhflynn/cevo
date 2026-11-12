import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const fns = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  signInEmail: vi.fn(),
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
  useRouter: () => ({ push: fns.push, refresh: fns.refresh }),
}));

vi.mock("@/lib/auth-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth-client")>();
  return { ...actual, authClient: { signIn: { email: fns.signInEmail } } };
});

import { SignInForm } from "./sign-in-form";

beforeEach(() => {
  vi.clearAllMocks();
  fns.signInEmail.mockResolvedValue({ error: null });
});

async function fillAndSubmit(email: string, password: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/email/i), email);
  await user.type(screen.getByLabelText(/^password/i), password);
  await user.click(screen.getByRole("button", { name: "Sign in" }));
  return user;
}

describe("SignInForm", () => {
  it("AC-2: labels every field and links password recovery", () => {
    render(<SignInForm />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /forgot password/i }),
    ).toHaveAttribute("href", "/forgot-password");
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
  });

  it("AC-2: signs in with trimmed credentials and leaves on success", async () => {
    render(<SignInForm />);
    await fillAndSubmit("  Student@Example.com  ", "correct-horse-12");

    expect(fns.signInEmail).toHaveBeenCalledWith({
      email: "Student@Example.com",
      password: "correct-horse-12",
    });
    expect(fns.push).toHaveBeenCalledWith("/");
    expect(fns.refresh).toHaveBeenCalled();
  });

  it("AC-2: explains bad credentials without leaking anything", async () => {
    fns.signInEmail.mockResolvedValueOnce({
      error: { code: "INVALID_EMAIL_OR_PASSWORD" },
    });
    render(<SignInForm />);
    await fillAndSubmit("a@b.c", "wrong-password-1");

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/incorrect email or password/i);
    expect(fns.push).not.toHaveBeenCalled();
  });

  it("AC-2: ties the error message to the fields for assistive tech", async () => {
    fns.signInEmail.mockResolvedValueOnce({
      error: { code: "INVALID_EMAIL_OR_PASSWORD" },
    });
    render(<SignInForm />);
    await fillAndSubmit("a@b.c", "wrong-password-1");

    await screen.findByRole("alert");
    const email = screen.getByLabelText(/email/i);
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveAttribute("aria-describedby", "sign-in-error");
    expect(document.getElementById("sign-in-error")).toHaveTextContent(
      /incorrect email or password/i,
    );
  });

  it("AC-6: surfaces rate limiting with a retry message", async () => {
    fns.signInEmail.mockResolvedValueOnce({ error: { code: "RATE_LIMITED" } });
    render(<SignInForm />);
    await fillAndSubmit("a@b.c", "x");

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText(/too many attempts/i)).toBeInTheDocument();
  });

  it("AC-2: shows the account message when the server nests the envelope", async () => {
    fns.signInEmail.mockResolvedValueOnce({
      error: {
        success: false,
        error: {
          code: "ACCOUNT_INACTIVE",
          message: "This account has been deactivated. Contact support.",
        },
        status: 403,
        statusText: "Forbidden",
      },
    });
    render(<SignInForm />);
    await fillAndSubmit("a@b.c", "correct-horse-12");

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText(/deactivated/i)).toBeInTheDocument();
  });

  it("AC-6: shows the retry message when the rate limit envelope is nested", async () => {
    fns.signInEmail.mockResolvedValueOnce({
      error: {
        success: false,
        error: {
          code: "RATE_LIMITED",
          message: "Too many attempts. Wait a moment, then try again.",
        },
        status: 429,
        statusText: "Too Many Requests",
      },
    });
    render(<SignInForm />);
    await fillAndSubmit("a@b.c", "x");

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText(/too many attempts/i)).toBeInTheDocument();
  });

  it("moves focus through the form in order with the keyboard", async () => {
    const user = userEvent.setup();
    render(<SignInForm />);

    await user.tab();
    expect(screen.getByLabelText(/email/i)).toHaveFocus();
    await user.tab();
    expect(
      screen.getByRole("link", { name: /forgot password/i }),
    ).toHaveFocus();
    await user.tab();
    expect(screen.getByLabelText(/^password/i)).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Sign in" })).toHaveFocus();
  });
});
