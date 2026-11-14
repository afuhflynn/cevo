import "dotenv/config";
import { seedBillingPackages } from "@/lib/billing";

async function main() {
  const packages = await seedBillingPackages();
  console.log(
    `Billing packages ready: ${packages.map((p) => `${p.name} (${p.priceXaf} XAF -> ${p.credits})`).join(", ")}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
