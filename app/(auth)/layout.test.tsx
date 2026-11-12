import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@/components/theme-provider";

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

vi.mock("next/image", () => ({
  default: ({ src, alt, ...rest }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={typeof src === "string" ? src : ""} alt={alt} {...rest} />
  ),
}));

import AuthLayout from "./layout";

describe("AuthLayout", () => {
  it("frames the form with brand, navigation home, and theme control", () => {
    render(
      <ThemeProvider attribute="class">
        <AuthLayout>
          <p>Form goes here</p>
        </AuthLayout>
      </ThemeProvider>,
    );

    expect(screen.getByRole("link", { name: /cevo home/i })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("link", { name: /back home/i })).toHaveAttribute(
      "href",
      "/",
    );
    expect(
      screen.getByRole("button", { name: /toggle theme/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Form goes here")).toBeInTheDocument();
    expect(
      screen.getByText(/guided from idea to submission/i),
    ).toBeInTheDocument();
  });
});
