import { describe, expect, it } from "vitest";
import { authClient, toAuthErrorDetails } from "./auth-client";

describe("auth client", () => {
  it("exposes the email auth surface the pages bind to", () => {
    expect(typeof authClient.signUp.email).toBe("function");
    expect(typeof authClient.signIn.email).toBe("function");
    expect(typeof authClient.sendVerificationEmail).toBe("function");
    expect(typeof authClient.requestPasswordReset).toBe("function");
    expect(typeof authClient.resetPassword).toBe("function");
    expect(typeof authClient.signOut).toBe("function");
  });
});

describe("toAuthErrorDetails", () => {
  it("reads native flat library errors as they are", () => {
    expect(
      toAuthErrorDetails({ code: "INVALID_EMAIL_OR_PASSWORD", message: "No" }),
    ).toEqual({ code: "INVALID_EMAIL_OR_PASSWORD", message: "No", status: undefined });
  });

  it("reads project envelope errors out of the nested client shape", () => {
    expect(
      toAuthErrorDetails({
        success: false,
        error: { code: "RATE_LIMITED", message: "Slow down" },
        status: 429,
        statusText: "Too Many Requests",
      }),
    ).toEqual({ code: "RATE_LIMITED", message: "Slow down", status: 429 });
  });

  it("returns empty details for junk", () => {
    expect(toAuthErrorDetails(null)).toEqual({});
    expect(toAuthErrorDetails("boom")).toEqual({});
    expect(toAuthErrorDetails({})).toEqual({
      code: undefined,
      message: undefined,
      status: undefined,
    });
  });
});
