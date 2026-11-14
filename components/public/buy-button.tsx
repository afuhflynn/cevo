"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { buildBillingHref, buildSignupHref } from "@/lib/public-links";

export function BuyButton({
  packageId,
  packageName,
  large = false,
}: {
  packageId: string;
  packageName: string;
  large?: boolean;
}) {
  const { data: session, isPending } = authClient.useSession();
  const [href, setHref] = useState(buildSignupHref(packageId));

  useEffect(() => {
    if (isPending) return;
    setHref(
      session?.user ? buildBillingHref(packageId) : buildSignupHref(packageId),
    );
  }, [session, isPending, packageId]);

  return (
    <Link
      href={href}
      aria-label={`Buy ${packageName} credits`}
      className="inline-flex w-full"
    >
      <Button size={large ? "lg" : "default"} className="w-full">
        Buy {packageName}
      </Button>
    </Link>
  );
}
