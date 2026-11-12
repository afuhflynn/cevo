"use client";

import { AlertTriangleIcon, MailCheckIcon } from "lucide-react";
import Link from "next/link";
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

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const { error: resetError } = await authClient.requestPasswordReset({
      email: email.trim(),
      redirectTo: "/reset-password",
    });
    setPending(false);
    if (resetError) {
      const { code, message } = toAuthErrorDetails(resetError);
      setError(
        code === "RATE_LIMITED"
          ? "Too many attempts. Wait a moment, then try again."
          : (message ?? "Something went wrong. Try again."),
      );
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <Card>
        <CardHeader>
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MailCheckIcon className="size-5" aria-hidden="true" />
          </span>
          <CardTitle className="font-serif text-2xl">
            Check your inbox
          </CardTitle>
          <CardDescription>
            If an account exists for {email.trim()}, a password reset link is on
            its way. It expires in 60 minutes.
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Link
            href="/sign-in"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Back to sign in
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif text-2xl">
          Reset your password
        </CardTitle>
        <CardDescription>
          Enter the email you signed up with and we will send you a reset link.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangleIcon aria-hidden="true" />
            <AlertTitle>Could not send the link</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="forgot-email">Email</Label>
            <Input
              id="forgot-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <Button type="submit" disabled={pending} aria-busy={pending}>
            {pending && <Spinner aria-hidden="true" />}
            {pending ? "Sending…" : "Send reset link"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <Link
          href="/sign-in"
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Back to sign in
        </Link>
      </CardFooter>
    </Card>
  );
}
