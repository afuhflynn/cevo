"use client";

import * as React from "react";
import {
  getPreferences,
  savePreferences,
} from "@/app/dashboard/settings/actions";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import type { NotificationPreferenceState } from "@/lib/notification-preferences";

const ROWS: {
  key: keyof NotificationPreferenceState;
  title: string;
  body: string;
}[] = [
  {
    key: "productUpdates",
    title: "Product updates",
    body: "New features, template releases, and improvements to Cevo.",
  },
  {
    key: "billingAlerts",
    title: "Billing alerts",
    body: "Low-balance warnings and payment confirmations.",
  },
  {
    key: "researchDigests",
    title: "Research digests",
    body: "Occasional round-ups of new sources and verified papers.",
  },
];

export function SettingsNotificationsPanel({
  initial,
}: {
  initial: NotificationPreferenceState;
}) {
  const [prefs, setPrefs] =
    React.useState<NotificationPreferenceState>(initial);
  const [saving, setSaving] = React.useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const result = await savePreferences(prefs);
      if (!result.ok) {
        toast.error("Could not save. Try again.", { timeout: 4000 });
        return;
      }
      toast.success("Notification preferences saved.", { timeout: 4000 });
    } catch {
      toast.error("Could not save. Check your connection and try again.", {
        timeout: 4000,
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleRefresh() {
    try {
      const result = await getPreferences();
      if (result.ok) setPrefs(result.preferences);
    } catch {
      /* best effort — keep local state on failure */
    }
  }

  return (
    <section
      aria-label="Notification preferences"
      className="rounded-2xl border border-border/60 bg-card p-5 sm:p-8"
    >
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          Notifications
        </h1>
        <p className="text-sm text-muted-foreground">
          Choose what Cevo tells you about. Changes apply to future emails.
        </p>
      </div>

      <ul className="mt-6 flex flex-col divide-y divide-border/40 rounded-2xl border border-border/60">
        {ROWS.map((row) => (
          <li
            key={row.key}
            className="flex items-center justify-between gap-4 px-4 py-4 sm:px-5"
          >
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[15px] font-bold">{row.title}</span>
              <span className="text-sm text-muted-foreground">{row.body}</span>
            </span>
            <Switch
              checked={prefs[row.key]}
              onCheckedChange={(v) => setPrefs((p) => ({ ...p, [row.key]: v }))}
              aria-label={row.title}
            />
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={() => void handleRefresh()}
          className="h-11 rounded-xl px-4 text-sm"
        >
          Reload saved
        </Button>
        <Button
          type="button"
          disabled={saving}
          aria-busy={saving}
          onClick={() => void handleSave()}
          className="h-11 rounded-xl px-7 text-[15px]"
        >
          {saving && <Spinner aria-hidden="true" />}
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </section>
  );
}
