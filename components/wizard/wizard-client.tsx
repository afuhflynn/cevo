"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "cn";
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
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { REQUIRED_SERVER_STEP, WizardStepper } from "./wizard-stepper";

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

const IDEA_FIELDS = ["background", "problem", "aim"] as const;
const FIELD_DESCRIPTIONS: Record<string, string> = {
  background:
    "Set the scene — what is this project about and why does it matter?",
  problem: "The specific gap or pain your work addresses. One sharp paragraph.",
  aim: "The single sentence your whole project serves.",
  objectives:
    "Three or more measurable steps, one per line. Each builds toward the aim.",
  questions:
    "Three or more research questions, one per line, answerable by your work.",
  scope: "What is in and what is out — the boundaries of this project.",
  limitations: "Honest constraints: time, data, access, tools.",
  methodology: "How you will do it — approach, tools, and steps.",
  outcomes: "What success looks like when this is done.",
};

const DETAIL_FIELDS = [
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

function maxAllowed(serverStep: number): number {
  let n = 1;
  for (let s = 1; s <= 5; s += 1) {
    if (serverStep >= (REQUIRED_SERVER_STEP[s] ?? 1)) n = s;
  }
  return n;
}

export function WizardClient({
  sessionId,
  initialStep,
}: {
  sessionId: string;
  /** Validated 1..5 deep-link step; server state wins on conflict. */
  initialStep?: number;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = React.useState(
    initialStep && initialStep >= 1 && initialStep <= 5 ? initialStep : 2,
  );
  const appliedInitial = React.useRef(false);
  const autoSynthFor = React.useRef<string | null>(null);
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [savingStep, setSavingStep] = React.useState(false);
  const [stepMessage, setStepMessage] = React.useState<string | null>(null);
  const [highlightFields, setHighlightFields] = React.useState<Set<string>>(
    new Set(),
  );
  const [synthesizing, setSynthesizing] = React.useState(false);
  const [partial, setPartial] = React.useState<Record<string, unknown> | null>(
    null,
  );
  const [synthMessage, setSynthMessage] = React.useState<string | null>(null);
  const [viewPayload, setViewPayload] = React.useState<Record<
    string,
    unknown
  > | null>(null);
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

  const goStep = React.useCallback(
    (n: number) => {
      setStep(n);
      router.replace(`/dashboard/wizard/${sessionId}?step=${n}`, {
        scroll: false,
      });
    },
    [router, sessionId],
  );

  const loadVersionPayload = React.useCallback(
    async (version: number) => {
      setViewPayload(null);
      const res = await fetch(
        `/api/wizard/sessions/${sessionId}/versions/${version}`,
        { cache: "no-store" },
      );
      if (!res.ok) return;
      const json = await res.json();
      setViewPayload((json.payload ?? null) as Record<string, unknown> | null);
    },
    [sessionId],
  );

  const defaultStep = React.useCallback(() => {
    if (!data) return 2;
    const readyCount = Object.values(data.session.readiness ?? {}).filter(
      Boolean,
    ).length;
    if (readyCount === 0) return 2;
    if (data.session.blocked.length > 0) return 3;
    if (data.session.currentBriefVersion < 1) return 4;
    return 5;
  }, [data]);

  React.useEffect(() => {
    if (!data || appliedInitial.current) return;
    appliedInitial.current = true;
    if (
      initialStep &&
      initialStep >= 1 &&
      initialStep <= 5 &&
      serverStep >= (REQUIRED_SERVER_STEP[initialStep] ?? 1)
    ) {
      setStep(initialStep);
      return;
    }
    setStep(Math.min(defaultStep(), Math.max(maxAllowed(serverStep), 2)));
    const serverAnswers: Record<string, string> = {};
    for (const t of data.turns) serverAnswers[t.fieldKey] = t.answerText;
    setAnswers((prev) => {
      const next = { ...prev };
      for (const [key, value] of Object.entries(serverAnswers)) {
        if (!dirtyFields.has(key)) next[key] = value;
      }
      return next;
    });
    if (data.session.currentBriefVersion > 0 && viewPayload === null) {
      void loadVersionPayload(data.session.currentBriefVersion);
    }
  }, [
    data,
    serverStep,
    dirtyFields,
    initialStep,
    defaultStep,
    viewPayload,
    loadVersionPayload,
  ]);

  async function refresh() {
    await queryClient.invalidateQueries({
      queryKey: ["wizard", "session", sessionId],
    });
  }

  async function saveVisibleFields(
    fieldKeys: string[],
  ): Promise<SessionPayload | null> {
    setSavingStep(true);
    setStepMessage(null);
    try {
      const serverTurns = new Map(
        (data?.turns ?? []).map((t) => [t.fieldKey, t.answerText]),
      );
      for (const fieldKey of fieldKeys) {
        const answerText = (answers[fieldKey] ?? "").trim();
        if (!answerText) continue;
        if (serverTurns.get(fieldKey) === answerText) continue;
        const res = await fetch(`/api/wizard/sessions/${sessionId}/turns`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fieldKey, answerText }),
        });
        if (!res.ok) {
          setStepMessage(
            "Some answers could not save. Check your connection and try again.",
          );
          return null;
        }
      }
      const fresh = await fetchSession(sessionId);
      queryClient.setQueryData(["wizard", "session", sessionId], fresh);
      setDirtyFields(new Set());
      return fresh;
    } catch {
      setStepMessage(
        "Some answers could not save. Check your connection and try again.",
      );
      return null;
    } finally {
      setSavingStep(false);
    }
  }

  async function handleIdeaContinue() {
    const fresh = await saveVisibleFields([...IDEA_FIELDS]);
    if (!fresh) return;
    const done = IDEA_FIELDS.some((k) => fresh.session.readiness[k] === true);
    if (done) {
      setHighlightFields(new Set());
      goStep(3);
    } else {
      setHighlightFields(
        new Set(IDEA_FIELDS.filter((k) => fresh.session.readiness[k] !== true)),
      );
      setStepMessage(
        "Saved. Make at least one answer sufficient to continue — green badges mark sufficient answers.",
      );
    }
  }

  async function handleDetailsContinue() {
    const fresh = await saveVisibleFields([...DETAIL_FIELDS]);
    if (!fresh) return;
    if (fresh.session.blocked.length === 0 || fresh.session.currentStep >= 4) {
      setHighlightFields(new Set());
      goStep(4);
    } else {
      setHighlightFields(
        new Set(
          DETAIL_FIELDS.filter((k) => fresh.session.readiness[k] !== true),
        ),
      );
      setStepMessage(`Still needed: ${fresh.session.blocked.join(", ")}.`);
    }
  }

  const loadTemplates = React.useCallback(async () => {
    const res = await fetch("/api/wizard/templates", { cache: "no-store" });
    if (!res.ok) return;
    const json = await res.json();
    setTemplateOptions(json.templates ?? []);
  }, []);

  React.useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: handleSynthesize intentionally omitted; autoSynthFor makes this strictly one-shot per session.
  React.useEffect(() => {
    if (step !== 5 || !data) return;
    if (data.session.currentBriefVersion > 0) return;
    if (synthesizing) return;
    if (autoSynthFor.current === sessionId) return;
    autoSynthFor.current = sessionId;
    if (
      !data.session.sufficientBalance &&
      data.session.balance < data.session.estimate
    ) {
      setSynthMessage(
        "Not enough credits to prepare your draft. Top up your wallet, then try again below.",
      );
      return;
    }
    void handleSynthesize();
  }, [step, data, sessionId, synthesizing]);

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
      let doneVersion: number | null = null;
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
            doneVersion =
              typeof event.version === "number" ? event.version : null;
            setSynthMessage(
              "Draft saved. Review it below, then create your project.",
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
      if (doneVersion !== null) await loadVersionPayload(doneVersion);
    } catch {
      setSynthMessage("Connection broke mid stream. Your draft is intact.");
    } finally {
      setSynthesizing(false);
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
  const canGo = (target: number) =>
    serverStep >= (REQUIRED_SERVER_STEP[target] ?? 1);
  const completed = (target: number) =>
    serverStep > (REQUIRED_SERVER_STEP[target] ?? 1) ||
    data?.session.status === "APPROVED";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Create a New Project
          </h1>
          <Badge variant="secondary">{session.status}</Badge>
        </div>
        <WizardStepper
          active={step}
          completed={completed}
          canGo={canGo}
          onNavigate={goStep}
        />
      </div>
      {step === 1 ? (
        <Card>
          <CardHeader>
            <CardTitle>1. Project basics</CardTitle>
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
              <Button onClick={() => goStep(2)} disabled={!canGo(2)}>
                Continue to idea
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 4 ? (
        <Card>
          <CardHeader>
            <CardTitle>4. Template</CardTitle>
            <CardDescription>
              This decides what your finished report looks like — margins,
              headings, preliminary pages, and citation style. Your choice is
              frozen when your project is created, so exports never shift under
              you.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {templateOptions.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>No templates listed</EmptyTitle>
                  <p className="text-sm text-muted-foreground">
                    Keep the standard outline below — your project still gets a
                    complete chapter tree.
                  </p>
                </EmptyHeader>
              </Empty>
            ) : (
              <RadioGroup
                value={
                  templateOverride ||
                  session.suggestedTemplate?.templateVersionId ||
                  ""
                }
                onValueChange={(v) =>
                  setTemplateOverride(
                    v === session.suggestedTemplate?.templateVersionId
                      ? ""
                      : (v ?? ""),
                  )
                }
                aria-label="Report template"
                className="grid gap-3 sm:grid-cols-2"
              >
                {templateOptions.map((t) => {
                  const isSuggested =
                    session.suggestedTemplate?.templateVersionId === t.id;
                  const isActive =
                    (templateOverride ||
                      session.suggestedTemplate?.templateVersionId) === t.id;
                  return (
                    // biome-ignore lint/a11y/noLabelWithoutControl: label wraps the radio control (implicit association); the linter cannot see through the component boundary.
                    <label
                      key={t.id}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-xl border bg-card p-4 transition-colors",
                        isActive
                          ? "border-2 border-primary bg-primary/[0.04]"
                          : "border-border hover:border-primary/40",
                      )}
                    >
                      <RadioGroupItem value={t.id} className="mt-0.5" />
                      <span className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold">
                            {t.title}
                          </span>
                          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                            v{t.version}
                          </span>
                        </span>
                        {isSuggested ? (
                          <span className="text-xs font-medium text-primary">
                            Recommended for you —{" "}
                            {session.suggestedTemplate?.reason ??
                              "best match for your level."}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Full report formatting included.
                          </span>
                        )}
                      </span>
                    </label>
                  );
                })}
              </RadioGroup>
            )}
            <p className="text-xs text-muted-foreground">
              Have your department&apos;s guideline document? Custom uploads are
              coming soon — for now, pick the closest match above.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => goStep(3)}>
                Back
              </Button>
              <Button onClick={() => goStep(5)}>Continue to review</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 2 || step === 3 ? (
        <Card>
          <CardHeader>
            <CardTitle>{step === 2 ? "2. Idea" : "3. Details"}</CardTitle>
            <CardDescription>
              {step === 2
                ? "Describe what your project is about. Save at least one answer to continue."
                : "Frame the work precisely. A green badge means the answer is sufficient; follow ups appear when it is thin (max 2 per field)."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {FIELD_ORDER.filter((fieldKey) =>
              step === 2
                ? (IDEA_FIELDS as readonly string[]).includes(fieldKey)
                : !(IDEA_FIELDS as readonly string[]).includes(fieldKey),
            ).map((fieldKey) => {
              const turn = turnByField.get(fieldKey);
              const ready = session.readiness[fieldKey] === true;
              const highlighted = highlightFields.has(fieldKey);
              return (
                <div
                  key={fieldKey}
                  className={
                    highlighted
                      ? "flex flex-col gap-2 rounded-lg border border-destructive/70 bg-destructive/[0.03] p-3"
                      : "flex flex-col gap-2 rounded-lg border border-border p-3"
                  }
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold">
                      {FIELD_LABELS[fieldKey]}{" "}
                      {ready ? null : (
                        <>
                          <span aria-hidden="true" className="text-destructive">
                            *
                          </span>
                          <span className="sr-only"> (required)</span>
                        </>
                      )}
                    </span>
                    {ready ? <Badge variant="default">Sufficient</Badge> : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {FIELD_DESCRIPTIONS[fieldKey]}
                  </p>
                  {turn?.promptText ? (
                    <p className="text-sm text-muted-foreground">
                      {turn.promptText}
                    </p>
                  ) : null}
                  <Textarea
                    value={answers[fieldKey] ?? ""}
                    aria-invalid={
                      highlightFields.has(fieldKey) ? true : undefined
                    }
                    onChange={(e) => {
                      const value = e.target.value;
                      setDirtyFields((prev) => new Set(prev).add(fieldKey));
                      setHighlightFields((prev) => {
                        if (!prev.has(fieldKey)) return prev;
                        const next = new Set(prev);
                        next.delete(fieldKey);
                        return next;
                      });
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
                  {(() => {
                    const current = (answers[fieldKey] ?? "").trim();
                    if (!current) return null;
                    const saved =
                      turn?.answerText !== undefined &&
                      turn.answerText === current;
                    return (
                      <p className="text-xs text-muted-foreground">
                        {saved ? "Saved" : "Unsaved changes"}
                      </p>
                    );
                  })()}
                </div>
              );
            })}
            {stepMessage ? (
              <p className="text-sm text-muted-foreground">{stepMessage}</p>
            ) : null}
            {step === 2 ? (
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <Button
                    onClick={() => void handleIdeaContinue()}
                    disabled={savingStep}
                  >
                    {savingStep ? (
                      <>
                        <Spinner /> Saving…
                      </>
                    ) : (
                      "Continue to details"
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => goStep(2)}>
                  Back to idea
                </Button>
                <Button
                  onClick={() => void handleDetailsContinue()}
                  disabled={savingStep}
                >
                  {savingStep ? (
                    <>
                      <Spinner /> Saving…
                    </>
                  ) : (
                    "Continue to template"
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {step === 5 ? (
        <Card>
          <CardHeader>
            <CardTitle>5. Review and build</CardTitle>
            <CardDescription>
              Review your draft, then create your project.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {synthesizing && !partial ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner aria-hidden="true" /> Preparing your draft…
              </p>
            ) : null}
            {synthMessage ? (
              <Alert>
                <AlertDescription>{synthMessage}</AlertDescription>
              </Alert>
            ) : null}
            {synthMessage &&
            !synthesizing &&
            !viewPayload &&
            data.session.currentBriefVersion === 0 ? (
              <div>
                <Button
                  variant="outline"
                  onClick={() => {
                    autoSynthFor.current = null;
                    void handleSynthesize();
                  }}
                >
                  Try again
                </Button>
              </div>
            ) : null}
            {partial ? (
              <div className="rounded-lg border border-border p-3">
                <h4 className="mb-2 text-sm font-semibold">
                  Live preview (streaming)
                </h4>
                <BriefPreview payload={partial} />
              </div>
            ) : null}
            {viewPayload ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-semibold">Your draft</p>
                <BriefPreview payload={viewPayload} />
              </div>
            ) : null}
            {!viewPayload && !partial && session.currentBriefVersion === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-4">
                <p className="text-sm font-medium">
                  Your draft will appear here
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your draft is being prepared — it will appear here with these
                  sections:
                </p>
                <ul className="mt-2 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
                  {[
                    "Background",
                    "Problem statement",
                    "Aim",
                    "Objectives",
                    "Research questions",
                    "Scope",
                    "Limitations",
                    "Methodology",
                    "Expected outcomes",
                  ].map((label) => (
                    <li key={label} className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="size-1.5 rounded-full bg-muted-foreground/40"
                      />
                      {label}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <Separator />
            <div className="flex flex-col gap-2">
              {approveError ? (
                <Alert variant="destructive">
                  <AlertDescription>{approveError}</AlertDescription>
                </Alert>
              ) : null}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => goStep(4)}>
                  Back
                </Button>
                <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                  <Button
                    disabled={approving || session.currentBriefVersion < 1}
                    onClick={() => setConfirmOpen(true)}
                  >
                    {approving ? (
                      <>
                        <Spinner /> Creating…
                      </>
                    ) : (
                      "Create my project"
                    )}
                  </Button>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Create your project?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This builds your outline and chapters from the approved
                        draft. You can edit everything afterwards.
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
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
