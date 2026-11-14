import Link from "next/link";

export default function AdminHome() {
  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <p className="text-sm text-muted-foreground">Administration</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Platform controls
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Review formatting templates, extraction drafts, and publishing. Every
        write is audited.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link
          href="/admin/templates"
          className="rounded-lg border bg-card p-6 shadow-sm transition hover:shadow-md"
        >
          <h2 className="text-lg font-semibold">Institutional templates</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Create versioned formatting rules, publish them, and manage scope.
          </p>
        </Link>
        <Link
          href="/admin/templates/drafts"
          className="rounded-lg border bg-card p-6 shadow-sm transition hover:shadow-md"
        >
          <h2 className="text-lg font-semibold">Extraction drafts</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Review model drafted rules, apply them to versions, or discard.
          </p>
        </Link>
      </div>
    </main>
  );
}
