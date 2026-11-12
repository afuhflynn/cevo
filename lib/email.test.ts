import { afterEach, describe, expect, it, vi } from "vitest";
import {
  resetPasswordEmailHtml,
  sendAuthEmail,
  verificationEmailHtml,
} from "./email";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("verificationEmailHtml", () => {
  it("AC-1: embeds the verification link the user must click", () => {
    const url = "http://localhost:3000/api/auth/verify-email?token=abc";
    const html = verificationEmailHtml(url);
    expect(html).toContain(url);
    expect(html).toContain("24 hours");
  });
});

describe("resetPasswordEmailHtml", () => {
  it("AC-3: embeds the reset link and its lifetime", () => {
    const url = "http://localhost:3000/api/auth/reset-password/xyz";
    const html = resetPasswordEmailHtml(url);
    expect(html).toContain(url);
    expect(html).toContain("60 minutes");
  });
});

describe("sendAuthEmail", () => {
  it("AC-1: without SMTP config it logs the link through the dev fallback instead of sending", async () => {
    vi.stubEnv("SMTP_HOST", "");
    vi.stubEnv("SMTP_PORT", "");
    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    await sendAuthEmail({
      to: "student@example.com",
      subject: "Verify your Cevo email",
      html: verificationEmailHtml("http://localhost:3000/verify?t=abc"),
    });

    expect(info).toHaveBeenCalledOnce();
    expect(info.mock.calls[0]?.[0]).toContain("student@example.com");
    expect(info.mock.calls[0]?.[0]).toContain(
      "http://localhost:3000/verify?t=abc",
    );
  });
});
