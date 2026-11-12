import { and, not, or, orderByField } from "@prisma/orm-postgres/orm-client";
import type { BetterAuthOptions } from "better-auth";
import {
  type AdapterFactoryCustomizeAdapterCreator,
  type CleanedWhere,
  type CustomAdapter,
  createAdapterFactory,
  type DBTransactionAdapter,
  type JoinConfig,
} from "better-auth/adapters";
import { db } from "./prisma";

type Orm = typeof db.orm;
type ClientLike = { orm: Orm };

const SORTABLE_FIELDS: Record<string, string[]> = {
  user: [
    "id",
    "name",
    "email",
    "emailVerified",
    "image",
    "role",
    "isActive",
    "createdAt",
    "updatedAt",
  ],
  session: [
    "id",
    "userId",
    "token",
    "expiresAt",
    "ipAddress",
    "userAgent",
    "createdAt",
  ],
  account: ["id", "userId", "accountId", "providerId", "createdAt"],
  verification: ["id", "identifier", "value", "expiresAt", "createdAt"],
};

function collection(client: ClientLike, model: string): any {
  switch (model.toLowerCase()) {
    case "user":
      return client.orm.public.User;
    case "session":
      return client.orm.public.Session;
    case "account":
      return client.orm.public.Account;
    case "verification":
      return client.orm.public.Verification;
    default:
      throw new Error(`[prisma-8-adapter] unknown model "${model}"`);
  }
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

function toPredicate(row: any, where: CleanedWhere): any {
  const field = row[where.field] as any;
  const value = where.value;
  const insensitive = where.mode === "insensitive";
  switch (where.operator) {
    case "eq":
      return insensitive && typeof value === "string"
        ? field.ilike(value)
        : field.eq(value);
    case "ne":
      return insensitive && typeof value === "string"
        ? not(field.ilike(value))
        : field.neq(value);
    case "lt":
      return field.lt(value);
    case "lte":
      return field.lte(value);
    case "gt":
      return field.gt(value);
    case "gte":
      return field.gte(value);
    case "in":
      return field.in(value as unknown[]);
    case "not_in":
      return not(field.in(value as unknown[]));
    case "contains": {
      const pattern = `%${escapeLikePattern(String(value))}%`;
      return insensitive ? field.ilike(pattern) : field.like(pattern);
    }
    case "starts_with": {
      const pattern = `${escapeLikePattern(String(value))}%`;
      return insensitive ? field.ilike(pattern) : field.like(pattern);
    }
    case "ends_with": {
      const pattern = `%${escapeLikePattern(String(value))}`;
      return insensitive ? field.ilike(pattern) : field.like(pattern);
    }
    default:
      throw new Error(
        `[prisma-8-adapter] unsupported operator "${where.operator}"`,
      );
  }
}

function withWheres(coll: any, wheres?: CleanedWhere[]): any {
  if (!wheres || wheres.length === 0) {
    return coll;
  }
  return coll.where((row: any) => {
    let acc: any = toPredicate(row, wheres[0]!);
    for (let i = 1; i < wheres.length; i++) {
      const next = toPredicate(row, wheres[i]!);
      acc = wheres[i]!.connector === "OR" ? or(acc, next) : and(acc, next);
    }
    return acc;
  });
}

function withSelect(coll: any, select?: string[]): any {
  if (!select || select.length === 0) {
    return coll;
  }
  return coll.select(...(select as [string, ...string[]]));
}

function withSort(
  coll: any,
  model: string,
  sortBy?: { field: string; direction: "asc" | "desc" },
): any {
  if (!sortBy) {
    return coll;
  }
  const allowed = SORTABLE_FIELDS[model.toLowerCase()];
  if (!allowed || allowed.length === 0 || !allowed.includes(sortBy.field)) {
    return coll;
  }
  return coll.orderBy(
    orderByField(
      coll,
      sortBy.field,
      sortBy.direction,
      allowed as [string, ...string[]],
    ),
  );
}

async function applyJoins(
  rows: any[],
  client: ClientLike,
  join?: JoinConfig,
): Promise<any[]> {
  if (!join || rows.length === 0) {
    return rows;
  }
  for (const [joinKey, cfg] of Object.entries(join)) {
    if (!cfg || typeof cfg !== "object" || !cfg.on) {
      continue;
    }
    const targets = collection(client, cfg.modelKey ?? joinKey);
    const fromValues = [
      ...new Set(rows.map((row) => row[cfg.on.from]).filter((v) => v != null)),
    ];
    if (fromValues.length === 0) {
      continue;
    }
    const fetched: any[] = await targets
      .where((target: any) => target[cfg.on.to].in(fromValues))
      .all();
    const byKey = new Map(fetched.map((row) => [row[cfg.on.to], row]));
    const single = cfg.relation === "one-to-one" || (cfg.limit ?? 100) === 1;
    for (const row of rows) {
      const match = byKey.get(row[cfg.on.from]);
      row[joinKey] = single ? (match ?? null) : match ? [match] : [];
    }
  }
  return rows;
}

const createCustomAdapter = (
  client: ClientLike,
): AdapterFactoryCustomizeAdapterCreator => {
  const adapter: CustomAdapter = {
    create: async ({ data, model }) => {
      const coll = collection(client, model);
      return (await coll.create(data)) as any;
    },
    findOne: async ({ model, where, select, join }) => {
      const coll = collection(client, model);
      const row = await withSelect(withWheres(coll, where), select).first();
      if (!row || !join) {
        return row;
      }
      const [merged] = await applyJoins([row], client, join);
      return merged;
    },
    findMany: async ({ model, where, limit, select, sortBy, offset, join }) => {
      const coll = collection(client, model);
      let query = withSort(
        withSelect(withWheres(coll, where), select),
        model,
        sortBy,
      );
      if (typeof offset === "number") {
        query = query.offset(offset);
      }
      const rows = await query.limit(limit).all();
      if (!join) {
        return rows;
      }
      return applyJoins(rows, client, join);
    },
    count: async ({ model, where }) => {
      const coll = collection(client, model);
      const result = await withWheres(coll, where).aggregate((a: any) => ({
        total: a.count(),
      }));
      return Number(result.total);
    },
    update: async ({ model, where, update }) => {
      if (!where || where.length === 0) {
        return null;
      }
      const coll = collection(client, model);
      return withWheres(coll, where).update(update);
    },
    updateMany: async ({ model, where, update }) => {
      const coll = collection(client, model);
      const rows = await withWheres(coll, where).updateAll(update);
      return Array.isArray(rows) ? rows.length : 0;
    },
    delete: async ({ model, where }) => {
      if (!where || where.length === 0) {
        return;
      }
      const coll = collection(client, model);
      await withWheres(coll, where).delete();
    },
    deleteMany: async ({ model, where }) => {
      const coll = collection(client, model);
      const rows = await withWheres(coll, where).deleteAll();
      return Array.isArray(rows) ? rows.length : 0;
    },
  };
  return () => adapter;
};

let lazyOptions: BetterAuthOptions | undefined;

const adapterOptions = {
  config: {
    adapterId: "prisma-8",
    adapterName: "Prisma 8",
    usePlural: false,
    debugLogs: false,
    supportsJSON: false,
    transaction: <R>(
      callback: (trx: DBTransactionAdapter) => Promise<R>,
    ): Promise<R> =>
      db.transaction(async (tx) => {
        const txAdapter = createAdapterFactory({
          config: { ...adapterOptions.config, transaction: false },
          adapter: createCustomAdapter({ orm: tx.orm as unknown as Orm }),
        })(lazyOptions!);
        return callback(txAdapter);
      }),
  },
  adapter: createCustomAdapter({ orm: db.orm }),
};

const factory = createAdapterFactory(adapterOptions);

export const prismaAdapter = (options: BetterAuthOptions) => {
  lazyOptions = options;
  return factory(options);
};
