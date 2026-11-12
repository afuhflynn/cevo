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

function friendlyMessage(error: unknown): string {
  const { code, message } = toAuthErrorDetails(error);
  if (code === "RATE_LIMITED") {
    return "Too many attempts. Wait a moment, then try again.";
  }
  return message ?? "Something went wrong. Try again.";
}

export function SignUpForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [created, setCreated] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const { error: signUpError } = await authClient.signUp.email({
      name: name.trim(),
      email: email.trim(),
      password,
      callbackURL: "/sign-in?verified=1",
    });
    setPending(false);
    if (signUpError) {
      setError(friendlyMessage(signUpError));
      return;
    }
    setCreated(true);
  }

  async function resend() {
    setResending(true);
    setResent(false);
    await authClient.sendVerificationEmail({
      email: email.trim(),
      callbackURL: "/sign-in?verified=1",
    });
    setResending(false);
    setResent(true);
  }

  if (created) {
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
            We sent a verification link to {email.trim()}. It expires in 24
            hours. Click it, then sign in.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {resent && (
            <Alert className="border-primary/30 bg-primary/5">
              <AlertTitle>Link re-sent</AlertTitle>
              <AlertDescription>
                A fresh verification link is on its way.
              </AlertDescription>
            </Alert>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={resend}
            disabled={resending}
            aria-busy={resending}
          >
            {resending && <Spinner aria-hidden="true" />}
            {resending ? "Sending…" : "Resend verification email"}
          </Button>
        </CardContent>
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
          Create your account
        </CardTitle>
        <CardDescription>
          One account for your projects, research, and exports.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangleIcon aria-hidden="true" />
            <AlertTitle>Could not create your account</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-2">
            <Label htmlFor="sign-up-name">Full name</Label>
            <Input
              id="sign-up-name"
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="sign-up-email">Email</Label>
            <Input
              id="sign-up-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="sign-up-password">Password</Label>
            <Input
              id="sign-up-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={128}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 12 characters"
              aria-describedby="sign-up-password-hint"
            />
            <p
              id="sign-up-password-hint"
              className="text-xs text-muted-foreground"
            >
              At least 12 characters, up to 128. Longer is stronger.
            </p>
          </div>
          <Button type="submit" disabled={pending} aria-busy={pending}>
            {pending && <Spinner aria-hidden="true" />}
            {pending ? "Creating account…" : "Create account"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/sign-in"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
