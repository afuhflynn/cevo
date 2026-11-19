"use client";

import * as React from "react";
import { openSupportTicket } from "@/app/dashboard/settings/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { authClient, toAuthErrorDetails } from "@/lib/auth-client";
import { describeDevice } from "@/lib/settings";

type SessionRow = {
  id: string;
  token: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  updatedAt: string;
  current: boolean;
};

function timeAgo(iso: string) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "recently";
  const seconds = Math.round((then - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const divisions = [
    { amount: 60, name: "second" },
    { amount: 60, name: "minute" },
    { amount: 24, name: "hour" },
    { amount: 7, name: "day" },
    { amount: 4.34524, name: "week" },
    { amount: 12, name: "month" },
    { amount: Number.POSITIVE_INFINITY, name: "year" },
  ] as const;
  let duration = seconds;
  for (const { amount, name } of divisions) {
    if (Math.abs(duration) < amount) {
      return rtf.format(Math.round(duration), name);
    }
    duration /= amount;
  }
  return rtf.format(Math.round(duration), "year");
}

function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  function reset() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirm("");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 12) {
      setError("Use at least 12 characters for the new password.");
      return;
    }
    if (newPassword !== confirm) {
      setError("The new passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      if (result.error) {
        const details = toAuthErrorDetails(result.error);
        setError(
          details.code === "INVALID_PASSWORD"
            ? "The current password is incorrect."
            : (details.message ?? "Could not change the password. Try again."),
        );
        return;
      }
      toast.success(
        "Password changed. Other devices were signed out for safety.",
        { timeout: 4000 },
      );
      reset();
      onOpenChange(false);
    } catch {
      setError("Could not change the password. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !busy) {
          reset();
          onOpenChange(false);
        } else if (o) {
          onOpenChange(true);
        }
      }}
    >
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Change password</DialogTitle>
          <DialogDescription>
            You will stay signed in on this device. Other devices are signed out
            automatically.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="sec-current">Current password</FieldLabel>
            <Input
              id="sec-current"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="h-11 rounded-xl"
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="sec-new">New password</FieldLabel>
            <Input
              id="sec-new"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="h-11 rounded-xl"
              required
              minLength={12}
              aria-describedby="sec-new-hint"
            />
            <p id="sec-new-hint" className="text-xs text-muted-foreground">
              At least 12 characters.
            </p>
          </Field>
          <Field>
            <FieldLabel htmlFor="sec-confirm">Confirm new password</FieldLabel>
            <Input
              id="sec-confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="h-11 rounded-xl"
              required
            />
          </Field>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy} aria-busy={busy}>
              {busy && <Spinner aria-hidden="true" />}
              {busy ? "Changing…" : "Change password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteRequestDialog({
  email,
  open,
  onOpenChange,
}: {
  email: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [done, setDone] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (reason.trim().length < 10) {
      setError("Tell us briefly why (at least 10 characters).");
      return;
    }
    setBusy(true);
    try {
      const result = await openSupportTicket({
        subject: `Delete my account (${email})`,
        category: "account",
        message: `Account deletion request for ${email}.\n\nReason: ${reason.trim()}`,
      });
      if (!result.ok) {
        setError("Could not send the request. Try again.");
        return;
      }
      setDone(true);
    } catch {
      setError("Could not send the request. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!busy) onOpenChange(o);
        if (!o) {
          setDone(false);
          setReason("");
          setError(null);
        }
      }}
    >
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Request account deletion</DialogTitle>
          <DialogDescription>
            Deletion is permanent: projects, sources, credits and history are
            removed. Support reviews every request and confirms by email before
            anything is deleted.
          </DialogDescription>
        </DialogHeader>
        {done ? (
          <Alert>
            <AlertTitle>Request received</AlertTitle>
            <AlertDescription>
              Support will confirm by email before deleting anything. Your
              account stays active until then.
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="sec-delete-reason">
                Why are you leaving?
              </FieldLabel>
              <Input
                id="sec-delete-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Optional context for the support team"
                className="h-11 rounded-xl"
              />
            </Field>
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => onOpenChange(false)}
              >
                Keep my account
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={busy}
                aria-busy={busy}
              >
                {busy && <Spinner aria-hidden="true" />}
                {busy ? "Sending…" : "Send deletion request"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function SettingsSecurityPanel({ userEmail }: { userEmail: string }) {
  const [pwOpen, setPwOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [activityOpen, setActivityOpen] = React.useState(false);
  const [sessions, setSessions] = React.useState<SessionRow[] | null>(null);
  const [loadingSessions, setLoadingSessions] = React.useState(false);
  const [sessionsError, setSessionsError] = React.useState<string | null>(null);
  const [revoking, setRevoking] = React.useState<string | null>(null);

  async function loadSessions() {
    setLoadingSessions(true);
    setSessionsError(null);
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), 12000),
    );
    try {
      const current = (await Promise.race([
        authClient.getSession(),
        timeout,
      ])) as unknown as {
        data: { session?: { token?: string } } | null;
      } | null;
      const currentToken = current?.data?.session?.token ?? null;
      const listed = (await Promise.race([
        authClient.listSessions(),
        timeout,
      ])) as unknown as {
        data?: Array<{
          id: string;
          token: string;
          ipAddress?: string | null;
          userAgent?: string | null;
          createdAt: Date | string;
          updatedAt: Date | string;
        }>;
      } | null;
      const items = listed?.data ?? [];
      setSessions(
        items.map((s) => ({
          id: s.id,
          token: s.token,
          ipAddress: s.ipAddress ?? null,
          userAgent: s.userAgent ?? null,
          createdAt: new Date(s.createdAt).toISOString(),
          updatedAt: new Date(s.updatedAt).toISOString(),
          current: !!currentToken && s.token === currentToken,
        })),
      );
    } catch {
      setSessionsError("Could not load sessions. Try again.");
    } finally {
      setLoadingSessions(false);
    }
  }

  async function handleRevoke(token: string) {
    setRevoking(token);
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), 12000),
    );
    try {
      const result = (await Promise.race([
        authClient.revokeSession({ token }),
        timeout,
      ])) as unknown as { error?: unknown } | null;
      if (result?.error) {
        toast.error("Could not revoke that session.", { timeout: 4000 });
        return;
      }
      setSessions((prev) => prev?.filter((s) => s.token !== token) ?? prev);
      toast.success("Session revoked.", { timeout: 4000 });
    } catch {
      toast.error("Could not revoke that session.", { timeout: 4000 });
    } finally {
      setRevoking(null);
    }
  }

  return (
    <section
      aria-label="Security settings"
      className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card p-5 sm:p-8"
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="flex min-w-0 flex-col gap-1">
            <span className="text-[15px] font-bold">Password</span>
            <span className="text-sm text-muted-foreground">
              Change your password regularly to keep your account safe.
            </span>
          </span>
          <Button
            type="button"
            variant="outline"
            onClick={() => setPwOpen(true)}
            className="h-11 shrink-0 rounded-xl px-5 text-sm"
          >
            Change Password
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="flex min-w-0 flex-col gap-1">
            <span className="text-[15px] font-bold">
              Two-Factor Authentication
            </span>
            <span className="text-sm text-muted-foreground">
              Coming soon — app-based codes are not available yet.
            </span>
          </span>
          <Switch
            checked={false}
            disabled
            aria-label="Two-factor authentication (coming soon)"
          />
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="flex min-w-0 flex-col gap-1">
              <span className="text-[15px] font-bold">Login Activity</span>
              <span className="text-sm text-muted-foreground">
                Review your recent login activity.
              </span>
            </span>
            <Button
              type="button"
              variant="outline"
              aria-expanded={activityOpen}
              onClick={() => {
                const next = !activityOpen;
                setActivityOpen(next);
                if (next && sessions === null) void loadSessions();
              }}
              className="h-11 shrink-0 gap-2 rounded-xl px-5 text-sm"
            >
              View Activity
              <span aria-hidden="true">→</span>
            </Button>
          </div>
          {activityOpen ? (
            <div className="rounded-2xl border border-border/60">
              {loadingSessions ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Loading sessions…
                </p>
              ) : sessionsError ? (
                <div className="flex items-center justify-between gap-3 px-4 py-4">
                  <p role="alert" className="text-sm text-destructive">
                    {sessionsError}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void loadSessions()}
                  >
                    Retry
                  </Button>
                </div>
              ) : sessions && sessions.length > 0 ? (
                <ul className="divide-y divide-border/40">
                  {sessions.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center justify-between gap-3 px-4 py-3"
                    >
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate text-sm font-medium">
                          {describeDevice(s.userAgent)}
                          {s.current ? " · This device" : ""}
                        </span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {s.ipAddress ?? "Unknown IP"} · active{" "}
                          {timeAgo(s.updatedAt)}
                        </span>
                      </span>
                      {s.current ? (
                        <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                          Current
                        </span>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={revoking === s.token}
                          onClick={() => void handleRevoke(s.token)}
                        >
                          {revoking === s.token ? "Revoking…" : "Revoke"}
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No sessions found. Sign out and back in if this looks wrong.
                </p>
              )}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="flex min-w-0 flex-col gap-1">
            <span className="text-[15px] font-bold">Account Deletion</span>
            <span className="text-sm text-muted-foreground">
              Permanently delete your account and data.
            </span>
          </span>
          <Button
            type="button"
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
            className="h-11 shrink-0 rounded-xl px-5 text-sm"
          >
            Delete Account
          </Button>
        </div>
      </div>

      <ChangePasswordDialog open={pwOpen} onOpenChange={setPwOpen} />
      <DeleteRequestDialog
        email={userEmail}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </section>
  );
}
