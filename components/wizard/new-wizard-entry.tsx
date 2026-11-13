"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";

type SessionRow = {
  id: string;
  title: string | null;
  currentStep: number;
  status: string;
  updatedAt: string;
  resumable: boolean;
};

async function fetchSessions(): Promise<{
  sessions: SessionRow[];
  totalCount: number;
}> {
  const res = await fetch("/api/wizard/sessions", { cache: "no-store" });
  if (!res.ok) throw new Error(`sessions-${res.status}`);
  return res.json();
}

export function NewWizardEntry() {
  const router = useRouter();
  const [title, setTitle] = React.useState("");
  const [qualification, setQualification] = React.useState("");
  const [department, setDepartment] = React.useState("");
  const [programme, setProgramme] = React.useState("");
  const [formError, setFormError] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);

  const sessionsQuery = useQuery({
    queryKey: ["wizard", "sessions"],
    queryFn: fetchSessions,
  });

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (title.trim().length < 3) {
      setFormError("Give your project a title of at least 3 characters.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/wizard/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          qualification: qualification.trim() || undefined,
          department: department.trim() || undefined,
          programme: programme.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setFormError(
          data?.error === "INVALID_INPUT"
            ? "Check the highlighted fields and try again."
            : "Could not start the wizard. Try again.",
        );
        return;
      }
      router.push(`/dashboard/wizard/${data.sessionId}`);
    } catch {
      setFormError("Could not start the wizard. Check your connection.");
    } finally {
      setCreating(false);
    }
  }

  const resumable = (sessionsQuery.data?.sessions ?? []).filter(
    (s) => s.resumable,
  );

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Project concept</CardTitle>
          <CardDescription>
            Step 1 of 5. This creates your workspace draft; nothing is charged
            yet. Synthesis shows its credit estimate before it runs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="wizard-title">Project title</FieldLabel>
              <Input
                id="wizard-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Mobile money fraud detection for campus vendors"
                maxLength={200}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field>
                <FieldLabel htmlFor="wizard-qual">Qualification</FieldLabel>
                <Input
                  id="wizard-qual"
                  value={qualification}
                  onChange={(e) => setQualification(e.target.value)}
                  placeholder="Bachelors"
                  maxLength={50}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="wizard-dept">Department</FieldLabel>
                <Input
                  id="wizard-dept"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Computer Science"
                  maxLength={120}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="wizard-prog">Programme</FieldLabel>
                <Input
                  id="wizard-prog"
                  value={programme}
                  onChange={(e) => setProgramme(e.target.value)}
                  placeholder="Software Engineering"
                  maxLength={120}
                />
              </Field>
            </div>
            {formError ? (
              <FieldError className="text-sm text-destructive">
                {formError}
              </FieldError>
            ) : null}
            <div>
              <Button type="submit" disabled={creating}>
                {creating ? (
                  <>
                    <Spinner /> Starting
                  </>
                ) : (
                  "Start briefing"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resume a briefing</CardTitle>
          <CardDescription>
            Pick up where you left off. Sessions expire after 30 days of
            inactivity.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sessionsQuery.isPending ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : sessionsQuery.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Sessions did not load</AlertTitle>
              <AlertDescription className="flex items-center gap-2">
                Check your connection and
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => sessionsQuery.refetch()}
                >
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          ) : resumable.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>No briefings in progress</EmptyTitle>
                <p className="text-sm text-muted-foreground">
                  Start your first briefing with the form above.
                </p>
              </EmptyHeader>
            </Empty>
          ) : (
            <ul className="flex flex-col gap-2">
              {resumable.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2"
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">
                      {s.title || "Untitled project"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Step {s.currentStep} of 5
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{s.status}</Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/dashboard/wizard/${s.id}`)}
                    >
                      Resume
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
