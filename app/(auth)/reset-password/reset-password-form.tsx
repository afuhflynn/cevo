"use client";

import { AlertTriangleIcon, KeyRoundIcon } from "lucide-react";
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

export function ResetPasswordForm({
  token,
  expired,
}: {
  token: string | null;
  expired: boolean;
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  if (!token || expired) {
    return (
      <Card>
        <CardHeader>
          <span className="flex size-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <AlertTriangleIcon className="size-5" aria-hidden="true" />
          </span>
          <CardTitle className="font-serif text-2xl">
            This link has expired
          </CardTitle>
          <CardDescription>
            Reset links expire after 60 minutes and can only be used once.
            Request a fresh one below.
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Request a new reset link
          </Link>
        </CardFooter>
      </Card>
    );
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }
    setError(null);
    setPending(true);
    if (!token) {
      router.push("/reset-password?error=expired");
      return;
    }
    const { error: resetError } = await authClient.resetPassword({
      newPassword: password,
      token,
    });
    setPending(false);
    if (resetError) {
      const { code, message } = toAuthErrorDetails(resetError);
      if (
        code === "INVALID_TOKEN" ||
        /expir/i.test(message ?? "") ||
        /invalid/i.test(message ?? "")
      ) {
        router.push("/reset-password?error=expired");
        return;
      }
      setError(
        code === "RATE_LIMITED"
          ? "Too many attempts. Wait a moment, then try again."
          : (message ?? "Something went wrong. Try again."),
      );
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <Card>
        <CardHeader>
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <KeyRoundIcon className="size-5" aria-hidden="true" />
          </span>
          <CardTitle className="font-serif text-2xl">
            Password updated
          </CardTitle>
          <CardDescription>
            Your new password is set. Sign in with it to continue.
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Link
            href="/sign-in"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Go to sign in
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif text-2xl">
          Choose a new password
        </CardTitle>
        <CardDescription>
          Pick something strong. At least 12 characters, up to 128.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangleIcon aria-hidden="true" />
            <AlertTitle>Could not update your password</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="reset-password">New password</Label>
            <Input
              id="reset-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={128}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 12 characters"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="reset-password-confirm">Confirm new password</Label>
            <Input
              id="reset-password-confirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={128}
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              placeholder="Repeat your new password"
            />
          </div>
          <Button type="submit" disabled={pending} aria-busy={pending}>
            {pending && <Spinner aria-hidden="true" />}
            {pending ? "Updating…" : "Update password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
