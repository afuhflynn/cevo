import { cacheLife } from "next/cache";
import { type BillingPackage, listActivePackages } from "./billing";

export type PublicPackagesResult = {
  packages: BillingPackage[];
  stale: boolean;
  failed: boolean;
};

async function getCachedPackages(): Promise<BillingPackage[]> {
  "use cache";
  cacheLife("hours");
  return listActivePackages();
}

export async function getPublicPackages(): Promise<PublicPackagesResult> {
  try {
    const packages = await getCachedPackages();
    const ordered = [...packages].sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.id.localeCompare(b.id);
    });
    return { packages: ordered, stale: false, failed: false };
  } catch {
    return { packages: [], stale: false, failed: true };
  }
}
