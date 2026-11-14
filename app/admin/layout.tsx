import Link from "next/link";
import { requireAdmin } from "@/lib/auth-helpers";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/reconcile", label: "Reconcile" },
  { href: "/admin/ai-usage", label: "AI usage" },
  { href: "/admin/tickets", label: "Tickets" },
  { href: "/admin/audit", label: "Audit" },
  { href: "/admin/templates", label: "Templates" },
  { href: "/admin/billing", label: "Packages" },
];

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireAdmin("/admin", "GET");
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <nav aria-label="Administration" className="mb-6 flex flex-wrap gap-2">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className="rounded-md border bg-card px-3 py-1.5 text-sm hover:bg-accent"
          >
            {n.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
