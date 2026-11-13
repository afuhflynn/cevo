import { requireAdmin } from "@/lib/auth-helpers";

export const instant = false;

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireAdmin("/admin", "GET");
  return <>{children}</>;
}
