"use client";

import Link from "next/link";
import { useState } from "react";
import { CevoLogo } from "@/components/cevo-logo";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/#features", label: "Features" },
  { href: "/#templates", label: "Templates" },
  { href: "/pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
  { href: "/#contact", label: "Contact" },
];

export function PublicHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto grid h-16 max-w-6xl grid-cols-[1fr_auto_1fr] items-center px-4 sm:px-6">
        <div className="flex justify-start">
          <CevoLogo size="sm" href="/" priority />
        </div>
        <nav aria-label="Public" className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-foreground/70 transition-colors hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="hidden justify-end md:flex">
          <Link href="/sign-up">
            <Button size="sm" className="h-9 px-5">
              Get started
            </Button>
          </Link>
        </div>
        <div className="flex justify-end md:hidden">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            className="inline-flex size-10 items-center justify-center rounded-md border border-border text-foreground"
          >
            <span aria-hidden="true" className="text-lg leading-none">
              {open ? "×" : "☰"}
            </span>
          </button>
        </div>
      </div>
      {open && (
        <nav
          aria-label="Public mobile"
          className="border-t border-border/60 bg-background px-4 py-3 md:hidden"
        >
          <ul className="flex flex-col gap-1">
            {[...links, { href: "/sign-in", label: "Sign in" }].map((l) => (
              <li key={l.label}>
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {l.label}
                </Link>
              </li>
            ))}
            <li className="pt-1">
              <Link href="/sign-up" onClick={() => setOpen(false)}>
                <Button size="sm" className="w-full">
                  Get started
                </Button>
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
