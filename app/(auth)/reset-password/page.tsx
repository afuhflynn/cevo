import type { Metadata } from "next";
import type { SearchParams } from "nuqs/server";
import { Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { loadResetPasswordSearchParams } from "@/lib/search-params";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = {
  title: "Reset password",
  description: "Choose a new password for your Cevo account.",
};

async function ResetPasswordLoader({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { token, error } = await loadResetPasswordSearchParams(searchParams);
  return <ResetPasswordForm token={token} expired={error === "expired"} />;
}

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <Suspense
      fallback={
        <Card>
          <CardContent className="flex items-center justify-center py-10">
            <Spinner aria-label="Loading" />
          </CardContent>
        </Card>
      }
    >
      <ResetPasswordLoader searchParams={searchParams} />
    </Suspense>
  );
}
