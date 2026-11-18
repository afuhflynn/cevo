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

vi.mock("next/image", () => ({
  default: ({ src, alt, ...rest }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={typeof src === "string" ? src : ""} alt={alt} {...rest} />
  ),
}));

import AuthLayout from "./layout";

describe("AuthLayout", () => {
  it("frames the form with brand in a centered layout", () => {
    render(
      <AuthLayout>
        <p>Form goes here</p>
      </AuthLayout>,
    );

    expect(screen.getByRole("link", { name: /cevo home/i })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByText("Form goes here")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /toggle theme/i }),
    ).not.toBeInTheDocument();
  });
});
