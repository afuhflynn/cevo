"use client";

import { CheckIcon, FileTextIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type Package = {
  id: string;
  name: string;
  priceXaf: number;
  credits: number;
  isPopular: boolean;
};

export function BillingCheckout({
  packages,
  initialPackageId,
}: {
  packages: Package[];
  initialPackageId?: string | null;
}) {
  const requestedId = initialPackageId ?? null;
  const initial =
    (requestedId && packages.find((p) => p.id === requestedId)) ||
    packages.find((p) => p.isPopular) ||
    packages[0] ||
    null;
  const [selected, setSelected] = useState<Package | null>(initial);
  const [unknownPackage, setUnknownPackage] = useState(
    requestedId && !packages.some((p) => p.id === requestedId)
      ? requestedId
      : null,
  );

  if (packages.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No credit packages are available right now. Check back later.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {unknownPackage && (
        <output className="block rounded-xl border border-amber-600/40 bg-amber-500/10 px-4 py-3 text-sm">
          That package is no longer available. Pick another package below.
        </output>
      )}
      <fieldset>
        <legend className="sr-only">Choose a package</legend>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((p) => {
            const active = selected?.id === p.id;
            return (
              <div
                key={p.id}
                className={`relative flex flex-col items-center gap-2 rounded-2xl border bg-card p-6 text-center transition-colors sm:p-8 ${
                  active ? "border-2 border-primary" : "border-border/60"
                }`}
              >
                {p.isPopular && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-semibold whitespace-nowrap text-primary-foreground">
                    Most Popular
                  </span>
                )}
                <span
                  className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary"
                  aria-hidden="true"
                >
                  <FileTextIcon className="size-8" />
                </span>
                <span className="text-[26px] font-extrabold tracking-tight tabular-nums">
                  {p.priceXaf.toLocaleString("en-US")} FCFA
                </span>
                <span className="text-sm text-muted-foreground tabular-nums">
                  ~ {p.credits.toLocaleString("en-US")} credits
                </span>
                <Button
                  type="button"
                  variant={active ? "default" : "outline"}
                  onClick={() => {
                    setSelected(p);
                    setUnknownPackage(null);
                  }}
                  aria-pressed={active}
                  className="mt-3 h-11 w-full rounded-xl text-[15px]"
                >
                  {active && <CheckIcon aria-hidden="true" />}
                  {active ? "Selected" : `Choose ${p.name}`}
                </Button>
              </div>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
