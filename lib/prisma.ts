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
