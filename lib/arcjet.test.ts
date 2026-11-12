import { afterEach, describe, expect, it, vi } from "vitest";

const constructorCalls: Array<{ key: string; rules: unknown[] }> = [];
const protectCalls: Array<{ props: unknown }> = [];
let nextDecision: { denied: boolean; errored: boolean } = {
  denied: false,
  errored: false,
};

vi.mock("@arcjet/next", () => {
  const rule = (options: unknown) => [options];
  return {
    default: vi.fn((options: { key: string; rules: unknown[] }) => {
      constructorCalls.push(options);
      return {
        protect: vi.fn(async (_req: unknown, props?: unknown) => {
          protectCalls.push({ props });
          return {
            isDenied: () => nextDecision.denied,
            isErrored: () => nextDecision.errored,
          };
        }),
      };
    }),
    tokenBucket: vi.fn(rule),
    fixedWindow: vi.fn(rule),
  };
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  constructorCalls.length = 0;
  protectCalls.length = 0;
  nextDecision = { denied: false, errored: false };
  vi.restoreAllMocks();
});

async function loadArcjet() {
  return import("./arcjet");
}

describe("checkAuthRateLimit without a key", () => {
  it("AC-6: lets every request through when no key is configured", async () => {
    vi.stubEnv("ARCJET_KEY", "");
    const { checkAuthRateLimit } = await loadArcjet();

    await expect(
      checkAuthRateLimit(new Request("http://x/sign-in"), "sign-in", "a@b.c"),
    ).resolves.toBe(true);
    await expect(
      checkAuthRateLimit(new Request("http://x/sign-up"), "sign-up"),
    ).resolves.toBe(true);
    await expect(
      checkAuthRateLimit(
        new Request("http://x/reset"),
        "password-reset",
        "a@b.c",
      ),
    ).resolves.toBe(true);
    await expect(
      checkAuthRateLimit(
        new Request("http://x/resend"),
        "resend-verification",
        "a@b.c",
      ),
    ).resolves.toBe(true);
    expect(constructorCalls).toHaveLength(0);
  });
});

describe("checkAuthRateLimit with a key", () => {
  it("AC-6: keys email scoped limits on accountEmail, never on the reserved email name", async () => {
    vi.stubEnv("ARCJET_KEY", "test-key");
    vi.stubEnv("NODE_ENV", "test");
    await loadArcjet();

    const serialized = JSON.stringify(constructorCalls);
    expect(serialized).toContain("accountEmail");
    expect(serialized).not.toContain('"email"');
  });

  it("AC-6: passes the address as accountEmail so decisions can run", async () => {
    vi.stubEnv("ARCJET_KEY", "test-key");
    const { checkAuthRateLimit } = await loadArcjet();

    await checkAuthRateLimit(
      new Request("http://x/sign-in"),
      "sign-in",
      "a@b.c",
    );

    expect(protectCalls).toHaveLength(1);
    expect(protectCalls[0]?.props).toMatchObject({ accountEmail: "a@b.c" });
  });

  it("AC-6: denies when the limiter says so", async () => {
    vi.stubEnv("ARCJET_KEY", "test-key");
    nextDecision = { denied: true, errored: false };
    const { checkAuthRateLimit } = await loadArcjet();

    await expect(
      checkAuthRateLimit(new Request("http://x/sign-in"), "sign-in", "a@b.c"),
    ).resolves.toBe(false);
  });

  it("AC-6: fails open when the decision errors", async () => {
    vi.stubEnv("ARCJET_KEY", "test-key");
    nextDecision = { denied: false, errored: true };
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { checkAuthRateLimit } = await loadArcjet();

    await expect(
      checkAuthRateLimit(new Request("http://x/sign-in"), "sign-in", "a@b.c"),
    ).resolves.toBe(true);
    expect(warn).toHaveBeenCalled();
  });

  it("AC-2: skips the sign in check when no address was parsed", async () => {
    vi.stubEnv("ARCJET_KEY", "test-key");
    const { checkAuthRateLimit } = await loadArcjet();

    await expect(
      checkAuthRateLimit(new Request("http://x/sign-in"), "sign-in"),
    ).resolves.toBe(true);
    expect(protectCalls).toHaveLength(0);
  });
});
