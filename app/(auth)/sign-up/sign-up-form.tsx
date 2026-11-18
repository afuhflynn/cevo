"use client";

import { MailCheckIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { AlertTriangleIcon } from "lucide-react";
import { authClient, toAuthErrorDetails } from "@/lib/auth-client";
import { AuthCard, AuthFooterLink } from "../_components/auth-card";
import { PasswordField, isPasswordComplete } from "../_components/password-field";

function friendlyMessage(error: unknown): { title: string; body: string } {
  const { code, message } = toAuthErrorDetails(error);
  if (code === "RATE_LIMITED") {
    return { title: "Too many attempts", body: "Wait a moment then try again. Resend respects a 60 second cooldown." };
  }
  return { title: "Could not create your account", body: message ?? "Something went wrong. Try again." };
}

function safeNextPath(raw: string | null): string | null {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return null;
}

export function SignUpForm({
  next: nextProp,
  packageId: packageIdProp,
}: {
  next?: string | null;
  packageId?: string | null;
} = {}) {
  const rawNext = nextProp ?? null;
  const safeNext = safeNextPath(rawNext);
  const packageId = packageIdProp ?? null;
  const nextWithPackage =
    safeNext && packageId && !safeNext.includes("packageId")
      ? `${safeNext}${safeNext.includes("?") ? "&" : "?"}packageId=${encodeURIComponent(packageId)}`
      : safeNext;
  const callbackURL = nextWithPackage ?? "/sign-in?verified=1";
  const signInHref =
    safeNext || packageId
      ? `/sign-in?${[
          safeNext ? `next=${encodeURIComponent(safeNext)}` : null,
          packageId ? `packageId=${encodeURIComponent(packageId)}` : null,
        ]
          .filter(Boolean)
          .join("&")}`
      : "/sign-in";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string; password?: string }>({});
  const [alert, setAlert] = useState<{ title: string; body: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [created, setCreated] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const passwordOk = isPasswordComplete(password);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const nextErrors: typeof fieldErrors = {};
    if (trimmedName.length < 2 || trimmedName.length > 100) nextErrors.name = "Use 2 to 100 characters for your name.";
    if (!trimmedEmail) nextErrors.email = "Fill the highlighted field to continue.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) nextErrors.email = "Mail looks off. Use a valid mail address and try again.";
    if (!isPasswordComplete(password)) nextErrors.password = "Complete every password rule before creating your account.";
    setFieldErrors(nextErrors);
    if (nextErrors.name || nextErrors.email || nextErrors.password) {
      setAlert({ title: "Check the highlighted fields", body: "Fix the inline errors and post again." });
      return;
    }
    setAlert(null);
    setPending(true);
    const { error: signUpError } = await authClient.signUp.email({
      name: trimmedName,
      email: trimmedEmail,
      password,
      callbackURL,
    });
    setPending(false);
    if (signUpError) {
      setAlert(friendlyMessage(signUpError));
      return;
    }
    setCreated(true);
  }

  async function resend() {
    if (cooldown > 0) return;
    setResending(true);
    setResent(false);
    const { error } = await authClient.sendVerificationEmail({
      email: email.trim(),
      callbackURL,
    });
    setResending(false);
    if (error) {
      const { code } = toAuthErrorDetails(error);
      setAlert(
        code === "RATE_LIMITED"
          ? { title: "Too many attempts", body: "Wait a moment then try again." }
          : { title: "Could not resend", body: "Something went wrong. Try again." },
      );
      return;
    }
    setResent(true);
    setCooldown(60);
  }

  if (created) {
    return (
      <AuthCard
        icon={MailCheckIcon}
        title="Check your inbox"
        description={
          <>
            We sent a verification link to <span className="font-medium text-foreground">{email.trim()}</span>.
            It expires in 24 hours. Click it, then sign in.
          </>
        }
        footer={
          <Link href={signInHref} className="text-sm font-medium text-primary underline-offset-4 hover:underline">
            Go to sign in
          </Link>
        }
      >
        {resent && (
          <Alert className="border-primary/30 bg-primary/5">
            <AlertTitle>Link re-sent</AlertTitle>
            <AlertDescription>A fresh verification link is on its way.</AlertDescription>
          </Alert>
        )}
        {alert && (
          <Alert variant="destructive">
            <AlertTriangleIcon aria-hidden="true" />
            <AlertTitle>{alert.title}</AlertTitle>
            <AlertDescription>{alert.body}</AlertDescription>
          </Alert>
        )}
        <Button type="button" variant="outline" onClick={resend} disabled={resending || cooldown > 0} aria-busy={resending} className="h-11 rounded-xl text-[15px]">
          {resending && <Spinner aria-hidden="true" />}
          {resending ? "Sending…" : cooldown > 0 ? `Resend in ${cooldown}s` : "Resend verification email"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">Resend respects a 60 second cooldown.</p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Create your account"
      description="Start your academic journey with Cevo"
      footer={
        <AuthFooterLink>
          Already have an account?{" "}
          <Link href={signInHref} aria-disabled={pending} className="font-medium text-primary underline-offset-4 hover:underline aria-disabled:pointer-events-none aria-disabled:opacity-50">
            Sign in
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
        <Field data-invalid={fieldErrors.name ? true : undefined}>
          <FieldLabel htmlFor="sign-up-name">Full Name</FieldLabel>
          <Input
            id="sign-up-name"
            type="text"
            autoComplete="name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Enter your full name"
            disabled={pending}
            aria-invalid={fieldErrors.name ? true : undefined}
            aria-describedby={fieldErrors.name ? "sign-up-name-error" : undefined}
            className="h-12 rounded-xl"
          />
          {fieldErrors.name && <FieldError id="sign-up-name-error">{fieldErrors.name}</FieldError>}
        </Field>
        <Field data-invalid={fieldErrors.email ? true : undefined}>
          <FieldLabel htmlFor="sign-up-email">Email Address</FieldLabel>
          <Input
            id="sign-up-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            disabled={pending}
            aria-invalid={fieldErrors.email ? true : undefined}
            aria-describedby={fieldErrors.email ? "sign-up-email-error" : undefined}
            className="h-12 rounded-xl"
          />
          {fieldErrors.email && <FieldError id="sign-up-email-error">{fieldErrors.email}</FieldError>}
        </Field>
        <PasswordField
          id="sign-up-password"
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          disabled={pending}
          withMeter
          withChecklist
          error={fieldErrors.password ?? null}
          inputClassName="h-12 rounded-xl"
        />
        <Button type="submit" disabled={pending || !passwordOk} aria-busy={pending} aria-describedby={!passwordOk ? "sign-up-password-hint" : undefined} className="h-11 rounded-xl text-[15px]">
          {pending && <Spinner aria-hidden="true" />}
          {pending ? "Creating account…" : "Create Account"}
        </Button>
      </form>
    </AuthCard>
  );
}
