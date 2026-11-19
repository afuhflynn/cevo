"use client";

import { cn } from "cn";
import {
  ArrowRightIcon,
  CodeIcon,
  FlaskConicalIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Spinner } from "@/components/ui/spinner";

import { WizardStepper } from "./wizard-stepper";

const TYPE_OPTIONS = [
  {
    value: "RESEARCH_ACADEMIC",
    label: "Research Project",
    Icon: FlaskConicalIcon,
  },
  {
    value: "APPLIED_SOFTWARE",
    label: "Development Project",
    Icon: CodeIcon,
  },
] as const;

type ProjectType = (typeof TYPE_OPTIONS)[number]["value"];

function BasicsIllustration() {
  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-[280px]">
      <div className="absolute inset-x-8 top-8 bottom-0 rounded-full bg-primary/10 blur-2xl" />
      <div className="relative mx-auto w-44 rotate-[-4deg] rounded-2xl border border-border bg-card p-4 shadow-[0_24px_50px_-24px_var(--color-primary)]">
        <div className="h-2.5 w-16 rounded-full bg-primary/30" />
        <div className="mt-3 flex flex-col gap-2">
          <div className="h-2 w-full rounded-full bg-primary/15" />
          <div className="h-2 w-11/12 rounded-full bg-primary/15" />
          <div className="h-2 w-4/5 rounded-full bg-primary/15" />
          <div className="h-2 w-full rounded-full bg-primary/15" />
        </div>
        <div className="mt-4 h-10 rounded-lg bg-primary/10" />
        <span className="absolute -right-5 -bottom-5 flex size-12 items-center justify-center rounded-full bg-primary text-2xl font-light text-primary-foreground shadow-lg">
          +
        </span>
      </div>
    </div>
  );
}

export function NewWizardEntry() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [title, setTitle] = React.useState("");
  const [projectType, setProjectType] =
    React.useState<ProjectType>("RESEARCH_ACADEMIC");
  const [qualification, setQualification] = React.useState("");
  const [deadline, setDeadline] = React.useState("");
  const [templateVersionId, setTemplateVersionId] = React.useState<
    string | null
  >(null);
  const [templateTitle, setTemplateTitle] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>(
    {},
  );
  const [formError, setFormError] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);

  React.useEffect(() => {
    const requested = searchParams.get("template")?.trim() || null;
    if (!requested) return;
    let cancelled = false;
    void fetch(
      `/api/dashboard/templates/versions/${encodeURIComponent(requested)}`,
      {
        cache: "no-store",
      },
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const payload = data as { versionId?: string; title?: string };
        if (
          typeof payload.versionId === "string" &&
          typeof payload.title === "string"
        ) {
          setTemplateVersionId(payload.versionId);
          setTemplateTitle(payload.title);
        }
      })
      .catch(() => {
        /* invalid template param → plain flow, never a blocker */
      });
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});
    if (title.trim().length < 3) {
      setFieldErrors({
        title: "Give your project a title of at least 3 characters.",
      });
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/wizard/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          projectType,
          qualification: qualification || undefined,
          submissionDeadline: deadline || undefined,
          templateVersionId: templateVersionId ?? undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const issues = (data?.issues?.fieldErrors ?? {}) as Record<
          string,
          string[]
        >;
        const first = Object.entries(issues)[0];
        if (data?.error === "INVALID_INPUT" && first) {
          setFieldErrors({ [first[0]]: String(first[1]) });
        } else {
          setFormError(
            data?.error === "INVALID_INPUT"
              ? "Check the highlighted fields and try again."
              : "Could not start the wizard. Try again.",
          );
        }
        return;
      }
      router.push(`/dashboard/wizard/${data.sessionId}`);
    } catch {
      setFormError("Could not start the wizard. Check your connection.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Create a New Project
        </h1>
        <Link
          href="/dashboard"
          aria-label="Close and back to dashboard"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <XIcon className="size-5" aria-hidden="true" />
        </Link>
      </div>

      <WizardStepper active={1} completed={() => false} />

      <div className="grid items-start gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
        <div className="hidden lg:block">
          <BasicsIllustration />
        </div>
        <form onSubmit={handleCreate} className="flex min-w-0 flex-col gap-5">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Project Basics</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Let&rsquo;s start with the essential details about your project.
            </p>
          </div>

          {templateTitle ? (
            <output className="block rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
              <span className="font-medium">Starting from template:</span>{" "}
              <span>{templateTitle}</span>{" "}
              <button
                type="button"
                onClick={() => {
                  setTemplateVersionId(null);
                  setTemplateTitle(null);
                }}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Remove
              </button>
            </output>
          ) : null}

          {formError ? (
            <Alert variant="destructive">
              <AlertTitle>Could not start</AlertTitle>
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}

          <Field data-invalid={fieldErrors.title ? true : undefined}>
            <FieldLabel htmlFor="wizard-title">
              Project Title{" "}
              <span aria-hidden="true" className="text-destructive">
                *
              </span>
            </FieldLabel>
            <Input
              id="wizard-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="AI for Education"
              maxLength={200}
              required
              aria-invalid={fieldErrors.title ? true : undefined}
              className="h-12 rounded-xl"
            />
            {fieldErrors.title ? (
              <FieldError>{fieldErrors.title}</FieldError>
            ) : null}
          </Field>

          <RadioGroup
            value={projectType}
            onValueChange={(v) => setProjectType(v as ProjectType)}
            aria-label="Project type"
            className="grid gap-3 sm:grid-cols-2"
          >
            {TYPE_OPTIONS.map(({ value, label, Icon }) => {
              const active = projectType === value;
              return (
                // biome-ignore lint/a11y/noLabelWithoutControl: label wraps the radio control (implicit association); the linter cannot see through the component boundary.
                <label
                  key={value}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-xl border bg-card p-4 transition-colors",
                    active
                      ? "border-2 border-primary bg-primary/[0.04]"
                      : "border-border",
                  )}
                >
                  <RadioGroupItem value={value} className="sr-only" />
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                      active ? "border-primary" : "border-muted-foreground/40",
                    )}
                  >
                    {active ? (
                      <span className="size-2.5 rounded-full bg-primary" />
                    ) : null}
                  </span>
                  <Icon
                    aria-hidden="true"
                    className={cn(
                      "size-5 shrink-0",
                      active ? "text-primary" : "text-muted-foreground",
                    )}
                  />
                  <span className="text-sm font-semibold">{label}</span>
                </label>
              );
            })}
          </RadioGroup>

          <Field>
            <FieldLabel htmlFor="wizard-qual">Qualification</FieldLabel>
            <NativeSelect
              id="wizard-qual"
              value={qualification}
              onChange={(e) => setQualification(e.target.value)}
              className="h-12 rounded-xl"
            >
              <NativeSelectOption value="">
                Select qualification
              </NativeSelectOption>
              <NativeSelectOption value="HND">HND</NativeSelectOption>
              <NativeSelectOption value="BACHELORS">
                Bachelors
              </NativeSelectOption>
              <NativeSelectOption value="MASTERS">Masters</NativeSelectOption>
              <NativeSelectOption value="PHD">PhD</NativeSelectOption>
              <NativeSelectOption value="OTHER">Other</NativeSelectOption>
            </NativeSelect>
          </Field>

          <Field
            data-invalid={fieldErrors.submissionDeadline ? true : undefined}
          >
            <FieldLabel htmlFor="wizard-deadline">
              Submission Deadline{" "}
              <span className="font-normal text-muted-foreground">
                (Optional)
              </span>
            </FieldLabel>
            <DatePicker
              label="Submission deadline"
              value={deadline}
              onChange={setDeadline}
            />
            {fieldErrors.submissionDeadline ? (
              <FieldError>{fieldErrors.submissionDeadline}</FieldError>
            ) : null}
          </Field>

          <div className="flex items-center justify-end gap-3">
            <Link href="/dashboard">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-xl px-6 text-[15px]"
              >
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={creating}
              aria-busy={creating}
              className="group h-11 rounded-xl px-6 text-[15px]"
            >
              {creating ? (
                <>
                  <Spinner aria-hidden="true" />
                  Starting…
                </>
              ) : (
                <>
                  Next
                  <ArrowRightIcon
                    aria-hidden="true"
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
