import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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

import { SignInNotice } from "./sign-in-notice";

describe("SignInNotice", () => {
  it("AC-1: confirms a fresh verification", () => {
    render(<SignInNotice verified="1" error={null} />);
    expect(screen.getByText(/email verified/i)).toBeInTheDocument();
  });

  it("AC-2: asks unverified users to check their inbox first", () => {
    render(<SignInNotice verified={null} error="verification-required" />);
    expect(screen.getByText(/verify your email first/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /create an account/i }),
    ).toHaveAttribute("href", "/sign-up");
  });

  it("stays out of the way otherwise", () => {
    const view = render(<SignInNotice verified={null} error={null} />);
    expect(view.container).toBeEmptyDOMElement();
  });
});
