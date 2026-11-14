"use client";

import { AlertTriangleIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { authClient, toAuthErrorDetails } from "@/lib/auth-client";

function friendlyMessage(error: unknown): string {
  const { code, message } = toAuthErrorDetails(error);
  if (code === "INVALID_EMAIL_OR_PASSWORD") {
    return "Incorrect email or password. Check both and try again.";
  }
  if (code === "ACCOUNT_INACTIVE") {
    return "This account has been deactivated. Contact support for help.";
  }
  if (code === "RATE_LIMITED") {
    return "Too many attempts. Wait a moment, then try again.";
  }
  return message ?? "Something went wrong. Try again.";
}

export function SignInForm({
  next: nextProp,
  packageId: packageIdProp,
}: {
  next?: string | null;
  packageId?: string | null;
} = {}) {
  const router = useRouter();
  const rawNext = nextProp ?? null;
  const next =
    rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//")
      ? rawNext
      : "/onboarding";
  const packageId = packageIdProp ?? null;
  const signUpHref = packageId
    ? `/sign-up?next=${encodeURIComponent(rawNext ?? "/dashboard/billing")}&packageId=${encodeURIComponent(packageId)}`
    : rawNext
      ? `/sign-up?next=${encodeURIComponent(rawNext)}`
      : "/sign-up";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const { error: signInError } = await authClient.signIn.email({
      email: email.trim(),
      password,
    });
    setPending(false);
    if (signInError) {
      setError(friendlyMessage(signInError));
      return;
    }
    const target =
      packageId && next.includes("billing") && !next.includes("packageId")
        ? `${next}${next.includes("?") ? "&" : "?"}packageId=${encodeURIComponent(packageId)}`
        : next;
    router.push(target);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif text-2xl">Welcome back</CardTitle>
        <CardDescription>
          Sign in to continue work on your academic projects.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangleIcon aria-hidden="true" />
            <AlertTitle>Could not sign you in</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="sign-in-email">Email</Label>
            <Input
              id="sign-in-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "sign-in-error" : undefined}
            />
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="sign-in-password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="sign-in-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Your password"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "sign-in-error" : undefined}
            />
          </div>
          {error && (
            <span id="sign-in-error" className="sr-only">
              {error}
            </span>
          )}
          <Button type="submit" disabled={pending} aria-busy={pending}>
            {pending && <Spinner aria-hidden="true" />}
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          New to Cevo?{" "}
          <Link
            href={signUpHref}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Create an account
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
