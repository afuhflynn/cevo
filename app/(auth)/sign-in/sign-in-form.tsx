"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { AlertTriangleIcon } from "lucide-react";
import { authClient, toAuthErrorDetails } from "@/lib/auth-client";
import { AuthCard, AuthFooterLink } from "../_components/auth-card";
import { PasswordField } from "../_components/password-field";

function friendlyMessage(error: unknown): { title: string; body: string } {
  const { code, message } = toAuthErrorDetails(error);
  if (code === "INVALID_EMAIL_OR_PASSWORD") {
    return {
      title: "Could not sign you in",
      body: "Incorrect email or password. Check both and try again, or reset your password.",
    };
  }
  if (code === "ACCOUNT_INACTIVE") {
    return {
      title: "Could not sign you in",
      body: "This account has been deactivated. Contact support for help.",
    };
  }
  if (code === "RATE_LIMITED") {
    return {
      title: "Too many attempts",
      body: "Too many attempts. Wait a moment, then try again.",
    };
  }
  return {
    title: "Could not sign you in",
    body: message ?? "Something went wrong. Try again.",
  };
}

function safeNextPath(raw: string | null): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/onboarding";
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
  const next = safeNextPath(rawNext);
  const packageId = packageIdProp ?? null;
  const signUpHref = packageId
    ? `/sign-up?next=${encodeURIComponent(rawNext ?? "/dashboard/billing")}&packageId=${encodeURIComponent(packageId)}`
    : rawNext
      ? `/sign-up?next=${encodeURIComponent(rawNext)}`
      : "/sign-up";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [alert, setAlert] = useState<{ title: string; body: string } | null>(null);
  const [pending, setPending] = useState(false);
  const apiErrorActive = Boolean(alert && !fieldErrors.email && !fieldErrors.password);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmedEmail = email.trim();
    const nextErrors: typeof fieldErrors = {};
    if (!trimmedEmail) nextErrors.email = "Fill the highlighted field to continue.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) nextErrors.email = "Mail looks off. Use a valid mail address and try again.";
    if (!password) nextErrors.password = "Fill the highlighted field to continue.";
    setFieldErrors(nextErrors);
    if (nextErrors.email || nextErrors.password) {
      setAlert({ title: "Check the highlighted fields", body: "Fix the inline errors and post again." });
      return;
    }
    setAlert(null);
    setPending(true);
    const { error: signInError } = await authClient.signIn.email({
      email: trimmedEmail,
      password,
    });
    setPending(false);
    if (signInError) {
      setAlert(friendlyMessage(signInError));
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
    <AuthCard
      title="Welcome back"
      description="Sign in to continue work on your academic projects."
      footer={
        <AuthFooterLink>
          New to Cevo?{" "}
          <Link href={signUpHref} aria-disabled={pending} className="font-medium text-primary underline-offset-4 hover:underline aria-disabled:pointer-events-none aria-disabled:opacity-50">
            Create an account
          </Link>
        </AuthFooterLink>
      }
    >
      {alert && (
        <Alert variant="destructive">
          <AlertTriangleIcon aria-hidden="true" />
          <AlertTitle>{alert.title}</AlertTitle>
          <AlertDescription>
            {alert.body}{" "}
            <Link href="/forgot-password" className="underline underline-offset-2">
              Reset password
            </Link>
          </AlertDescription>
        </Alert>
      )}
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <Field data-invalid={fieldErrors.email || apiErrorActive ? true : undefined}>
          <FieldLabel htmlFor="sign-in-email">Email Address</FieldLabel>
          <Input
            id="sign-in-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            disabled={pending}
            aria-invalid={fieldErrors.email || apiErrorActive ? true : undefined}
            aria-describedby={fieldErrors.email ? "sign-in-email-error" : apiErrorActive ? "sign-in-error" : undefined}
            className="h-12 rounded-xl"
          />
          {fieldErrors.email && <FieldError id="sign-in-email-error">{fieldErrors.email}</FieldError>}
        </Field>
        <PasswordField
          id="sign-in-password"
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          disabled={pending}
          placeholder="Your password"
          error={fieldErrors.password ?? null}
          inputClassName="h-12 rounded-xl"
          labelAction={
            <Link
              href="/forgot-password"
              aria-disabled={pending}
              className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline aria-disabled:pointer-events-none aria-disabled:opacity-50"
            >
              Forgot password?
            </Link>
          }
        />
        {apiErrorActive && alert && (
          <span id="sign-in-error" className="sr-only">
            {alert.body}
          </span>
        )}
        <Button type="submit" disabled={pending} aria-busy={pending} className="h-11 rounded-xl text-[15px]">
          {pending && <Spinner aria-hidden="true" />}
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthCard>
  );
}
