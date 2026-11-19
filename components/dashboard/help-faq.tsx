"use client";

import { ArrowRightIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { faqs } from "@/components/public/faq-items";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function HelpFaq({ audience }: { audience: "page" | "settings" }) {
  const groupName = audience === "page" ? "help-faq" : "settings-help-faq";
  return (
    <>
      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border/70 bg-card">
        {faqs.map((f) => (
          <details key={f.q} name={groupName} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
              <span className="text-[15px] font-medium">{f.q}</span>
              <PlusIcon
                className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-45"
                aria-hidden="true"
              />
            </summary>
            <p className="px-5 pb-4 text-sm leading-relaxed text-muted-foreground">
              {f.a}
            </p>
          </details>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Still stuck?</CardTitle>
          <CardDescription>
            Write to support with your project title and what you were doing.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <a href="mailto:support@cevo.example">
            <Button
              variant="outline"
              className="h-11 gap-2 rounded-xl px-5 text-sm"
            >
              Contact support
              <ArrowRightIcon className="size-4" aria-hidden="true" />
            </Button>
          </a>
          <Link href="/dashboard/billing">
            <Button variant="ghost" className="h-11 rounded-xl px-5 text-sm">
              Buy credits
            </Button>
          </Link>
        </CardContent>
      </Card>
    </>
  );
}
