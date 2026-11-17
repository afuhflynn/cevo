import { cacheLife } from "next/cache";
import {
  type BillingPackage,
  DEFAULT_PACKAGES,
  listActivePackages,
} from "./billing";

export type PublicPackagesResult = {
  packages: BillingPackage[];
  stale: boolean;
  failed: boolean;
  /** True when packages came from DEFAULT_PACKAGES, not the database. */
  fallback: boolean;
};

async function getCachedPackages(): Promise<BillingPackage[]> {
  "use cache";
  cacheLife("hours");
  return listActivePackages();
}

function orderPackages(packages: BillingPackage[]): BillingPackage[] {
  return [...packages].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.id.localeCompare(b.id);
  });
}

export async function getPublicPackages(): Promise<PublicPackagesResult> {
  try {
    const packages = await getCachedPackages();
    if (packages.length > 0) {
      return {
        packages: orderPackages(packages),
        stale: false,
        failed: false,
        fallback: false,
      };
    }
  } catch {
    // Fall through to file-based defaults below.
  }
  return {
    packages: orderPackages(DEFAULT_PACKAGES),
    stale: false,
    failed: false,
    fallback: true,
  };
}
