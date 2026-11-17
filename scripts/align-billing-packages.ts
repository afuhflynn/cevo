import "dotenv/config";
import { db } from "@/lib/prisma";

// One-off alignment of existing CreditPackage rows to the approved
// design mock (Starter / Research / Project). Matches seed defaults
// in lib/billing.ts by sortOrder. Safe to rerun.
async function main() {
  const targets = [
    { sortOrder: 1, name: "Starter", credits: 1000, isPopular: false },
    { sortOrder: 2, name: "Research", credits: 2500, isPopular: true },
    { sortOrder: 3, name: "Project", credits: 5000, isPopular: false },
  ];
  for (const t of targets) {
    const row = (await db.orm.public.CreditPackage.where({
      sortOrder: t.sortOrder,
    }).first()) as unknown as { id: string } | null;
    if (!row) {
      console.log(`missing package with sortOrder ${t.sortOrder}, skipping`);
      continue;
    }
    await db.orm.public.CreditPackage.where({ id: row.id }).update({
      name: t.name,
      credits: t.credits,
      isPopular: t.isPopular,
    });
    console.log(
      `sortOrder ${t.sortOrder} -> ${t.name} (${t.credits} credits, popular=${t.isPopular})`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
