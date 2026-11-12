import "dotenv/config";
import { definePrismaConfig } from "prisma/config";
import { defineConfig as ormConfig } from "@prisma/orm-postgres/config";
import { defineConfig as composer } from "@prisma/composer/config";
import { nextjsBuild } from "@prisma/composer/nextjs/control";
import { nodeBuild } from "@prisma/composer/node/control";
import { prismaCloud, prismaState } from "@prisma/composer-prisma-cloud/control";

export default definePrismaConfig({
  orm: ormConfig({
    contract: "./prisma/schema.prisma",
    db: {
      connection: process.env["DATABASE_URL"]!,
    },
  }),
  skills: {
    agents: ["claude", "cursor", "agents", "devin"],
  },
  composer: composer({
    extensions: [prismaCloud({ region: "eu-central-1" }), nodeBuild(), nextjsBuild()],
    state: prismaState(),
  }),
});
