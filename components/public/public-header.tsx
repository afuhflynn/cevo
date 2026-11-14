"use client";

import Link from "next/link";
import { useState } from "react";
import { CevoLogo } from "@/components/cevo-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/pricing", label: "Pricing" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
];

export function PublicHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <CevoLogo size="sm" href="/" priority />
        <nav aria-label="Public" className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/sign-in"
            className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Sign in
          </Link>
          <Link href="/sign-up" className="ml-1">
            <Button size="sm">Get started</Button>
          </Link>
          <ThemeToggle className="ml-1 size-8" />
        </nav>
        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle className="size-8" />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            className="inline-flex size-8 items-center justify-center rounded-md border border-border text-foreground"
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
              <li key={l.href}>
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
