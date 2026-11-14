export function formatXaf(priceXaf: number): string {
  return `${priceXaf.toLocaleString("fr-CM")} XAF`;
}

export function buildSignupHref(packageId: string): string {
  const next = encodeURIComponent("/dashboard/billing");
  return `/sign-up?next=${next}&packageId=${encodeURIComponent(packageId)}`;
}

export function buildBillingHref(packageId: string): string {
  return `/dashboard/billing?packageId=${encodeURIComponent(packageId)}`;
}
