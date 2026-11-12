import { AlertTriangleIcon } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function SignInNotice({
  verified,
  error,
}: {
  verified: string | null;
  error: string | null;
}) {
  if (verified === "1") {
    return (
      <Alert className="mb-4 border-primary/30 bg-primary/5">
        <AlertTitle>Email verified</AlertTitle>
        <AlertDescription>
          Your address is confirmed. Sign in below to continue.
        </AlertDescription>
      </Alert>
    );
  }
  if (error === "verification-required") {
    return (
      <Alert className="mb-4">
        <AlertTriangleIcon aria-hidden="true" />
        <AlertTitle>Verify your email first</AlertTitle>
        <AlertDescription>
          Check your inbox for the verification link, then sign in. New here?{" "}
          <Link href="/sign-up" className="underline underline-offset-2">
            Create an account
          </Link>
          .
        </AlertDescription>
      </Alert>
    );
  }
  return null;
}
