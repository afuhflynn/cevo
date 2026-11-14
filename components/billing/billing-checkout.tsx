"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Package = {
  id: string;
  name: string;
  priceXaf: number;
  credits: number;
  isPopular: boolean;
};

type PaymentState =
  | { kind: "idle" }
  | { kind: "starting" }
  | {
      kind: "waiting";
      paymentId: string;
      expiresAt: string;
      status: string;
      failureReason: string | null;
    }
  | { kind: "success"; paymentId: string }
  | { kind: "error"; message: string };

function newClientKey(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `ck-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const POLL_INTERVAL_MS = 5000;

export function BillingCheckout({
  packages,
  initialPackageId,
}: {
  packages: Package[];
  initialPackageId?: string | null;
}) {
  const requestedId = initialPackageId ?? null;
  const initial =
    (requestedId && packages.find((p) => p.id === requestedId)) ||
    packages.find((p) => p.isPopular) ||
    packages[0] ||
    null;
  const [selected, setSelected] = useState<Package | null>(initial);
  const [unknownPackage, setUnknownPackage] = useState(
    requestedId && !packages.some((p) => p.id === requestedId)
      ? requestedId
      : null,
  );
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [state, setState] = useState<PaymentState>({ kind: "idle" });
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  const pollStatus = useCallback(
    async (paymentId: string) => {
      try {
        const res = await fetch(`/api/billing/payments/${paymentId}`);
        if (!res.ok) return;
        const data = (await res.json()) as {
          payment: { status: string; failureReason: string | null };
        };
        const status = data.payment.status;
        if (status === "SUCCESSFUL") {
          stopPolling();
          setState({ kind: "success", paymentId });
        } else if (status === "FAILED" || status === "EXPIRED") {
          stopPolling();
          setState({
            kind: "waiting",
            paymentId,
            expiresAt: "",
            status,
            failureReason: data.payment.failureReason,
          });
        } else {
          setState((prev) =>
            prev.kind === "waiting" && prev.paymentId === paymentId
              ? { ...prev, status, failureReason: data.payment.failureReason }
              : prev,
          );
        }
      } catch {
        // Keep polling through transient network errors.
      }
    },
    [stopPolling],
  );

  const startCheckout = useCallback(async () => {
    if (!selected) return;
    setPhoneError(null);
    const trimmed = phone.trim();
    if (!trimmed) {
      setPhoneError(
        "Enter the mobile money number that will approve the prompt.",
      );
      return;
    }
    setState({ kind: "starting" });
    try {
      const res = await fetch("/api/billing/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: selected.id,
          phone: trimmed,
          clientKey: newClientKey(),
        }),
      });
      const data = (await res.json()) as {
        paymentId?: string;
        expiresAt?: string;
        error?: string;
      };
      if (res.status === 422 && data.error === "INVALID_PHONE") {
        setPhoneError(
          "Use a Cameroonian number: 9 digits starting with 6, or 237 followed by those digits.",
        );
        setState({ kind: "idle" });
        return;
      }
      if (!res.ok || !data.paymentId) {
        setState({
          kind: "error",
          message:
            data.error === "PACKAGE_UNAVAILABLE"
              ? "That package is no longer available. Pick another package."
              : "Could not start the payment. Check your connection and try again.",
        });
        return;
      }
      const paymentId = data.paymentId;
      setState({
        kind: "waiting",
        paymentId,
        expiresAt: data.expiresAt ?? "",
        status: "PENDING",
        failureReason: null,
      });
      stopPolling();
      pollTimer.current = setInterval(() => {
        void pollStatus(paymentId);
      }, POLL_INTERVAL_MS);
    } catch {
      setState({
        kind: "error",
        message:
          "Could not start the payment. Check your connection and try again.",
      });
    }
  }, [phone, pollStatus, selected, stopPolling]);

  const retry = useCallback(() => {
    stopPolling();
    setState({ kind: "idle" });
  }, [stopPolling]);

  if (packages.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No credit packages are available right now. Check back later.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {unknownPackage && (
        <p
          role="status"
          className="rounded-xl border border-amber-600/40 bg-amber-500/10 px-4 py-3 text-sm"
        >
          That package is no longer available. Pick another package below.
        </p>
      )}
      <fieldset>
        <legend className="text-sm font-medium">Choose a package</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {packages.map((p) => {
            const active = selected?.id === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setSelected(p);
                  setUnknownPackage(null);
                }}
                aria-pressed={active}
                className={`relative flex flex-col gap-1 rounded-xl border p-4 text-left transition-colors ${
                  active
                    ? "border-primary bg-primary/5"
                    : "border-border bg-background hover:border-primary/50"
                }`}
              >
                {p.isPopular && (
                  <span className="absolute -top-2.5 left-3 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                    Popular
                  </span>
                )}
                <span className="font-medium">{p.name}</span>
                <span className="text-2xl font-semibold">
                  {p.priceXaf.toLocaleString("fr-CM")} XAF
                </span>
                <span className="text-sm text-muted-foreground">
                  {p.credits} credits
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="flex max-w-md flex-col gap-2">
        <label htmlFor="billing-phone" className="text-sm font-medium">
          Mobile money number
        </label>
        <input
          id="billing-phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="6XXXXXXXX or 2376XXXXXXXX"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
          aria-invalid={phoneError ? true : undefined}
          aria-describedby={
            phoneError ? "billing-phone-error" : "billing-phone-hint"
          }
        />
        {phoneError ? (
          <p
            id="billing-phone-error"
            role="alert"
            className="text-sm text-destructive"
          >
            {phoneError}
          </p>
        ) : (
          <p id="billing-phone-hint" className="text-sm text-muted-foreground">
            MTN MoMo or Orange Money. You approve a prompt on this phone.
          </p>
        )}
      </div>

      {state.kind === "idle" ||
      state.kind === "error" ||
      state.kind === "starting" ? (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => void startCheckout()}
            disabled={state.kind === "starting" || !selected}
            className="inline-flex h-10 max-w-md items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {state.kind === "starting"
              ? "Starting payment…"
              : selected
                ? `Buy ${selected.name} · ${selected.priceXaf.toLocaleString("fr-CM")} XAF`
                : "Buy credits"}
          </button>
          {state.kind === "error" && (
            <p role="alert" className="text-sm text-destructive">
              {state.message}
            </p>
          )}
        </div>
      ) : null}

      {state.kind === "waiting" && (
        <div
          className="flex max-w-md flex-col gap-2 rounded-xl border border-border p-4"
          aria-live="polite"
        >
          {state.status === "FAILED" || state.status === "EXPIRED" ? (
            <>
              <p className="font-medium">
                {state.status === "EXPIRED"
                  ? "This payment expired."
                  : "This payment failed."}
              </p>
              {state.failureReason && (
                <p className="text-sm text-muted-foreground">
                  {state.failureReason}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                No credits were taken or added. Starting again creates a new
                payment; the old one stays as a record.
              </p>
              <button
                type="button"
                onClick={retry}
                className="mt-1 inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
              >
                Try again with a new payment
              </button>
            </>
          ) : (
            <>
              <p className="font-medium">Approve the prompt on your phone…</p>
              <p className="text-sm text-muted-foreground">
                A collect request was sent to {phone.trim() || "your number"}.
                Enter your MoMo PIN on the phone to finish. This page checks
                automatically; you can wait here.
              </p>
              <p className="text-sm text-muted-foreground">
                Status: {state.status}
                {state.expiresAt
                  ? ` · expires ${new Date(state.expiresAt).toLocaleTimeString()}`
                  : ""}
              </p>
              <button
                type="button"
                onClick={() => void pollStatus(state.paymentId)}
                className="mt-1 inline-flex h-9 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium"
              >
                Check now
              </button>
            </>
          )}
        </div>
      )}

      {state.kind === "success" && (
        <div
          className="flex max-w-md flex-col gap-2 rounded-xl border border-green-600/40 bg-green-500/10 p-4"
          role="status"
        >
          <p className="font-medium">Payment confirmed. Credits added.</p>
          <p className="text-sm text-muted-foreground">
            Your balance is updated. Starting again is unnecessary; this payment
            cannot credit twice.
          </p>
          <a
            href="/dashboard"
            className="mt-1 inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Back to dashboard
          </a>
        </div>
      )}
    </div>
  );
}
