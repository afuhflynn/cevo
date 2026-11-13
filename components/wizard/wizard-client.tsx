"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const FIELD_ORDER = [
  "background",
  "problem",
  "aim",
  "objectives",
  "questions",
  "scope",
  "limitations",
  "methodology",
  "outcomes",
] as const;

const FIELD_LABELS: Record<string, string> = {
  background: "Background",
  problem: "Problem statement",
  aim: "Aim",
  objectives: "Objectives",
  questions: "Research questions",
  scope: "Scope",
  limitations: "Limitations",
  methodology: "Methodology",
  outcomes: "Expected outcomes",
};

type Turn = {
  id: string;
  fieldKey: string;
  promptText: string;
  answerText: string;
  followupText: string | null;
  isSufficient: boolean;
  createdAt: string;
};

type SessionPayload = {
  session: {
    id: string;
    currentStep: number;
    status: string;
    readiness: Record<string, boolean>;
    blocked: string[];
    estimate: number;
    balance: number;
    sufficientBalance: boolean;
    suggestedTemplate: {
      templateId: string;
      templateVersionId: string;
      title: string;
      reason: string;
    } | null;
    currentBriefVersion: number;
    expiresAt: string;
  };
  turns: Turn[];
};

async function fetchSession(sessionId: string): Promise<SessionPayload> {
  const res = await fetch(`/api/wizard/sessions/${sessionId}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`wizard-${res.status}`);
  return res.json();
}

function BriefPreview({ payload }: { payload: Record<string, unknown> }) {
  const entries = FIELD_ORDER.map((key) => {
    const storageKey =
      key === "problem"
        ? "problemStatement"
        : key === "outcomes"
          ? "expectedOutcomes"
          : key;
    return { key, value: payload[storageKey] };
  });
  return (
    <div className="flex flex-col gap-4">
      {entries.map(({ key, value }) => (
        <div key={key} className="flex flex-col gap-1">
          <h4 className="text-sm font-semibold">{FIELD_LABELS[key]}</h4>
          {Array.isArray(value) ? (
            <ul className="list-disc pl-5 text-sm text-muted-foreground">
              {value.map((item) => (
                <li key={String(item).slice(0, 48)}>{String(item)}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              {typeof value === "string" && value.length > 0
                ? value
                : "Not present in this preview."}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

export function WizardClient({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = React.useState(3);
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [savingField, setSavingField] = React.useState<string | null>(null);
  const [synthesizing, setSynthesizing] = React.useState(false);
  const [partial, setPartial] = React.useState<Record<string, unknown> | null>(
    null,
  );
  const [synthMessage, setSynthMessage] = React.useState<string | null>(null);
  const [versions, setVersions] = React.useState<
    { version: number; modelId: string | null; current: boolean }[]
  >([]);
  const [viewVersion, setViewVersion] = React.useState<number | null>(null);
  const [viewPayload, setViewPayload] = React.useState<Record<
    string,
    unknown
  > | null>(null);
  const [restoring, setRestoring] = React.useState(false);
  const [templateOverride, setTemplateOverride] = React.useState<string>("");
  const [templateOptions, setTemplateOptions] = React.useState<
    { id: string; title: string; version: number }[]
  >([]);
  const [approving, setApproving] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [approveError, setApproveError] = React.useState<string | null>(null);
  const idempotencyKey = React.useMemo(
    () =>
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    [],
  );

  const sessionQuery = useQuery({
    queryKey: ["wizard", "session", sessionId],
    queryFn: () => fetchSession(sessionId),
  });

  const data = sessionQuery.data;
  const serverStep = data?.session.currentStep ?? 1;
  const [dirtyFields, setDirtyFields] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (!data) return;
    setStep((prev) => Math.min(Math.max(prev, 1), Math.max(serverStep, 1)));
    const serverAnswers: Record<string, string> = {};
    for (const t of data.turns) serverAnswers[t.fieldKey] = t.answerText;
    setAnswers((prev) => {
      const next = { ...prev };
      for (const [key, value] of Object.entries(serverAnswers)) {
        if (!dirtyFields.has(key)) next[key] = value;
      }
      return next;
    });
    if (data.session.currentBriefVersion > 0) {
      setViewVersion((prev) => prev ?? data.session.currentBriefVersion);
    }
  }, [data, serverStep, dirtyFields]);

  async function refresh() {
    await queryClient.invalidateQueries({
      queryKey: ["wizard", "session", sessionId],
    });
  }

  async function saveField(fieldKey: string) {
    const answerText = (answers[fieldKey] ?? "").trim();
    if (!answerText) return;
    setSavingField(fieldKey);
    try {
      const res = await fetch(`/api/wizard/sessions/${sessionId}/turns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fieldKey, answerText }),
      });
      if (!res.ok) return;
      setDirtyFields((prev) => {
        const next = new Set(prev);
        next.delete(fieldKey);
        return next;
      });
      await refresh();
    } finally {
      setSavingField(null);
    }
  }

  async function loadVersions() {
    const res = await fetch(`/api/wizard/sessions/${sessionId}/versions`, {
      cache: "no-store",
    });
    if (!res.ok) return;
    const json = await res.json();
    setVersions(json.versions ?? []);
  }

  async function loadTemplates() {
    const res = await fetch("/api/wizard/templates", { cache: "no-store" });
    if (!res.ok) return;
    const json = await res.json();
    setTemplateOptions(json.templates ?? []);
  }

  async function loadVersionPayload(version: number) {
    setViewVersion(version);
    setViewPayload(null);
    const res = await fetch(
      `/api/wizard/sessions/${sessionId}/versions/${version}`,
      { cache: "no-store" },
    );
    if (!res.ok) return;
    const json = await res.json();
    setViewPayload((json.payload ?? null) as Record<string, unknown> | null);
  }

  async function handleSynthesize() {
    setSynthesizing(true);
    setSynthMessage(null);
    setPartial(null);
    try {
      const res = await fetch(`/api/wizard/sessions/${sessionId}/synthesize`, {
        method: "POST",
      });
      if (res.status === 422) {
        const json = await res.json().catch(() => null);
        const blocked = (json?.blocked ?? []).join(", ");
        setSynthMessage(
          blocked
            ? `Answer these fields first: ${blocked}.`
            : "Some answers are still too thin for synthesis.",
        );
        return;
      }
      if (res.status === 402) {
        setSynthMessage(
          "Not enough credits for synthesis. Top up your wallet and try again.",
        );
        return;
      }
      if (res.status === 429) {
        setSynthMessage("Daily synthesis limit reached. Try again tomorrow.");
        return;
      }
      if (!res.ok || !res.body) {
        setSynthMessage("Synthesis could not start. Try again.");
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as {
            type: string;
            partial?: Record<string, unknown>;
            version?: number;
            code?: string;
            message?: string;
          };
          if (event.type === "partial" && event.partial) {
            setPartial({ ...event.partial });
          } else if (event.type === "done") {
            setSynthMessage(
              `Draft v${event.version} saved. Review it below before approving.`,
            );
          } else if (event.type === "error") {
            setSynthMessage(
              event.message ?? "Synthesis failed and credits were refunded.",
            );
          } else if (event.type === "aborted") {
            setSynthMessage("Synthesis stopped. Your last draft is intact.");
          }
        }
      }
      await refresh();
      await loadVersions();
    } catch {
      setSynthMessage("Connection broke mid stream. Your draft is intact.");
    } finally {
      setSynthesizing(false);
    }
  }

  async function handleRestore(version: number) {
    setRestoring(true);
    try {
      const res = await fetch(
        `/api/wizard/sessions/${sessionId}/versions/${version}/restore`,
        { method: "POST" },
      );
      if (!res.ok) return;
      await refresh();
      await loadVersions();
      const json = await res.json();
      if (json?.version) await loadVersionPayload(json.version);
    } finally {
      setRestoring(false);
    }
  }

  async function handleApprove() {
    setApproving(true);
    setApproveError(null);
    try {
      const res = await fetch(`/api/wizard/sessions/${sessionId}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-idempotency-key": idempotencyKey,
        },
        body: JSON.stringify({
          briefVersion: data?.session.currentBriefVersion ?? 1,
          templateVersionId: templateOverride || undefined,
        }),
      });
      const json = await res.json().catch(() => null);
      if (res.status === 409 && json?.projectId) {
        router.push(`/dashboard/projects/${json.projectId}`);
        return;
      }
      if (!res.ok) {
        setApproveError(
          json?.error === "READINESS_FAILED"
            ? `Readiness changed: ${((json?.blocked ?? []) as string[]).join(", ")}. Synthesize again.`
            : json?.error === "STALE_VERSION"
              ? "A newer draft exists. Review the latest version first."
              : "Approval failed. No chapters were created; try again.",
        );
        return;
      }
      router.push(`/dashboard/projects/${json.projectId}`);
    } catch {
      setApproveError("Approval failed. No chapters were created; try again.");
    } finally {
      setApproving(false);
    }
  }

  if (sessionQuery.isPending) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (sessionQuery.isError || !data) {
    return (
      <Alert variant="destructive">
        <AlertTitle>The briefing did not load</AlertTitle>
        <AlertDescription className="flex items-center gap-2">
          Check your connection and
          <Button
            variant="outline"
            size="sm"
            onClick={() => sessionQuery.refetch()}
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const { session, turns } = data;
  const turnByField = new Map(turns.map((t) => [t.fieldKey, t]));
  const progress = Math.round((Math.min(step, 5) / 5) * 100);
  const canGo = (target: number) => target <= Math.max(serverStep, 1);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h1 className="font-serif text-3xl tracking-tight">
            Project briefing
          </h1>
          <Badge variant="secondary">{session.status}</Badge>
        </div>
        <Progress value={progress} />
        <Breadcrumb>
          <BreadcrumbList className="flex flex-wrap gap-2">
            {["Concept", "Context", "Briefing", "Review", "Approval"].map(
              (label, i) => {
                const n = i + 1;
                return (
                  <BreadcrumbItem key={label}>
                    <Button
                      variant={step === n ? "default" : "ghost"}
                      size="sm"
                      disabled={!canGo(n)}
                      onClick={() => setStep(n)}
                    >
                      {n}. {label}
                    </Button>
                  </BreadcrumbItem>
                );
              },
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {step === 1 ? (
        <Card>
          <CardHeader>
            <CardTitle>1. Project concept</CardTitle>
            <CardDescription>
              Your starting idea. It is saved with this session and travels into
              the brief.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm">
              This session was created from your concept on the previous screen.
              Move to academic context when you are ready; you can always come
              back.
            </p>
            <div>
              <Button onClick={() => setStep(2)} disabled={!canGo(2)}>
                Continue to context
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card>
          <CardHeader>
            <CardTitle>2. Academic context</CardTitle>
            <CardDescription>
              We suggest a template from your qualification and department. The
              choice locks at approval.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {session.suggestedTemplate ? (
              <Alert>
                <AlertTitle>
                  Suggested: {session.suggestedTemplate.title}
                </AlertTitle>
                <AlertDescription>
                  {session.suggestedTemplate.reason}
                </AlertDescription>
              </Alert>
            ) : (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>No close template match</EmptyTitle>
                  <p className="text-sm text-muted-foreground">
                    Keep the workspace default, or pick one below. Approval
                    still provisions the standard chapter tree.
                  </p>
                </EmptyHeader>
              </Empty>
            )}
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">
                Override template (optional)
              </span>
              <Select
                value={templateOverride}
                onValueChange={(v) => setTemplateOverride(v ?? "")}
                onOpenChange={(open) => {
                  if (open && templateOptions.length === 0) loadTemplates();
                }}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      session.suggestedTemplate?.title ?? "Keep suggestion"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {templateOptions.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.title} (v{t.version})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={() => setStep(3)}>Continue to briefing</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 3 ? (
        <Card>
          <CardHeader>
            <CardTitle>3. Conversational briefing</CardTitle>
            <CardDescription>
              Answer each prompt. A green badge means the answer is sufficient
              for synthesis; follow ups appear when it is thin (max 2 per
              field).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {session.blocked.length > 0 ? (
              <Alert>
                <AlertTitle>Still needed for synthesis</AlertTitle>
                <AlertDescription>
                  {session.blocked.join(", ")}
                </AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <AlertTitle>Ready for synthesis</AlertTitle>
                <AlertDescription>
                  Every field meets its minimum. Continue to review.
                </AlertDescription>
              </Alert>
            )}
            {FIELD_ORDER.map((fieldKey) => {
              const turn = turnByField.get(fieldKey);
              const ready = session.readiness[fieldKey] === true;
              return (
                <div
                  key={fieldKey}
                  className="flex flex-col gap-2 rounded-lg border border-border p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">
                      {FIELD_LABELS[fieldKey]}
                    </span>
                    <Badge variant={ready ? "default" : "outline"}>
                      {ready ? "Sufficient" : "Needs detail"}
                    </Badge>
                  </div>
                  {turn?.promptText ? (
                    <p className="text-sm text-muted-foreground">
                      {turn.promptText}
                    </p>
                  ) : null}
                  <Textarea
                    value={answers[fieldKey] ?? ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      setDirtyFields((prev) => new Set(prev).add(fieldKey));
                      setAnswers((prev) => ({
                        ...prev,
                        [fieldKey]: value,
                      }));
                    }}
                    rows={4}
                    placeholder={
                      fieldKey === "objectives" || fieldKey === "questions"
                        ? "One item per line, at least three lines."
                        : "Write freely; the counter is server enforced."
                    }
                  />
                  {turn?.followupText ? (
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      Follow up: {turn.followupText}
                    </p>
                  ) : null}
                  <div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={
                        savingField === fieldKey ||
                        (answers[fieldKey] ?? "").trim().length === 0
                      }
                      onClick={() => saveField(fieldKey)}
                    >
                      {savingField === fieldKey ? (
                        <>
                          <Spinner /> Saving
                        </>
                      ) : (
                        "Save answer"
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button
                onClick={() => setStep(4)}
                disabled={session.blocked.length > 0 && serverStep < 4}
              >
                Continue to review
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 4 ? (
        <Card>
          <CardHeader>
            <CardTitle>4. Brief review</CardTitle>
            <CardDescription>
              Estimate {session.estimate} credits · balance {session.balance}{" "}
              credits ·{" "}
              {session.sufficientBalance
                ? "covered"
                : "top up before synthesis"}
              . Failed runs refund automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleSynthesize}
                disabled={
                  synthesizing ||
                  (!session.sufficientBalance &&
                    session.balance < session.estimate)
                }
              >
                {synthesizing ? (
                  <>
                    <Spinner /> Synthesizing
                  </>
                ) : (
                  `Synthesize brief (${session.estimate} credits)`
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  loadVersions();
                  if (session.currentBriefVersion > 0 && viewVersion === null) {
                    loadVersionPayload(session.currentBriefVersion);
                  }
                }}
              >
                Version history
              </Button>
            </div>
            {synthMessage ? (
              <Alert>
                <AlertDescription>{synthMessage}</AlertDescription>
              </Alert>
            ) : null}
            {partial ? (
              <div className="rounded-lg border border-border p-3">
                <h4 className="mb-2 text-sm font-semibold">
                  Live preview (streaming)
                </h4>
                <BriefPreview payload={partial} />
              </div>
            ) : null}
            {versions.length > 0 ? (
              <Tabs defaultValue={String(viewVersion ?? versions[0]?.version)}>
                <TabsList className="flex flex-wrap">
                  {versions.map((v) => (
                    <TabsTrigger
                      key={v.version}
                      value={String(v.version)}
                      onClick={() => loadVersionPayload(v.version)}
                    >
                      v{v.version}
                      {v.current ? " (current)" : ""}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {versions.map((v) => (
                  <TabsContent key={v.version} value={String(v.version)}>
                    {viewVersion === v.version && viewPayload ? (
                      <div className="flex flex-col gap-3">
                        <BriefPreview payload={viewPayload} />
                        {!v.current ? (
                          <div>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={restoring}
                              onClick={() => handleRestore(v.version)}
                            >
                              {restoring ? "Restoring" : "Restore this version"}
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Select this tab to load v{v.version}.
                      </p>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            ) : session.currentBriefVersion === 0 && !partial ? (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>No draft yet</EmptyTitle>
                  <p className="text-sm text-muted-foreground">
                    Synthesize once every field is sufficient. The draft appears
                    here for review.
                  </p>
                </EmptyHeader>
              </Empty>
            ) : null}
            <Separator />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(3)}>
                Back
              </Button>
              <Button
                onClick={() => setStep(5)}
                disabled={session.currentBriefVersion < 1}
              >
                Continue to approval
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 5 ? (
        <Card>
          <CardHeader>
            <CardTitle>5. Approval and provisioning</CardTitle>
            <CardDescription>
              Approval marks the brief approved and creates the outline plus
              chapters in one transaction. It costs no credits.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Approving draft v{session.currentBriefVersion} provisions the
              chapter tree from the{" "}
              {templateOverride
                ? "selected template version"
                : session.suggestedTemplate
                  ? `suggested template (${session.suggestedTemplate.title})`
                  : "standard outline"}
              . This cannot be undone from here.
            </p>
            {approveError ? (
              <Alert variant="destructive">
                <AlertDescription>{approveError}</AlertDescription>
              </Alert>
            ) : null}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(4)}>
                Back
              </Button>
              <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <Button
                  disabled={approving || session.currentBriefVersion < 1}
                  onClick={() => setConfirmOpen(true)}
                >
                  {approving ? (
                    <>
                      <Spinner /> Approving
                    </>
                  ) : (
                    "Approve and create chapters"
                  )}
                </Button>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Approve this brief?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This writes the outline and chapter tree in one
                      transaction. Chapters grow only from briefs you accept.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={(e) => {
                        e.preventDefault();
                        setConfirmOpen(false);
                        handleApprove();
                      }}
                    >
                      Approve
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
