import type { Metadata } from "next";
import type { SearchParams } from "nuqs/server";
import { Suspense } from "react";
import { loadSignInSearchParams } from "@/lib/search-params";
import { SignInForm } from "./sign-in-form";
import { SignInNotice } from "./sign-in-notice";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Cevo account to continue your academic work.",
};

async function SignInNoticeLoader({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { verified, error } = await loadSignInSearchParams(searchParams);
  return <SignInNotice verified={verified} error={error} />;
}

async function SignInFormLoader({
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
  return <SignInForm next={next} packageId={packageId} />;
}

export default function SignInPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <>
      <Suspense fallback={null}>
        <SignInNoticeLoader searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={null}>
        <SignInFormLoader searchParams={searchParams} />
      </Suspense>
    </>
  );
}
