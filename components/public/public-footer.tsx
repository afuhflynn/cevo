import Link from "next/link";
import { CevoLogo } from "@/components/cevo-logo";

export function PublicFooter() {
  return (
    <footer className="mt-auto border-t border-border/60 bg-background/60 py-10 text-sm text-muted-foreground">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:grid-cols-3 sm:px-6">
        <div className="flex flex-col gap-3">
          <CevoLogo size="sm" href="/" />
          <p className="max-w-xs text-sm leading-relaxed">
            From idea to verified exportable report. Built for university
            students in Cameroon.
          </p>
          <p className="text-xs">
            Contact:{" "}
            <a
              href="mailto:support@cevo.example"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              support@cevo.example
            </a>
          </p>
        </div>
        <nav aria-label="Product">
          <p className="mb-3 text-xs font-semibold tracking-wide text-foreground uppercase">
            Product
          </p>
          <ul className="flex flex-col gap-2">
            <li>
              <Link href="/pricing" className="hover:text-foreground">
                Pricing
              </Link>
            </li>
            <li>
              <Link href="/sign-up" className="hover:text-foreground">
                Get started
              </Link>
            </li>
            <li>
              <Link href="/sign-in" className="hover:text-foreground">
                Sign in
              </Link>
            </li>
          </ul>
        </nav>
        <nav aria-label="Legal">
          <p className="mb-3 text-xs font-semibold tracking-wide text-foreground uppercase">
            Legal
          </p>
          <ul className="flex flex-col gap-2">
            <li>
              <Link href="/terms" className="hover:text-foreground">
                Terms of service
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="hover:text-foreground">
                Privacy policy
              </Link>
            </li>
            <li>
              <Link href="/refunds" className="hover:text-foreground">
                Refund policy
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <div className="mx-auto mt-8 flex max-w-6xl flex-col gap-2 px-4 text-xs sm:px-6">
        <p>
          © 2026 Cevo Academic Development Workspace. Cameroon Higher Education.
        </p>
        <p>
          Legal wording here is general information, not legal advice. Ask your
          institution before you rely on it.
        </p>
      </div>
    </footer>
  );
}
