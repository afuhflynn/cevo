"use client";

import { MailCheckIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { AlertTriangleIcon } from "lucide-react";
import { authClient, toAuthErrorDetails } from "@/lib/auth-client";
import { AuthCard, AuthFooterLink } from "../_components/auth-card";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ title: string; body: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setFieldError("Fill the highlighted field to continue.");
      setAlert({ title: "Check the highlighted fields", body: "Fix the inline errors and post again." });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setFieldError("Mail looks off. Use a valid mail address and try again.");
      setAlert({ title: "Check the highlighted fields", body: "Fix the inline errors and post again." });
      return;
    }
    setFieldError(null);
    setAlert(null);
    setPending(true);
    const { error: resetError } = await authClient.requestPasswordReset({
      email: trimmed,
      redirectTo: "/reset-password",
    });
    setPending(false);
    if (resetError) {
      const { code, message } = toAuthErrorDetails(resetError);
      setAlert({
        title: "Could not send the link",
        body: code === "RATE_LIMITED" ? "Too many attempts. Wait a moment, then try again." : (message ?? "Something went wrong. Try again."),
      });
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <AuthCard
        icon={MailCheckIcon}
        title="Check your inbox"
        description={
          <>
            If an account exists for <span className="font-medium text-foreground">{email.trim()}</span>, a password
            reset link is on its way. It expires in 60 minutes.
          </>
        }
        footer={
          <AuthFooterLink>
            <Link href="/sign-in" className="font-medium text-primary underline-offset-4 hover:underline">
              Back to sign in
            </Link>
          </AuthFooterLink>
        }
      >
        <p className="text-center text-xs text-muted-foreground">Did not get it? Wait a moment, then post again.</p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Reset your password"
      description="Enter the email you signed up with and we will send you a reset link."
      footer={
        <AuthFooterLink>
          <Link href="/sign-in" aria-disabled={pending} className="font-medium text-primary underline-offset-4 hover:underline aria-disabled:pointer-events-none aria-disabled:opacity-50">
            Back to sign in
          </Link>
        </AuthFooterLink>
      }
    >
      {alert && (
        <Alert variant="destructive">
          <AlertTriangleIcon aria-hidden="true" />
          <AlertTitle>{alert.title}</AlertTitle>
          <AlertDescription>{alert.body}</AlertDescription>
        </Alert>
      )}
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <Field data-invalid={fieldError ? true : undefined}>
          <FieldLabel htmlFor="forgot-email">Email Address</FieldLabel>
          <Input
            id="forgot-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            disabled={pending}
            aria-invalid={fieldError ? true : undefined}
            aria-describedby={fieldError ? "forgot-email-error" : undefined}
            className="h-12 rounded-xl"
          />
          {fieldError && <FieldError id="forgot-email-error">{fieldError}</FieldError>}
        </Field>
        <Button type="submit" disabled={pending} aria-busy={pending} className="h-11 rounded-xl text-[15px]">
          {pending && <Spinner aria-hidden="true" />}
          {pending ? "Sending…" : "Send reset link"}
        </Button>
      </form>
    </AuthCard>
  );
}
