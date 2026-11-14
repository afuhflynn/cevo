import {
  CheckCircle2Icon,
  MailQuestionMarkIcon,
  SmartphoneIcon,
} from "lucide-react";
import Link from "next/link";
import { BuyButton } from "@/components/public/buy-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { BillingPackage } from "@/lib/billing";
import { formatXaf } from "@/lib/public-links";

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
        <p className="max-w-md text-sm text-muted-foreground">
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

  return (
    <ul className="grid gap-4 sm:grid-cols-3" aria-label="Credit packages">
      {packages.map((p) => (
        <li key={p.id}>
          <Card
            className={`relative flex h-full flex-col ${p.isPopular ? "border-primary shadow-sm" : ""}`}
          >
            {p.isPopular && (
              <Badge className="absolute -top-2.5 left-4">Popular</Badge>
            )}
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{p.name}</CardTitle>
              <CardDescription>{p.credits} credits</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-4">
              <p className="text-3xl font-semibold tracking-tight">
                {formatXaf(p.priceXaf)}
              </p>
              <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2Icon
                    className="mt-0.5 size-4 shrink-0 text-emerald-600"
                    aria-hidden="true"
                  />
                  {p.credits} AI credits for briefs, assistant, and review
                </li>
                <li className="flex items-start gap-2">
                  <SmartphoneIcon
                    className="mt-0.5 size-4 shrink-0"
                    aria-hidden="true"
                  />
                  Pay with MTN MoMo or Orange Money
                </li>
              </ul>
              <div className="mt-auto pt-2">
                <BuyButton packageId={p.id} packageName={p.name} />
              </div>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}
