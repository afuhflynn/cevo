import { createLoader, parseAsString } from "nuqs/server";
import { describe, expect, it } from "vitest";
import {
  loadResetPasswordSearchParams,
  loadSignInSearchParams,
  paginationSearchParams,
  textSearchParam,
} from "./search-params";

describe("sign in search params", () => {
  it("AC-1: passes verified and error flags through", async () => {
    const parsed = await loadSignInSearchParams({
      verified: "1",
      error: undefined,
    });
    expect(parsed.verified).toBe("1");
    expect(parsed.error).toBeNull();
  });

  it("AC-1: reports verification required when flagged", async () => {
    const parsed = await loadSignInSearchParams({
      error: "verification-required",
    });
    expect(parsed.error).toBe("verification-required");
    expect(parsed.verified).toBeNull();
  });

  it("ignores unknown query keys", async () => {
    const parsed = await loadSignInSearchParams({
      verified: "1",
      next: "/admin",
    } as Record<string, string>);
    expect(parsed).toEqual({ verified: "1", error: null });
  });
});

describe("reset password search params", () => {
  it("AC-3: passes the reset token through", async () => {
    const parsed = await loadResetPasswordSearchParams({
      token: "tok_123",
    });
    expect(parsed.token).toBe("tok_123");
    expect(parsed.error).toBeNull();
  });

  it("AC-3: surfaces the expired flag the page turns into its expired state", async () => {
    const parsed = await loadResetPasswordSearchParams({ error: "expired" });
    expect(parsed.token).toBeNull();
    expect(parsed.error).toBe("expired");
  });
});

describe("shared list building blocks", () => {
  it("documents the pagination and filter contract future lists spread", async () => {
    const loadListParams = createLoader({
      ...paginationSearchParams,
      ...textSearchParam,
      status: parseAsString,
    });
    const parsed = await loadListParams({ status: "DRAFT" });
    expect(parsed).toEqual({
      page: 1,
      limit: 20,
      search: "",
      status: "DRAFT",
    });
  });

  it("accepts explicit page, limit, and search values", async () => {
    const loadListParams = createLoader({
      ...paginationSearchParams,
      ...textSearchParam,
    });
    const parsed = await loadListParams({
      page: "3",
      limit: "50",
      search: "cocoa",
    });
    expect(parsed).toEqual({ page: 3, limit: 50, search: "cocoa" });
  });
});
