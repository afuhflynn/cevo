"use client";

import { AlertTriangleIcon, EyeIcon, EyeOffIcon, KeyRoundIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { authClient, toAuthErrorDetails } from "@/lib/auth-client";
import { AuthCard } from "../_components/auth-card";
import { PasswordField, isPasswordComplete } from "../_components/password-field";

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
  const [showConfirm, setShowConfirm] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [alert, setAlert] = useState<{ title: string; body: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  if (!token || expired) {
    return (
      <AuthCard
        icon={AlertTriangleIcon}
        iconTone="destructive"
        title="This link has expired"
        description="Reset links expire after 60 minutes and can only be used once. Request a fresh one below."
        footer={
          <Link href="/forgot-password" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
            Request a new reset link
          </Link>
        }
      >
        <Alert variant="destructive">
          <AlertTriangleIcon aria-hidden="true" />
          <AlertTitle>Link no longer works</AlertTitle>
          <AlertDescription>Request a new link from forgot password and try again.</AlertDescription>
        </Alert>
      </AuthCard>
    );
  }

  const canSubmit = isPasswordComplete(password) && confirm.length > 0 && !pending;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!isPasswordComplete(password)) {
      setFieldError("Complete every password rule before updating.");
      setAlert({ title: "Check the highlighted fields", body: "Fix the inline errors and post again." });
      return;
    }
    if (password !== confirm) {
      setFieldError("The two passwords do not match.");
      setAlert({ title: "Check the highlighted fields", body: "Fix the inline errors and post again." });
      return;
    }
    setFieldError(null);
    setAlert(null);
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
      setAlert({
        title: "Could not update your password",
        body: code === "RATE_LIMITED" ? "Too many attempts. Wait a moment, then try again." : (message ?? "Something went wrong. Try again."),
      });
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <AuthCard
        icon={KeyRoundIcon}
        title="Password updated"
        description="Your new password is set. Sign in with it to continue."
        footer={
          <Link href="/sign-in" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
            Go to sign in
          </Link>
        }
      />
    );
  }

  return (
    <AuthCard
      title="Choose a new password"
      description="Pick something strong. At least 12 characters, up to 128."
    >
      {alert && (
        <Alert variant="destructive">
          <AlertTriangleIcon aria-hidden="true" />
          <AlertTitle>{alert.title}</AlertTitle>
          <AlertDescription>{alert.body}</AlertDescription>
        </Alert>
      )}
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <PasswordField
          id="reset-password"
          label="New password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          disabled={pending}
          withMeter
          withChecklist
          inputClassName="h-12 rounded-xl"
        />
        <Field data-invalid={fieldError ? true : undefined}>
          <FieldLabel htmlFor="reset-password-confirm">Confirm new password</FieldLabel>
          <div className="relative">
            <Input
              id="reset-password-confirm"
              type={showConfirm ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={128}
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              placeholder="Repeat your new password"
              disabled={pending}
              aria-invalid={fieldError ? true : undefined}
              aria-describedby={fieldError ? "reset-confirm-error" : undefined}
              className="h-12 rounded-xl pr-11"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((s) => !s)}
              disabled={pending}
              aria-label={showConfirm ? "Hide password" : "Show password"}
              aria-pressed={showConfirm}
              className="absolute top-1/2 right-2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50"
            >
              {showConfirm ? (
                <EyeOffIcon className="size-4" aria-hidden="true" />
              ) : (
                <EyeIcon className="size-4" aria-hidden="true" />
              )}
            </button>
          </div>
          {fieldError && <FieldError id="reset-confirm-error">{fieldError}</FieldError>}
        </Field>
        <Button type="submit" disabled={!canSubmit} aria-busy={pending} className="h-11 rounded-xl text-[15px]">
          {pending && <Spinner aria-hidden="true" />}
          {pending ? "Updating…" : "Update password"}
        </Button>
      </form>
    </AuthCard>
  );
}
