import postgres, { type PostgresClient } from "@prisma/orm-postgres/runtime";
import { contractFromJson } from "@prisma/orm-postgres/static";
import type { Contract } from "../prisma/schema";
import schemaJson from "../prisma/schema.json" with { type: "json" };

export const contract = contractFromJson<Contract>(schemaJson);

type Db = PostgresClient<Contract>;

const globalForPrisma = globalThis as unknown as {
  cevoDb?: Db;
};

export const db: Db =
  globalForPrisma.cevoDb ??
  postgres({ contract, url: process.env["DATABASE_URL"] });

if (process.env["NODE_ENV"] !== "production") {
  globalForPrisma.cevoDb = db;
}

/**
 * Retry an idempotent read against transient database failures.
 * The hosted database sleeps when idle, and the first query of a fresh
 * client (the contract marker read) eats the wake-up failure. One short
 * backoff round is enough to ride out a wake; persistent outages still
 * throw so callers can degrade honestly. Never use for writes.
 */
export async function withDbRetry<T>(
  fn: () => T | PromiseLike<T>,
  opts?: { attempts?: number; baseDelayMs?: number },
): Promise<T> {
  const attempts = Math.max(1, opts?.attempts ?? 3);
  const baseDelayMs = Math.max(0, opts?.baseDelayMs ?? 1000);
  let lastError: unknown = new Error("withDbRetry: no attempts ran");
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < attempts - 1 && baseDelayMs > 0) {
        await new Promise((resolve) =>
          setTimeout(resolve, baseDelayMs * 2 ** i),
        );
      }
    }
  }
  throw lastError;
}
