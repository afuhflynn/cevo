import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = Record<string, unknown>;

const fakes = vi.hoisted(() => {
  function sameValue(a: unknown, b: unknown): boolean {
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() === b.getTime();
    }
    return a === b;
  }

  function likeToRegExp(pattern: string, insensitive: boolean): RegExp {
    let out = "^";
    for (let i = 0; i < pattern.length; i++) {
      const char = pattern[i]!;
      if (char === "\\" && i + 1 < pattern.length) {
        out += escapeRegExp(pattern[++i]!);
      } else if (char === "%") {
        out += ".*";
      } else if (char === "_") {
        out += ".";
      } else {
        out += escapeRegExp(char);
      }
    }
    return new RegExp(`${out}$`, insensitive ? "i" : "");
  }

  function escapeRegExp(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function matches(row: Row, predicate: any): boolean {
    if ("and" in predicate) {
      return (predicate.and as unknown[]).every((p) => matches(row, p));
    }
    if ("or" in predicate) {
      return (predicate.or as unknown[]).some((p) => matches(row, p));
    }
    if ("not" in predicate) {
      return !matches(row, predicate.not);
    }
    const value = row[predicate.field];
    switch (predicate.op) {
      case "eq":
        return sameValue(value, predicate.value);
      case "ne":
        return !sameValue(value, predicate.value);
      case "lt":
        return (value as number) < (predicate.value as number);
      case "lte":
        return (value as number) <= (predicate.value as number);
      case "gt":
        return (value as number) > (predicate.value as number);
      case "gte":
        return (value as number) >= (predicate.value as number);
      case "in":
        return (predicate.value as unknown[]).some((v) => sameValue(value, v));
      case "not_in":
        return !(predicate.value as unknown[]).some((v) => sameValue(value, v));
      case "like":
        return likeToRegExp(predicate.value as string, false).test(
          String(value ?? ""),
        );
      case "ilike":
        return likeToRegExp(predicate.value as string, true).test(
          String(value ?? ""),
        );
      default:
        throw new Error(`unsupported op ${predicate.op as string}`);
    }
  }

  function fieldProxy(): any {
    return new Proxy(
      {},
      {
        get: (_target, field) => {
          if (typeof field !== "string") {
            return undefined;
          }
          const build = (op: string) => (value: unknown) => ({
            op,
            field,
            value,
          });
          return {
            eq: build("eq"),
            neq: build("ne"),
            lt: build("lt"),
            lte: build("lte"),
            gt: build("gt"),
            gte: build("gte"),
            in: build("in"),
            like: build("like"),
            ilike: build("ilike"),
          };
        },
      },
    );
  }

  interface CollectionState {
    rows: Row[];
    filters: unknown[];
    select?: string[];
    order?: { field: string; direction: "asc" | "desc" };
    limit?: number;
    offset?: number;
  }

  function project(row: Row, select?: string[]): Row {
    if (!select || select.length === 0) {
      return { ...row };
    }
    return Object.fromEntries(select.map((key) => [key, row[key]]));
  }

  function query(state: CollectionState): Row[] {
    let rows = state.rows.filter((row) =>
      state.filters.every((p) => matches(row, p)),
    );
    if (state.order) {
      const { field, direction } = state.order;
      rows = [...rows].sort((a, b) => {
        const left = a[field] as number | string;
        const right = b[field] as number | string;
        if (left === right) {
          return 0;
        }
        const order = left > right ? 1 : -1;
        return direction === "asc" ? order : -order;
      });
    }
    if (typeof state.offset === "number") {
      rows = rows.slice(state.offset);
    }
    if (typeof state.limit === "number") {
      rows = rows.slice(0, state.limit);
    }
    return rows;
  }

  function makeCollection(store: Row[]): any {
    const build = (state: CollectionState): any => ({
      where: (lambda: (row: any) => unknown) =>
        build({ ...state, filters: [...state.filters, lambda(fieldProxy())] }),
      select: (...fields: string[]) => build({ ...state, select: fields }),
      orderBy: (spec: { orderBy: [string, "asc" | "desc"] }) =>
        build({
          ...state,
          order: { field: spec.orderBy[0], direction: spec.orderBy[1] },
        }),
      limit: (n: number) => build({ ...state, limit: n }),
      offset: (n: number) => build({ ...state, offset: n }),
      first: async () => {
        const [row] = query(state);
        return row ? project(row, state.select) : null;
      },
      all: async () => query(state).map((row) => project(row, state.select)),
      aggregate: async (_spec: unknown) => ({ total: query(state).length }),
      create: async (data: Row) => {
        const row = { ...data };
        store.push(row);
        return { ...row };
      },
      update: async (data: Row) => {
        const [row] = query(state);
        if (!row) {
          return null;
        }
        Object.assign(row, data);
        return { ...row };
      },
      updateAll: async (data: Row) => {
        const rows = query(state);
        for (const row of rows) {
          Object.assign(row, data);
        }
        return rows.map((row) => ({ ...row }));
      },
      delete: async () => {
        const [row] = query(state);
        if (!row) {
          return null;
        }
        store.splice(store.indexOf(row), 1);
        return { ...row };
      },
      deleteAll: async () => {
        const rows = query(state);
        for (const row of rows) {
          store.splice(store.indexOf(row), 1);
        }
        return rows.map((row) => ({ ...row }));
      },
    });
    return build({ rows: store, filters: [] });
  }

  const stores: Record<string, Row[]> = {
    User: [],
    Session: [],
    Account: [],
    Verification: [],
  };

  function ormFor(store: Record<string, Row[]>): any {
    return {
      public: {
        User: makeCollection(store["User"]!),
        Session: makeCollection(store["Session"]!),
        Account: makeCollection(store["Account"]!),
        Verification: makeCollection(store["Verification"]!),
      },
    };
  }

  const fakeDb = {
    orm: ormFor(stores),
    transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({ orm: ormFor(stores) }),
  };

  return { fakeDb, stores };
});

vi.mock("./prisma", () => ({ db: fakes.fakeDb, contract: {} }));

vi.mock("@prisma/orm-postgres/orm-client", () => ({
  and: (...predicates: unknown[]) => ({ and: predicates }),
  or: (...predicates: unknown[]) => ({ or: predicates }),
  not: (predicate: unknown) => ({ not: predicate }),
  orderByField: (
    _collection: unknown,
    field: string,
    direction: "asc" | "desc",
  ) => ({ orderBy: [field, direction] }),
}));

import { prismaAdapter } from "./auth-adapter";

const adapter = prismaAdapter({} as never);
const joiningAdapter = prismaAdapter({
  advanced: { database: { joins: true } },
} as never);

const fullUser = (overrides: Row = {}): Row => ({
  id: "u1",
  name: "A",
  email: "a@b.c",
  emailVerified: true,
  image: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  ...overrides,
});

beforeEach(() => {
  for (const rows of Object.values(fakes.stores)) {
    rows.length = 0;
  }
});

function where(field: string, value: unknown, operator = "eq") {
  return [{ field, operator, value, connector: "AND" }] as never;
}

describe("model routing", () => {
  it("writes each canonical model to its own table", async () => {
    await adapter.create({
      model: "user",
      data: { id: "u1", email: "a@b.c" },
      forceAllowId: true,
    });
    await adapter.create({
      model: "session",
      data: { id: "s1", userId: "u1", token: "t" },
      forceAllowId: true,
    });
    await adapter.create({
      model: "account",
      data: { id: "a1", userId: "u1", providerId: "credential" },
      forceAllowId: true,
    });
    await adapter.create({
      model: "verification",
      data: { id: "v1", identifier: "x", value: "y" },
      forceAllowId: true,
    });

    expect(fakes.stores["User"]).toHaveLength(1);
    expect(fakes.stores["Session"]).toHaveLength(1);
    expect(fakes.stores["Account"]).toHaveLength(1);
    expect(fakes.stores["Verification"]).toHaveLength(1);
  });

  it("rejects unknown models instead of writing somewhere unexpected", async () => {
    await expect(
      adapter.create({
        model: "widget",
        data: { id: "w1" },
        forceAllowId: true,
      }),
    ).rejects.toThrow('Model "widget" not found in schema');
  });
});

describe("where operators", () => {
  it.each([
    ["eq", "a@b.c", 1],
    ["ne", "a@b.c", 1],
    ["in", ["a@b.c", "zzz"], 1],
    ["not_in", ["zzz"], 2],
    ["contains", "b.c", 1],
    ["starts_with", "a@", 1],
    ["ends_with", ".c", 1],
  ])("maps %s to the matching rows", async (operator, value, count) => {
    await adapter.create({
      model: "user",
      data: { id: "u1", email: "a@b.c" },
      forceAllowId: true,
    });
    await adapter.create({
      model: "user",
      data: { id: "u2", email: "d@e.f" },
      forceAllowId: true,
    });
    const rows = await adapter.findMany({
      model: "user",
      where: where("email", value, operator),
      limit: 10,
    });
    expect(rows).toHaveLength(count as number);
  });

  it("matches case insensitively when asked", async () => {
    await adapter.create({
      model: "user",
      data: { id: "u1", email: "Mixed@Example.com" },
    });
    const rows = await adapter.findMany({
      model: "user",
      where: [
        {
          field: "email",
          operator: "eq",
          value: "mixed@example.com",
          connector: "AND",
          mode: "insensitive",
        },
      ] as never,
      limit: 10,
    });
    expect(rows).toHaveLength(1);
  });

  it("folds several conditions with AND and OR", async () => {
    await adapter.create({
      model: "user",
      data: { id: "u1", email: "a@b.c" },
      forceAllowId: true,
    });
    await adapter.create({
      model: "user",
      data: { id: "u2", email: "d@e.f" },
      forceAllowId: true,
    });
    const rows = await adapter.findMany({
      model: "user",
      where: [
        {
          field: "email",
          operator: "ne",
          value: "nobody@x.io",
          connector: "AND",
        },
        { field: "email", operator: "eq", value: "a@b.c", connector: "OR" },
        { field: "email", operator: "eq", value: "d@e.f", connector: "OR" },
      ] as never,
      limit: 10,
    });
    expect(rows).toHaveLength(2);
  });

  it("supports ordering, paging, and projection", async () => {
    await adapter.create({
      model: "user",
      data: fullUser({ id: "u2", email: "b@b.c" }),
      forceAllowId: true,
    });
    await adapter.create({
      model: "user",
      data: fullUser({ id: "u1", email: "a@b.c" }),
      forceAllowId: true,
    });
    const rows = await adapter.findMany({
      model: "user",
      select: ["id"],
      sortBy: { field: "email", direction: "asc" },
      offset: 1,
      limit: 10,
    });
    expect(rows).toEqual([{ id: "u2" }]);
  });

  it("ignores ordering by an unknown field instead of failing", async () => {
    await adapter.create({
      model: "user",
      data: { id: "u1", email: "a@b.c" },
      forceAllowId: true,
    });
    const rows = await adapter.findMany({
      model: "user",
      sortBy: { field: "nope", direction: "asc" },
      limit: 10,
    });
    expect(rows).toHaveLength(1);
  });
});

describe("mutations", () => {
  it("AC-5: counts rows without fetching them", async () => {
    await adapter.create({
      model: "user",
      data: { id: "u1" },
      forceAllowId: true,
    });
    await adapter.create({
      model: "user",
      data: { id: "u2" },
      forceAllowId: true,
    });
    await expect(adapter.count({ model: "user" })).resolves.toBe(2);
  });

  it("updates one row and reports null when nothing matches", async () => {
    await adapter.create({
      model: "user",
      data: { id: "u1", name: "A" },
      forceAllowId: true,
    });
    const updated = await adapter.update({
      model: "user",
      where: where("id", "u1"),
      update: { name: "B" },
    });
    expect(updated).toMatchObject({ name: "B" });
    await expect(
      adapter.update({
        model: "user",
        where: where("id", "missing"),
        update: { name: "B" },
      }),
    ).resolves.toBeNull();
  });

  it("refuses an unfiltered update instead of touching every row", async () => {
    await adapter.create({
      model: "user",
      data: { id: "u1", name: "A" },
      forceAllowId: true,
    });
    await expect(
      adapter.update({ model: "user", where: [], update: { name: "B" } }),
    ).resolves.toBeNull();
    expect(fakes.stores["User"]?.[0]).toMatchObject({ name: "A" });
  });

  it("AC-3: deletes many rows and reports how many went away", async () => {
    await adapter.create({
      model: "verification",
      data: { id: "v1", identifier: "reset-password:t", value: "u1" },
      forceAllowId: true,
    });
    await adapter.create({
      model: "verification",
      data: { id: "v2", identifier: "reset-password:t", value: "u1" },
      forceAllowId: true,
    });
    const removed = await adapter.deleteMany({
      model: "verification",
      where: where("identifier", "reset-password:t"),
    });
    expect(removed).toBe(2);
    expect(fakes.stores["Verification"]).toHaveLength(0);
  });

  it("AC-3: runs mutations inside a transaction when asked", async () => {
    await adapter.transaction(async (trx) => {
      await trx.create({
        model: "user",
        data: { id: "u9", email: "t@x.io" },
        forceAllowId: true,
      });
    });
    expect(fakes.stores["User"]).toHaveLength(1);
  });
});

describe("joins", () => {
  it("nests the joined row under the relation name", async () => {
    await joiningAdapter.create({
      model: "user",
      data: { id: "u1", email: "a@b.c" },
      forceAllowId: true,
    });
    await joiningAdapter.create({
      model: "session",
      data: { id: "s1", userId: "u1", token: "t" },
      forceAllowId: true,
    });
    const session = await joiningAdapter.findOne({
      model: "session",
      where: where("token", "t"),
      join: { user: true },
    });
    expect(session).toMatchObject({ id: "s1", user: { id: "u1" } });
  });
});
