import { beforeEach, describe, expect, it, vi } from "vitest";

const rateLimitVerdicts = new Map<string, boolean>();
let userLookup: Record<string, unknown> | null = null;
let verificationLookup: Record<string, unknown> | null = null;
const baseCalls: string[] = [];

vi.mock("@/lib/arcjet", () => ({
  checkAuthRateLimit: vi.fn(
    async (_req: unknown, kind: string, _email?: string) =>
      rateLimitVerdicts.get(kind) ?? true,
  ),
}));

vi.mock("@/lib/auth", () => ({ auth: { handler: {} } }));

vi.mock("@/lib/prisma", () => ({
  db: {
    orm: {
      public: {
        User: {
          where: vi.fn((_filter: unknown) => ({
            first: vi.fn(async () => userLookup),
          })),
        },
        Verification: {
          where: vi.fn((_filter: unknown) => ({
            first: vi.fn(async () => verificationLookup),
          })),
        },
      },
    },
  },
}));

vi.mock("better-auth/next-js", () => ({
  toNextJsHandler: vi.fn(() => ({
    GET: vi.fn(async () => new Response("base-get")),
    POST: vi.fn(async (req: Request) => {
      baseCalls.push(req.url);
      return new Response("base-post");
    }),
  })),
}));

import { GET, POST } from "./[...all]/route";

const json = (value: unknown) =>
  new Request("http://localhost:3000/api/auth/x", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(value),
  });

beforeEach(() => {
  rateLimitVerdicts.clear();
  userLookup = null;
  verificationLookup = null;
  baseCalls.length = 0;
  vi.clearAllMocks();
});

describe("rate limiting", () => {
  it("AC-6: answers 429 with the RATE_LIMITED code when Arcjet denies", async () => {
    rateLimitVerdicts.set("sign-in", false);
    const res = await POST(
      new Request("http://localhost:3000/api/auth/sign-in/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "a@b.c", password: "x" }),
      }),
    );
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({
      success: false,
      error: {
        code: "RATE_LIMITED",
        message: expect.any(String),
      },
    });
    expect(baseCalls).toHaveLength(0);
  });

  it("AC-6: hands allowed requests to the Better Auth handler", async () => {
    const res = await POST(
      new Request("http://localhost:3000/api/auth/sign-in/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "a@b.c", password: "x" }),
      }),
    );
    expect(res.status).toBe(200);
    expect(baseCalls).toHaveLength(1);
  });
});

describe("inactive accounts", () => {
  it("AC-2: answers 403 with ACCOUNT_INACTIVE and leaks no credentials", async () => {
    userLookup = { id: "u1", email: "a@b.c", isActive: false };
    const res = await POST(
      new Request("http://localhost:3000/api/auth/sign-in/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "a@b.c", password: "secret-pw" }),
      }),
    );
    expect(res.status).toBe(403);
    const body = (await res.json()) as Record<string, any>;
    expect(body.error.code).toBe("ACCOUNT_INACTIVE");
    expect(JSON.stringify(body)).not.toContain("secret-pw");
    expect(baseCalls).toHaveLength(0);
  });

  it("AC-2: lets active users and unknown addresses through to the handler", async () => {
    userLookup = { id: "u1", email: "a@b.c", isActive: true };
    await POST(json({ email: "a@b.c", password: "x" }));
    userLookup = null;
    await POST(json({ email: "ghost@b.c", password: "x" }));
    expect(baseCalls).toHaveLength(2);
  });

  it("delegates when the body is not JSON", async () => {
    const res = await POST(
      new Request("http://localhost:3000/api/auth/sign-up/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "not-json{{{",
      }),
    );
    expect(res.status).toBe(200);
    expect(baseCalls).toHaveLength(1);
  });
});

describe("expired reset tokens", () => {
  const resetUrl = "http://localhost:3000/api/auth/reset-password";

  it("AC-3: answers 410 with TOKEN_EXPIRED and changes nothing", async () => {
    verificationLookup = {
      id: "v1",
      identifier: "reset-password:tok",
      expiresAt: new Date("2020-01-01"),
    };
    const res = await POST(
      new Request(resetUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: "tok", newPassword: "new-horse-99" }),
      }),
    );
    expect(res.status).toBe(410);
    const body = (await res.json()) as Record<string, any>;
    expect(body).toEqual({
      success: false,
      error: { code: "TOKEN_EXPIRED", message: expect.any(String) },
    });
    expect(JSON.stringify(body)).not.toContain("tok");
    expect(baseCalls).toHaveLength(0);
  });

  it("AC-3: hands live and unknown tokens to the handler", async () => {
    verificationLookup = {
      id: "v1",
      identifier: "reset-password:tok",
      expiresAt: new Date("2999-01-01"),
    };
    const withToken = (token: string) =>
      new Request(resetUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, newPassword: "new-horse-99" }),
      });
    await POST(withToken("tok"));
    verificationLookup = null;
    await POST(withToken("nope"));
    expect(baseCalls).toHaveLength(2);
  });
});

describe("verify email hardening", () => {
  it("AC-4: marks verify responses no-referrer and no-store", async () => {
    const res = await GET(
      new Request("http://localhost:3000/api/auth/verify-email?token=t"),
    );
    expect(res.headers.get("Referrer-Policy")).toBe("no-referrer");
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("leaves other GET responses alone", async () => {
    const res = await GET(
      new Request("http://localhost:3000/api/auth/get-session"),
    );
    expect(res.headers.get("Referrer-Policy")).toBeNull();
  });
});
