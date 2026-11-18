"use client";

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  SearchIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import {
  completeOnboarding,
  saveAcademicStep,
  savePersonalStep,
  savePreferencesStep,
  searchDepartments,
  searchFaculties,
  searchInstitutions,
  searchProgrammes,
  suggestDepartment,
  suggestFaculty,
  suggestInstitution,
} from "./actions";

type Student = {
  firstName: string;
  lastName: string;
  country: string;
  preferredLanguage: string;
} | null;

type Academic = {
  institutionId: string | null;
  customInstitution: string | null;
  facultyId: string | null;
  customFaculty: string | null;
  departmentId: string | null;
  customDepartment: string | null;
  programmeId: string | null;
  qualification: string | null;
  academicSession: string | null;
  preferredStyle: string | null;
} | null;

type Item = {
  id: string;
  name: string;
  code?: string | null;
  city?: string | null;
  qualification?: string | null;
};

type SearchResult = {
  ok: boolean;
  items?: Item[];
  hasMore?: boolean;
  error?: string;
};

const STEPS = ["Personal details", "Academic place", "Preferences"];
const NODES = [...STEPS, "Done"];

type View = "start" | 1 | 2 | 3 | "welcome";

function itemSubtitle(item: Item): string | null {
  const parts = [item.code, item.city ?? item.qualification].filter(Boolean);
  return parts.length > 0 ? (parts.join(" · ") as string) : null;
}

function PickerShell({
  label,
  description,
  error,
  children,
}: {
  label: string;
  description: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel>{label}</FieldLabel>
      <FieldDescription>{description}</FieldDescription>
      {children}
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  );
}

function AcademicPicker({
  label,
  description,
  placeholder,
  searchPlaceholder,
  parentReady,
  parentHint,
  customParentActive,
  allowCustom = true,
  selected,
  customText,
  onPick,
  onClear,
  onCustomText,
  doSearch,
  error,
}: {
  label: string;
  description: string;
  placeholder: string;
  searchPlaceholder: string;
  parentReady: boolean;
  parentHint: string;
  customParentActive: boolean;
  allowCustom?: boolean;
  selected: Item | null;
  customText: string;
  onPick: (item: Item) => void;
  onClear: () => void;
  onCustomText?: (value: string) => void;
  doSearch: (query: string, page: number) => Promise<SearchResult>;
  error?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searched, setSearched] = useState(false);
  const [typedMode, setTypedMode] = useState(false);
  const [draft, setDraft] = useState(customText);
  const requestId = useRef(0);

  const searchAllowed = parentReady && !customParentActive;
  const answered = !!selected || customText.trim().length > 0;
  const selectedId = selected ? selected.id : null;
  const showTyped = allowCustom && (customParentActive || typedMode);

  async function runQuery(q: string, p: number, append: boolean) {
    if (!searchAllowed) return;
    const id = ++requestId.current;
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const r = await doSearch(q, p);
      if (requestId.current !== id) return;
      if (r.ok) {
        setItems((prev) =>
          append
            ? [...prev, ...((r.items ?? []) as Item[])]
            : ((r.items ?? []) as Item[]),
        );
        setPage(p);
        setHasMore(!!r.hasMore);
        setSearched(true);
      }
    } finally {
      if (requestId.current === id) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }

  useEffect(() => {
    if (!searchAllowed || !open) return;
    const t = setTimeout(() => {
      void runQuery(query, 1, false);
    }, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, searchAllowed, open]);

  const subtitle = selected ? itemSubtitle(selected) : null;

  return (
    <PickerShell label={label} description={description} error={error}>
      {answered ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {selected ? selected.name : customText.trim()}
            </p>
            {selected && subtitle ? (
              <p className="truncate text-xs text-muted-foreground">
                {subtitle}
              </p>
            ) : null}
            {!selected && customText.trim() ? (
              <p className="text-xs text-muted-foreground">
                Your name, saved with this step
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              onClear();
              onCustomText?.("");
              setTypedMode(false);
              setDraft("");
              setQuery("");
            }}
          >
            Change
          </Button>
        </div>
      ) : null}

      {!answered && !searchAllowed && !customParentActive ? (
        <div className="rounded-lg border border-dashed px-3 py-3">
          <p className="text-sm text-muted-foreground">{parentHint}</p>
        </div>
      ) : null}

      {!answered && showTyped ? (
        <div className="flex flex-col gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Type the exact ${label.toLowerCase()} name`}
            aria-label={`Type the ${label.toLowerCase()} name`}
            maxLength={120}
            className="h-12 rounded-xl"
          />
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {draft.trim().length < 2
                ? "Type at least 2 characters, then confirm."
                : "Look right? Confirm it to continue."}
            </p>
            <div className="flex shrink-0 items-center gap-1">
              {searchAllowed ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setTypedMode(false);
                    setDraft(customText);
                  }}
                >
                  Search the list instead
                </Button>
              ) : null}
              <Button
                type="button"
                size="sm"
                disabled={draft.trim().length < 2}
                onClick={() => {
                  onCustomText?.(draft.trim());
                }}
              >
                Use this name
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {!answered && customParentActive && !allowCustom ? (
        <div className="rounded-lg border border-dashed px-3 py-3">
          <p className="text-sm text-muted-foreground">{parentHint}</p>
        </div>
      ) : null}

      {!answered && searchAllowed && !showTyped ? (
        <>
          <Combobox
            value={selectedId}
            onValueChange={(id: string | null) => {
              if (!id) return;
              const found = items.find((i) => i.id === id);
              if (found) {
                onPick(found);
                setOpen(false);
                setQuery("");
              }
            }}
            inputValue={query}
            onInputValueChange={(v: string) => setQuery(v)}
            open={open}
            onOpenChange={(o: boolean) => setOpen(o)}
          >
            <ComboboxInput
              placeholder={selected ? searchPlaceholder : placeholder}
              aria-label={label}
              onFocus={() => {
                setOpen(true);
                if (!searched && !loading) void runQuery(query, 1, false);
              }}
            />
            <ComboboxContent>
              {loading ? (
                <div className="flex flex-col gap-2 p-2" aria-live="polite">
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ) : (
                <ComboboxList>
                  {items.map((item) => (
                    <ComboboxItem key={item.id} value={item.id}>
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate">{item.name}</span>
                        {itemSubtitle(item) ? (
                          <span className="truncate text-xs text-muted-foreground">
                            {itemSubtitle(item)}
                          </span>
                        ) : null}
                      </span>
                    </ComboboxItem>
                  ))}
                  <ComboboxEmpty>
                    <Empty>
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <SearchIcon aria-hidden="true" />
                        </EmptyMedia>
                        <EmptyTitle>No matches found</EmptyTitle>
                        <EmptyDescription>
                          Nothing matches this search. Suggest the name below to
                          continue without waiting.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  </ComboboxEmpty>
                </ComboboxList>
              )}
              {!loading && hasMore ? (
                <div className="border-t p-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    disabled={loadingMore}
                    onClick={() => void runQuery(query, page + 1, true)}
                  >
                    {loadingMore && <Spinner aria-hidden="true" />}
                    {loadingMore ? "Loading more" : "Show more results"}
                  </Button>
                </div>
              ) : null}
            </ComboboxContent>
          </Combobox>
          {allowCustom ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="self-start px-1 text-muted-foreground"
              onClick={() => setTypedMode(true)}
            >
              Can&apos;t find it? Type the name instead
            </Button>
          ) : null}
        </>
      ) : null}
    </PickerShell>
  );
}

export function OnboardingWizard({
  initialStep,
  initialStudent,
  initialAcademic,
}: {
  initialStep: 1 | 2 | 3;
  initialStudent: Student;
  initialAcademic: Academic;
}) {
  const router = useRouter();
  const hasProgress =
    initialStep !== 1 ||
    !!initialStudent?.firstName?.trim() ||
    !!initialAcademic?.institutionId ||
    !!initialAcademic?.customInstitution?.trim();
  const [view, setView] = useState<View>(hasProgress ? initialStep : "start");
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savedSteps, setSavedSteps] = useState<number[]>([]);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  const [firstName, setFirstName] = useState(initialStudent?.firstName ?? "");
  const [lastName, setLastName] = useState(initialStudent?.lastName ?? "");
  const [country, setCountry] = useState(initialStudent?.country ?? "Cameroon");
  const [language, setLanguage] = useState(
    initialStudent?.preferredLanguage ?? "en",
  );

  const [institution, setInstitution] = useState<Item | null>(null);
  const [institutionId, setInstitutionId] = useState(
    initialAcademic?.institutionId ?? "",
  );
  const [customInstitution, setCustomInstitution] = useState(
    initialAcademic?.customInstitution ?? "",
  );
  const [faculty, setFaculty] = useState<Item | null>(null);
  const [facultyId, setFacultyId] = useState(initialAcademic?.facultyId ?? "");
  const [customFaculty, setCustomFaculty] = useState(
    initialAcademic?.customFaculty ?? "",
  );
  const [department, setDepartment] = useState<Item | null>(null);
  const [departmentId, setDepartmentId] = useState(
    initialAcademic?.departmentId ?? "",
  );
  const [customDepartment, setCustomDepartment] = useState(
    initialAcademic?.customDepartment ?? "",
  );
  const [programme, setProgramme] = useState<Item | null>(null);
  const [programmeId, setProgrammeId] = useState(
    initialAcademic?.programmeId ?? "",
  );
  const [qualification, setQualification] = useState(
    initialAcademic?.qualification ?? "BACHELORS",
  );
  const [session, setSession] = useState(
    initialAcademic?.academicSession ?? "2024/2025",
  );
  const [style, setStyle] = useState(
    initialAcademic?.preferredStyle ?? "APA_7",
  );

  function markSaved(step: number) {
    setSavedSteps((prev) => (prev.includes(step) ? prev : [...prev, step]));
  }

  function fail(message: string, fieldErrors?: Record<string, string>) {
    setErrors(fieldErrors ?? { form: message });
  }

  async function submitPersonal(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setErrors({});
    const r = await savePersonalStep({
      firstName,
      lastName,
      country,
      preferredLanguage: language,
    });
    setPending(false);
    if (!r.ok) {
      fail(
        "Could not save. Check the highlighted fields and try again.",
        r.fieldErrors,
      );
      return;
    }
    markSaved(1);
    toast.success("Personal details saved", {
      description: "Step 1 of 3 is done. Your progress is kept.",
      timeout: 4000,
    });
    setView(2);
    router.refresh();
  }

  async function submitAcademic(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setErrors({});
    // Best-effort audit trail for typed-in names so admins learn which
    // schools to add. Never blocks the save.
    const customAudit: Promise<unknown>[] = [];
    if (customInstitution.trim())
      customAudit.push(
        suggestInstitution({ name: customInstitution.trim() }).catch(
          () => null,
        ),
      );
    if (customFaculty.trim())
      customAudit.push(
        suggestFaculty({ name: customFaculty.trim() }).catch(() => null),
      );
    if (customDepartment.trim())
      customAudit.push(
        suggestDepartment({ name: customDepartment.trim() }).catch(() => null),
      );
    await Promise.allSettled(customAudit);
    const r = await saveAcademicStep({
      institutionId: institutionId || undefined,
      customInstitution: customInstitution || undefined,
      facultyId: facultyId || undefined,
      customFaculty: customFaculty || undefined,
      departmentId: departmentId || undefined,
      customDepartment: customDepartment || undefined,
      programmeId: programmeId || undefined,
      qualification,
      academicSession: session,
    });
    setPending(false);
    if (!r.ok) {
      fail(
        r.error === "404"
          ? "One of your picks no longer exists. Pick it again from the list."
          : "Could not save. Check the highlighted fields and try again.",
        r.fieldErrors,
      );
      return;
    }
    markSaved(2);
    toast.success("Academic place saved", {
      description: "Step 2 of 3 is done. One step left.",
      timeout: 4000,
    });
    setView(3);
    router.refresh();
  }

  async function submitPreferences(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setErrors({});
    const pref = await savePreferencesStep({
      preferredStyle: style,
      preferredLanguage: language,
    });
    if (!pref.ok) {
      setPending(false);
      fail("Could not save preferences. Try again.", pref.fieldErrors);
      return;
    }
    markSaved(3);
    const done = await completeOnboarding();
    setPending(false);
    if (!done.ok) {
      fail("Complete the earlier steps first.", done.fieldErrors);
      if (done.error === "422") setView(2);
      return;
    }
    setWalletBalance(done.walletBalance ?? 50);
    setView("welcome");
    router.refresh();
  }

  const activeIndex =
    view === "start" ? 0 : view === "welcome" ? NODES.length : view - 1;
  const uniDone = !!institution || customInstitution.trim().length > 0;
  const facDone = !!faculty || customFaculty.trim().length > 0;
  const depDone = !!department || customDepartment.trim().length > 0;

  const stepTitle =
    view === "start"
      ? "Welcome to Cevo"
      : view === 1
        ? "Tell us about yourself"
        : view === 2
          ? "Where do you study?"
          : view === 3
            ? "How should Cevo write for you?"
            : "You are set up";

  const stepCopy =
    view === "start"
      ? "Three short steps stand between you and your workspace. Your answers shape your templates, and finishing adds 50 welcome credits once."
      : view === 1
        ? "Help us personalize your experience"
        : view === 2
          ? "Pick from the lists or suggest a missing name to keep moving."
          : view === 3
            ? "Confirm your citation style, then claim your credits."
            : "Onboarding is complete. Your workspace is ready.";

  return (
    <div className="flex w-full flex-col gap-8">
      <nav aria-label="Onboarding progress" className="mx-auto w-full max-w-md">
        <ol className="flex items-center">
          {NODES.map((name, i) => {
            const done = savedSteps.includes(i + 1) || activeIndex > i;
            const active = activeIndex === i;
            return (
              <li
                key={name}
                aria-current={active ? "step" : undefined}
                className={`flex items-center ${i < NODES.length - 1 ? "flex-1" : ""}`}
              >
                <span
                  aria-hidden="true"
                  key={done || active ? "on" : "off"}
                  className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                    done || active
                      ? "ob-pop bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {done ? <CheckIcon className="size-4" /> : i + 1}
                </span>
                {i < NODES.length - 1 ? (
                  <span
                    aria-hidden="true"
                    className="mx-1.5 h-0.5 flex-1 overflow-hidden rounded-full bg-muted"
                  >
                    <span
                      className="block h-full rounded-full bg-primary transition-all duration-500 ease-out"
                      style={{ width: activeIndex > i ? "100%" : "0%" }}
                    />
                  </span>
                ) : null}
                <span className="sr-only">{name}</span>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
          {stepTitle}
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          {stepCopy}
        </p>
      </div>

      <div key={view} className="ob-step-in">
        {errors["form"] && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Check this step</AlertTitle>
            <AlertDescription>{errors["form"]}</AlertDescription>
            <div className="mt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setErrors({})}
              >
                Try again
              </Button>
            </div>
          </Alert>
        )}

        {view === "start" && (
          <div className="flex flex-col gap-5">
            <ul className="flex flex-col gap-3">
              {[
                {
                  title: "Personal details first",
                  body: "Your name, country, and language. One minute, and it personalizes every template after it.",
                },
                {
                  title: "Your academic place next",
                  body: "Searchable lists for university, faculty, and department. Missing yours? Suggest it inline and keep going.",
                },
                {
                  title: "Preferences close it out",
                  body: "Citation style plus confirm. Credits land once, then your dashboard opens.",
                },
              ].map((row) => (
                <li
                  key={row.title}
                  className="flex items-start gap-3 rounded-lg border px-3 py-2.5"
                >
                  <span
                    className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"
                    aria-hidden="true"
                  >
                    <CheckIcon className="size-3.5" />
                  </span>
                  <span>
                    <span className="block text-sm font-medium">
                      {row.title}
                    </span>
                    <span className="block text-sm text-muted-foreground">
                      {row.body}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                className="h-11 flex-1 rounded-xl text-[15px]"
                onClick={() => setView(initialStep)}
              >
                {hasProgress ? "Resume where I stopped" : "Start onboarding"}
                <ArrowRightIcon aria-hidden="true" />
              </Button>
              {hasProgress && initialStep !== 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setView(1)}
                  className="h-11 rounded-xl text-[15px]"
                >
                  Review from the start
                </Button>
              )}
            </div>
          </div>
        )}

        {view === 1 && (
          <form onSubmit={submitPersonal} className="flex flex-col gap-4">
            <h2 className="text-lg font-bold">Personal Information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={errors["firstName"] ? true : undefined}>
                <FieldLabel htmlFor="firstName">First Name</FieldLabel>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                  aria-invalid={errors["firstName"] ? true : undefined}
                  className="h-12 rounded-xl"
                />
                {errors["firstName"] && (
                  <FieldError>{errors["firstName"]}</FieldError>
                )}
              </Field>
              <Field data-invalid={errors["lastName"] ? true : undefined}>
                <FieldLabel htmlFor="lastName">Last Name</FieldLabel>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                  aria-invalid={errors["lastName"] ? true : undefined}
                  className="h-12 rounded-xl"
                />
                {errors["lastName"] && (
                  <FieldError>{errors["lastName"]}</FieldError>
                )}
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="language">Preferred Language</FieldLabel>
              <NativeSelect
                id="language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="h-12 rounded-xl"
              >
                <NativeSelectOption value="en">English</NativeSelectOption>
                <NativeSelectOption value="fr">French</NativeSelectOption>
              </NativeSelect>
            </Field>
            <Field data-invalid={errors["country"] ? true : undefined}>
              <FieldLabel htmlFor="country">Country</FieldLabel>
              <Input
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                autoComplete="country-name"
                aria-invalid={errors["country"] ? true : undefined}
                className="h-12 rounded-xl"
              />
              {errors["country"] && (
                <FieldError>{errors["country"]}</FieldError>
              )}
            </Field>
            <Button
              type="submit"
              disabled={pending}
              aria-busy={pending}
              className="group h-12 rounded-xl text-[15px]"
            >
              {pending && <Spinner aria-hidden="true" />}
              Continue
              {!pending && (
                <ArrowRightIcon
                  aria-hidden="true"
                  className="transition-transform group-hover:translate-x-0.5"
                />
              )}
            </Button>
          </form>
        )}

        {view === 2 && (
          <form onSubmit={submitAcademic} className="flex flex-col gap-5">
            <AcademicPicker
              label="University"
              description="Search the list, or type a missing school to continue."
              placeholder="Search universities, for example Buea"
              searchPlaceholder="Search again to change university"
              parentReady
              parentHint=""
              customParentActive={false}
              selected={institution}
              customText={customInstitution}
              onCustomText={setCustomInstitution}
              error={errors["institutionId"] ?? errors["customInstitution"]}
              doSearch={(query, page) =>
                searchInstitutions({ query, page }) as Promise<SearchResult>
              }
              onPick={(item) => {
                setInstitution(item);
                setInstitutionId(item.id);
                setCustomInstitution("");
                setFaculty(null);
                setFacultyId("");
                setCustomFaculty("");
                setDepartment(null);
                setDepartmentId("");
                setCustomDepartment("");
                setProgramme(null);
                setProgrammeId("");
              }}
              onClear={() => {
                setInstitution(null);
                setInstitutionId("");
                setCustomInstitution("");
              }}
            />

            {uniDone ? (
              <div className="ob-rise flex flex-col gap-5">
                <AcademicPicker
                  label="Faculty"
                  description="Filtered by your university."
                  placeholder="Search faculties"
                  searchPlaceholder="Search again to change faculty"
                  parentReady={!!institutionId}
                  parentHint="Pick a university first, then search faculties here."
                  customParentActive={
                    !institutionId && !!customInstitution.trim()
                  }
                  selected={faculty}
                  customText={customFaculty}
                  onCustomText={setCustomFaculty}
                  error={errors["facultyId"] ?? errors["customFaculty"]}
                  doSearch={(query, page) =>
                    searchFaculties({
                      institutionId,
                      query,
                      page,
                    }) as Promise<SearchResult>
                  }
                  onPick={(item) => {
                    setFaculty(item);
                    setFacultyId(item.id);
                    setCustomFaculty("");
                    setDepartment(null);
                    setDepartmentId("");
                    setCustomDepartment("");
                    setProgramme(null);
                    setProgrammeId("");
                  }}
                  onClear={() => {
                    setFaculty(null);
                    setFacultyId("");
                    setCustomFaculty("");
                  }}
                />
              </div>
            ) : null}

            {facDone ? (
              <div className="ob-rise flex flex-col gap-5">
                <AcademicPicker
                  label="Department"
                  description="Filtered by your faculty."
                  placeholder="Search departments"
                  searchPlaceholder="Search again to change department"
                  parentReady={!!facultyId}
                  parentHint="Pick a faculty first, then search departments here."
                  customParentActive={!facultyId && !!customFaculty.trim()}
                  selected={department}
                  customText={customDepartment}
                  onCustomText={setCustomDepartment}
                  error={errors["departmentId"] ?? errors["customDepartment"]}
                  doSearch={(query, page) =>
                    searchDepartments({
                      facultyId,
                      query,
                      page,
                    }) as Promise<SearchResult>
                  }
                  onPick={(item) => {
                    setDepartment(item);
                    setDepartmentId(item.id);
                    setCustomDepartment("");
                    setProgramme(null);
                    setProgrammeId("");
                  }}
                  onClear={() => {
                    setDepartment(null);
                    setDepartmentId("");
                    setCustomDepartment("");
                  }}
                />
              </div>
            ) : null}

            {depDone ? (
              <div className="ob-rise flex flex-col gap-5">
                <AcademicPicker
                  label="Programme (optional)"
                  description="Filtered by your department. Skip it if nothing fits."
                  placeholder="Search programmes"
                  searchPlaceholder="Search again to change programme"
                  parentReady={!!departmentId}
                  parentHint="Pick a department first, then optionally search programmes."
                  customParentActive={
                    !departmentId && !!customDepartment.trim()
                  }
                  selected={programme}
                  customText=""
                  onCustomText={() => undefined}
                  allowCustom={false}
                  error={errors["programmeId"]}
                  doSearch={(query, page) =>
                    searchProgrammes({
                      departmentId,
                      query,
                      page,
                    }) as Promise<SearchResult>
                  }
                  onPick={(item) => {
                    setProgramme(item);
                    setProgrammeId(item.id);
                  }}
                  onClear={() => {
                    setProgramme(null);
                    setProgrammeId("");
                  }}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="qualification">
                      Qualification
                    </FieldLabel>
                    <NativeSelect
                      id="qualification"
                      value={qualification}
                      onChange={(e) => setQualification(e.target.value)}
                      className="h-12 rounded-xl"
                    >
                      <NativeSelectOption value="HND">HND</NativeSelectOption>
                      <NativeSelectOption value="BACHELORS">
                        Bachelors
                      </NativeSelectOption>
                      <NativeSelectOption value="MASTERS">
                        Masters
                      </NativeSelectOption>
                      <NativeSelectOption value="PHD">PhD</NativeSelectOption>
                      <NativeSelectOption value="OTHER">
                        Other
                      </NativeSelectOption>
                    </NativeSelect>
                  </Field>
                  <Field
                    data-invalid={errors["academicSession"] ? true : undefined}
                  >
                    <FieldLabel htmlFor="session">Academic session</FieldLabel>
                    <FieldDescription>
                      Format YYYY/YYYY, for example 2024/2025. Years 2000 to
                      2030.
                    </FieldDescription>
                    <Input
                      id="session"
                      value={session}
                      onChange={(e) => setSession(e.target.value)}
                      placeholder="2024/2025"
                      inputMode="numeric"
                      aria-invalid={
                        errors["academicSession"] ? true : undefined
                      }
                      className="h-12 rounded-xl"
                    />
                    {errors["academicSession"] && (
                      <FieldError>{errors["academicSession"]}</FieldError>
                    )}
                  </Field>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setView(1)}
                    className="h-11 rounded-xl text-[15px]"
                  >
                    <ArrowLeftIcon aria-hidden="true" />
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={pending}
                    aria-busy={pending}
                    className="h-11 flex-1 rounded-xl text-[15px]"
                  >
                    {pending && <Spinner aria-hidden="true" />}
                    Save and continue
                  </Button>
                </div>
              </div>
            ) : null}
          </form>
        )}

        {view === 3 && (
          <form onSubmit={submitPreferences} className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="style">Citation style</FieldLabel>
              <FieldDescription>
                Your department template follows this style by default.
              </FieldDescription>
              <NativeSelect
                id="style"
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                className="h-12 rounded-xl"
              >
                <NativeSelectOption value="APA_7">APA 7</NativeSelectOption>
                <NativeSelectOption value="Harvard">Harvard</NativeSelectOption>
                <NativeSelectOption value="MLA">MLA</NativeSelectOption>
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="prefLang">Preferred language</FieldLabel>
              <FieldDescription>
                Winning choice if it differs from step 1. Going back keeps this
                value in sync.
              </FieldDescription>
              <NativeSelect
                id="prefLang"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="h-12 rounded-xl"
              >
                <NativeSelectOption value="en">English</NativeSelectOption>
                <NativeSelectOption value="fr">French</NativeSelectOption>
              </NativeSelect>
            </Field>
            <Alert>
              <AlertDescription>
                Completing this step grants 50 welcome credits once and takes
                you to your dashboard. Returning here later shows your current
                state with no extra grant.
              </AlertDescription>
            </Alert>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setView(2)}
                className="h-11 rounded-xl text-[15px]"
              >
                <ArrowLeftIcon aria-hidden="true" />
                Back
              </Button>
              <Button
                type="submit"
                disabled={pending}
                aria-busy={pending}
                className="h-11 flex-1 rounded-xl text-[15px]"
              >
                {pending && <Spinner aria-hidden="true" />}
                Complete setup
              </Button>
            </div>
          </form>
        )}

        {view === "welcome" && (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <svg
              viewBox="0 0 56 56"
              className="size-14"
              role="img"
              aria-label="Setup complete"
            >
              <circle
                cx="28"
                cy="28"
                r="26"
                fill="var(--primary)"
                opacity="0.12"
              />
              <circle
                cx="28"
                cy="28"
                r="26"
                fill="none"
                stroke="var(--primary)"
                strokeWidth="2.5"
                pathLength={1}
                className="ob-draw"
              />
              <path
                d="M18 29.5 25 36.5 39 21"
                fill="none"
                stroke="var(--primary)"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength={1}
                className="ob-draw"
              />
            </svg>
            <div
              className="ob-rise flex flex-col items-center gap-1"
              style={{ animationDelay: "0.35s" }}
            >
              <p className="text-xl font-bold">
                {walletBalance ?? 50} welcome credits are yours
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Your profile, academic place, and preferences are saved. Your
                dashboard is ready when you are.
              </p>
            </div>
            <Button
              type="button"
              className="group h-11 rounded-xl text-[15px]"
              onClick={() => router.push("/dashboard")}
            >
              <span
                className="ob-rise inline-flex items-center gap-2"
                style={{ animationDelay: "0.45s" }}
              >
                Go to dashboard
                <ArrowRightIcon
                  aria-hidden="true"
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
