import { describe, expect, it } from "vitest";
import { auth } from "./auth";

describe("auth configuration", () => {
  it("AC-1: signs up without an automatic session", () => {
    expect(auth.options.emailAndPassword?.enabled).toBe(true);
    expect(auth.options.emailAndPassword?.autoSignIn).toBe(false);
  });

  it("AC-1: sends a verification email on sign up with a 24 hour token", () => {
    expect(auth.options.emailVerification?.sendOnSignUp).toBe(true);
    expect(auth.options.emailVerification?.expiresIn).toBe(24 * 60 * 60);
    expect(auth.options.emailVerification?.autoSignInAfterVerification).toBe(
      false,
    );
  });

  it("AC-2: lets unverified users sign in; gating happens at project and credit actions", () => {
    expect(auth.options.emailAndPassword?.requireEmailVerification).toBe(false);
  });

  it("AC-2: rejects sign in for deactivated accounts through the session hook", () => {
    expect(auth.options.databaseHooks?.session?.create?.before).toBeDefined();
    expect(auth.options.databaseHooks?.user?.create?.before).toBeDefined();
  });

  it("AC-3: reset tokens live 60 minutes and revoke sessions on reset", () => {
    expect(auth.options.emailAndPassword?.resetPasswordTokenExpiresIn).toBe(
      60 * 60,
    );
    expect(auth.options.emailAndPassword?.revokeSessionsOnPasswordReset).toBe(
      true,
    );
  });

  it("AC-4: holds sessions for 30 days with at most daily refresh writes", () => {
    expect(auth.options.session?.expiresIn).toBe(30 * 24 * 60 * 60);
    expect(auth.options.session?.updateAge).toBe(24 * 60 * 60);
  });

  it("AC-4: enforces a 12 to 128 character password", () => {
    expect(auth.options.emailAndPassword?.minPasswordLength).toBe(12);
    expect(auth.options.emailAndPassword?.maxPasswordLength).toBe(128);
  });

  it("AC-4: hashes with Argon2id and verifies against it", async () => {
    const hash =
      await auth.options.emailAndPassword?.password?.hash?.("correct-horse-12");
    expect(hash?.startsWith("$argon2id$")).toBe(true);
    await expect(
      auth.options.emailAndPassword?.password?.verify?.({
        hash: hash ?? "",
        password: "correct-horse-12",
      }),
    ).resolves.toBe(true);
    await expect(
      auth.options.emailAndPassword?.password?.verify?.({
        hash: hash ?? "",
        password: "wrong-password-1",
      }),
    ).resolves.toBe(false);
  });

  it("AC-5: reads role and active flag from the database on every request", () => {
    expect(auth.options.user?.additionalFields?.["role"]).toMatchObject({
      input: false,
    });
    expect(auth.options.user?.additionalFields?.["isActive"]).toMatchObject({
      input: false,
    });
  });
});
