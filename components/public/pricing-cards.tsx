import { CheckIcon, MailQuestionMarkIcon } from "lucide-react";
import Link from "next/link";
import { BuyButton } from "@/components/public/buy-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BillingPackage } from "@/lib/billing";

const tierCopy = [
  {
    tagline: "Ideal for small projects.",
    features: ["Basic AI features", "Standard templates", "Community support"],
  },
  {
    tagline: "Perfect for research projects.",
    features: ["Advanced AI features", "Premium templates", "Priority support"],
  },
  {
    tagline: "For serious academic work.",
    features: ["Full features access", "All templates", "Dedicated support"],
  },
];

function formatFcfa(priceXaf: number): string {
  return `${priceXaf.toLocaleString("en-US")} FCFA`;
}

function formatCredits(credits: number): string {
  return `~ ${credits.toLocaleString("en-US")} credits`;
}

export function PricingCards({ packages }: { packages: BillingPackage[] }) {
  if (packages.length === 0) {
    return (
      <div
        role="status"
        className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-6 py-12 text-center"
      >
        <MailQuestionMarkIcon
          className="size-8 text-muted-foreground"
          aria-hidden="true"
        />
        <p className="text-lg font-medium text-foreground">
          No credit packages are available right now
        </p>
        <p className="max-w-md text-sm break-words text-muted-foreground">
          Packages are being updated. Check back soon, or contact{" "}
          <a
            href="mailto:support@cevo.example"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            support@cevo.example
          </a>{" "}
          if you need help choosing.
        </p>
        <Link href="/sign-up">
          <Button variant="outline">Create an account anyway</Button>
        </Link>
      </div>
    );
  }

  const ordered = [...packages].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.id.localeCompare(b.id);
  });
  const popularId =
    ordered.find((p) => p.isPopular)?.id ??
    (ordered.length === 3 ? ordered[1].id : null);

  return (
    <ul
      className="grid w-full max-w-5xl gap-6 pt-4 text-left sm:grid-cols-2 lg:grid-cols-3"
      aria-label="Credit packages"
    >
      {ordered.map((p, i) => {
        const popular = popularId !== null && p.id === popularId;
        const copy = tierCopy[i] ?? {
          tagline: "Flexible credits for your project.",
          features: [
            `${p.credits.toLocaleString("en-US")} AI credits`,
            "All templates",
            "Email support",
          ],
        };
        return (
          <li key={p.id} className="h-full">
            <Card
              className={`relative flex h-full flex-col gap-5 overflow-visible p-8 ${
                popular
                  ? "border-2 border-primary shadow-[0_24px_60px_-28px_var(--color-primary)]"
                  : ""
              }`}
            >
              {popular && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-semibold whitespace-nowrap text-primary-foreground">
                  Most Popular
                </span>
              )}
              <CardHeader className="flex flex-col gap-2 p-0">
                <CardTitle className="text-lg font-bold">{p.name}</CardTitle>
                <p className="text-4xl font-extrabold tracking-tight">
                  {formatFcfa(p.priceXaf)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatCredits(p.credits)}
                </p>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-5 p-0">
                <p className="text-sm font-semibold">{copy.tagline}</p>
                <ul className="flex flex-col gap-2.5">
                  {copy.features.map((feat) => (
                    <li
                      key={feat}
                      className="flex items-start gap-2 text-sm font-medium text-foreground/75"
                    >
                      <CheckIcon
                        className="mt-0.5 size-4 shrink-0 text-emerald-600"
                        aria-hidden="true"
                      />
                      {feat}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-1">
                  <BuyButton
                    packageId={p.id}
                    packageName={p.name}
                    label="Get Started"
                    buttonClassName="h-11 w-full rounded-lg text-[15px]"
                  />
                </div>
              </CardContent>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
