import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  headerStore: new Map<string, string>(),
  auditRows: [] as Array<Record<string, unknown>>,
  sessionUser: null as { id: string } | null,
  userRow: null as Record<string, unknown> | null,
  redirectedTo: null as string | null,
  forbiddenCalled: false,
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => ({
    get: (name: string) => mocks.headerStore.get(name.toLowerCase()) ?? null,
  })),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    mocks.redirectedTo = url;
    throw new Error(`REDIRECT:${url}`);
  }),
  forbidden: vi.fn(() => {
    mocks.forbiddenCalled = true;
    throw new Error("FORBIDDEN");
  }),
}));

vi.mock("./auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(async () =>
        mocks.sessionUser ? { user: mocks.sessionUser } : null,
      ),
    },
  },
}));

vi.mock("./prisma", () => ({
  db: {
    orm: {
      public: {
        User: {
          where: vi.fn((_filter: unknown) => ({
            first: vi.fn(async () => mocks.userRow),
          })),
        },
        AuditEvent: {
          create: vi.fn(async (data: Record<string, unknown>) => {
            mocks.auditRows.push(data);
            return data;
          }),
        },
      },
    },
  },
}));

import {
  getAdminUser,
  getCurrentUser,
  requireAdmin,
  requireUser,
  requireVerifiedEmail,
} from "./auth-helpers";

const activeStudent = {
  id: "u1",
  email: "student@example.com",
  name: "Student",
  emailVerified: true,
  role: "STUDENT",
  isActive: true,
};

beforeEach(() => {
  mocks.sessionUser = null;
  mocks.userRow = null;
  mocks.auditRows.length = 0;
  mocks.redirectedTo = null;
  mocks.forbiddenCalled = false;
  mocks.headerStore.clear();
});

describe("getCurrentUser", () => {
  it("returns null with no session", async () => {
    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("returns null for a deactivated account", async () => {
    mocks.sessionUser = { id: "u1" };
    mocks.userRow = { ...activeStudent, isActive: false };
    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("returns the user for an active session", async () => {
    mocks.sessionUser = { id: "u1" };
    mocks.userRow = { ...activeStudent };
    await expect(getCurrentUser()).resolves.toMatchObject({
      id: "u1",
      role: "STUDENT",
    });
  });
});

describe("requireUser", () => {
  it("sends anonymous visitors to sign in", async () => {
    await expect(requireUser()).rejects.toThrow("REDIRECT:/sign-in");
    expect(mocks.redirectedTo).toBe("/sign-in");
  });
});

describe("requireVerifiedEmail", () => {
  it("AC-2: sends unverified users back to sign in with a reason", async () => {
    mocks.sessionUser = { id: "u1" };
    mocks.userRow = { ...activeStudent, emailVerified: false };
    await expect(requireVerifiedEmail()).rejects.toThrow(
      "REDIRECT:/sign-in?error=verification-required",
    );
  });

  it("AC-2: lets verified users through", async () => {
    mocks.sessionUser = { id: "u1" };
    mocks.userRow = { ...activeStudent };
    await expect(requireVerifiedEmail()).resolves.toMatchObject({
      id: "u1",
    });
  });
});

describe("requireAdmin", () => {
  it("AC-5: lets an admin through when the database says so", async () => {
    mocks.sessionUser = { id: "u1" };
    mocks.userRow = { ...activeStudent, role: "ADMIN" };
    await expect(requireAdmin("/admin", "GET")).resolves.toMatchObject({
      role: "ADMIN",
    });
    expect(mocks.forbiddenCalled).toBe(false);
  });

  it("AC-5: denies a student, logs the attempt, and renders forbidden", async () => {
    mocks.sessionUser = { id: "u1" };
    mocks.userRow = { ...activeStudent };
    await expect(requireAdmin("/admin/users", "GET")).rejects.toThrow(
      "FORBIDDEN",
    );
    expect(mocks.forbiddenCalled).toBe(true);
    expect(mocks.auditRows).toHaveLength(1);
    expect(mocks.auditRows[0]).toMatchObject({
      action: "ADMIN_ACCESS_DENIED",
      targetType: "ROUTE",
      targetId: "/admin/users",
      userId: "u1",
      details: { method: "GET", role: "STUDENT", reason: "role-not-admin" },
    });
  });

  it("AC-5: denies anonymous visitors and logs them without a user id", async () => {
    await expect(requireAdmin("/admin", "GET")).rejects.toThrow("FORBIDDEN");
    expect(mocks.auditRows[0]).toMatchObject({
      action: "ADMIN_ACCESS_DENIED",
      userId: null,
      details: { method: "GET", role: null, reason: "no-session" },
    });
  });
});

describe("getAdminUser", () => {
  it("returns null for a student instead of throwing", async () => {
    mocks.sessionUser = { id: "u1" };
    mocks.userRow = { ...activeStudent };
    await expect(getAdminUser("/admin", "GET")).resolves.toBeNull();
    expect(mocks.forbiddenCalled).toBe(false);
    expect(mocks.auditRows).toHaveLength(1);
  });
});
