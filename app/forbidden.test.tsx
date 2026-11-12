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

import Forbidden from "./forbidden";

describe("Forbidden", () => {
  it("AC-5: explains the denial and offers a way out", () => {
    render(<Forbidden />);
    expect(screen.getByText("Access denied")).toBeInTheDocument();
    expect(screen.getByText(/logged/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /go home/i })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("link", { name: /sign in/i })).toHaveAttribute(
      "href",
      "/sign-in",
    );
  });
});
