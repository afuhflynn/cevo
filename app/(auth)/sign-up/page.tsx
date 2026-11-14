import type { Metadata } from "next";
import type { SearchParams } from "nuqs/server";
import { Suspense } from "react";
import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create your Cevo account with an email and password.",
};

async function SignUpFormLoader({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const rawNext = params["next"];
  const rawPackageId = params["packageId"];
  const next =
    typeof rawNext === "string"
      ? rawNext
      : Array.isArray(rawNext)
        ? (rawNext[0] ?? null)
        : null;
  const packageId =
    typeof rawPackageId === "string"
      ? rawPackageId
      : Array.isArray(rawPackageId)
        ? (rawPackageId[0] ?? null)
        : null;
  return <SignUpForm next={next} packageId={packageId} />;
}

export default function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <Suspense fallback={null}>
      <SignUpFormLoader searchParams={searchParams} />
    </Suspense>
  );
}
