import { AlertTriangleIcon, CheckCircle2Icon } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function SignInNotice({
  verified,
  error,
}: {
  verified: string | null;
  error: string | null;
}) {
  if (verified === "1" || verified === "true") {
    return (
      <Alert className="mb-4 border-primary/30 bg-primary/5">
        <CheckCircle2Icon aria-hidden="true" className="text-primary" />
        <AlertTitle>Account verified</AlertTitle>
        <AlertDescription>Sign in to continue.</AlertDescription>
      </Alert>
    );
  }
  if (error === "expired") {
    return (
      <Alert className="mb-4" variant="destructive">
        <AlertTriangleIcon aria-hidden="true" />
        <AlertTitle>Link expired</AlertTitle>
        <AlertDescription>
          Request a new link from{" "}
          <Link href="/forgot-password" className="underline underline-offset-2">
            forgot password
          </Link>
          .
        </AlertDescription>
      </Alert>
    );
  }
  if (error === "invalid") {
    return (
      <Alert className="mb-4" variant="destructive">
        <AlertTriangleIcon aria-hidden="true" />
        <AlertTitle>Link invalid</AlertTitle>
        <AlertDescription>
          Request a new link from{" "}
          <Link href="/forgot-password" className="underline underline-offset-2">
            forgot password
          </Link>
          .
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
