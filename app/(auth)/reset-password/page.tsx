import type { Metadata } from "next";
import type { SearchParams } from "nuqs/server";
import { Suspense } from "react";
import { loadResetPasswordSearchParams } from "@/lib/search-params";
import { AuthSkeleton } from "../_components/auth-skeleton";
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
    <Suspense fallback={<AuthSkeleton lines={2} />}>
      <ResetPasswordLoader searchParams={searchParams} />
    </Suspense>
  );
}
