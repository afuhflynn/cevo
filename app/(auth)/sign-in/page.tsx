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
      <SignInForm />
    </>
  );
}
