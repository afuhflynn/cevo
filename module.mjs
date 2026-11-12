// @ts-check
import { module } from "@prisma/composer";
import { postgres, dataContract } from "@prisma/composer-prisma-cloud/orm";
import cevoContractJson from "./src/prisma/contract.json" with { type: "json" };
import cevoService from "./service.mjs";

export default module("cevo", ({ provision }) => {
  const database = provision(postgres({ name: "database", contract: dataContract(cevoContractJson), config: "./prisma.config.ts" }));
  provision(cevoService, { deps: { db: database } });
});
