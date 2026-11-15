"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  GraduationCapIcon,
  SearchIcon,
  SparklesIcon,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Progress } from "@/components/ui/progress";
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
const STEP_DESCRIPTIONS = [
  "Your name, country, and language",
  "Your university, faculty, and department",
  "Your citation style and final confirm",
];

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
  selected,
  customText,
  onPick,
  onClear,
  onSuggest,
  doSearch,
  error,
  suggestPending,
}: {
  label: string;
  description: string;
  placeholder: string;
  searchPlaceholder: string;
  parentReady: boolean;
  parentHint: string;
  customParentActive: boolean;
  selected: Item | null;
  customText: string;
  onPick: (item: Item) => void;
  onClear: () => void;
  onSuggest: (name: string) => void;
  doSearch: (query: string, page: number) => Promise<SearchResult>;
  error?: string;
  suggestPending: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searched, setSearched] = useState(false);
  const [suggestName, setSuggestName] = useState("");
  const requestId = useRef(0);

  const searchAllowed = parentReady && !customParentActive;

  async function runQuery(q: string, p: number, append: boolean) {
    if (!searchAllowed) return;
    const id = ++requestId.current;
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const r = await doSearch(q, p);
      if (requestId.current !== id) return;
      if (r.ok) {
        setItems((prev) => (append ? [...prev, ...((r.items ?? []) as Item[])] : ((r.items ?? []) as Item[])));
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
  }, [query, searchAllowed, open ]);

  const subtitle = selected ? itemSubtitle(selected) : null;

  return (
    <PickerShell label={label} description={description} error={error}>
      {(selected || customText.trim()) && (
        <div className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {selected ? selected.name : customText.trim()}
            </p>
            {selected && subtitle ? (
              <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
            ) : null}
            {!selected && customText.trim() ? (
              <p className="text-xs text-muted-foreground">
                Suggested name, saved with this step
              </p>
            ) : null}
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClear}>
            Change
          </Button>
        </div>
      )}

      {customParentActive ? (
        <div className="rounded-lg border border-dashed px-3 py-3">
          <p className="text-sm text-muted-foreground">
            The level above uses a suggested name, so there is no list to
            search here. Suggest the name below instead.
          </p>
        </div>
      ) : !searchAllowed ? (
        <div className="rounded-lg border border-dashed px-3 py-3">
          <p className="text-sm text-muted-foreground">{parentHint}</p>
        </div>
      ) : (
        <Combobox
          value={selected ? selected.id : null}
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
                        Nothing matches this search. Suggest the name below
                        to continue without waiting.
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
      )}

      <div className="flex gap-2">
        <Input
          placeholder="Suggest a missing name"
          value={suggestName}
          onChange={(e) => setSuggestName(e.target.value)}
          aria-label={`Suggest a missing ${label.toLowerCase()}`}
          maxLength={120}
        />
        <Button
          type="button"
          variant="secondary"
          disabled={suggestPending || suggestName.trim().length < 2}
          onClick={() => {
            onSuggest(suggestName.trim());
            setSuggestName("");
          }}
        >
          {suggestPending && <Spinner aria-hidden="true" />}
          Suggest
        </Button>
      </div>
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
  const [suggestPending, setSuggestPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
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
    setNotice(null);
    const r = await savePersonalStep({
      firstName,
      lastName,
      country,
      preferredLanguage: language,
    });
    setPending(false);
    if (!r.ok) {
      fail("Could not save. Check the highlighted fields and try again.", r.fieldErrors);
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
    setNotice(null);
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
    setNotice(null);
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
      fail(
        "Complete the earlier steps first.",
        done.fieldErrors,
      );
      if (done.error === "422") setView(2);
      return;
    }
    setWalletBalance(done.walletBalance ?? 50);
    setView("welcome");
    router.refresh();
  }

  function suggestValue(
    kind: "institution" | "faculty" | "department",
    name: string,
  ) {
    const clean = name.trim();
    if (clean.length < 2 || clean.length > 120) {
      fail("Suggested names need 2 to 120 characters.", {
        form: "Suggested names need 2 to 120 characters.",
      });
      return;
    }
    setSuggestPending(true);
    const done = (saved: string) => {
      setSuggestPending(false);
      setNotice(`Saved suggestion ${saved}. It is kept when you save this step.`);
      toast.success("Suggestion saved", {
        description: `${saved} is kept when you save this step.`,
        timeout: 4000,
      });
    };
    if (kind === "institution") {
      if (
        customInstitution.trim().toLowerCase() === clean.toLowerCase() &&
        customInstitution.trim()
      ) {
        setSuggestPending(false);
        return;
      }
      const call = async () => {
        const r = await suggestInstitution({ name: clean });
        if (r.ok && r.name) {
          setCustomInstitution(r.name);
          setInstitutionId("");
          setInstitution(null);
          setFacultyId("");
          setFaculty(null);
          setDepartmentId("");
          setDepartment(null);
          setProgrammeId("");
          setProgramme(null);
          done(r.name);
        } else {
          setSuggestPending(false);
          fail("Could not save that suggestion. Try again.", r.fieldErrors);
        }
      };
      void call();
    }
    if (kind === "faculty") {
      if (
        customFaculty.trim().toLowerCase() === clean.toLowerCase() &&
        customFaculty.trim()
      ) {
        setSuggestPending(false);
        return;
      }
      const call = async () => {
        const r = await suggestFaculty({ name: clean });
        if (r.ok && r.name) {
          setCustomFaculty(r.name);
          setFacultyId("");
          setFaculty(null);
          setDepartmentId("");
          setDepartment(null);
          setProgrammeId("");
          setProgramme(null);
          done(r.name);
        } else {
          setSuggestPending(false);
          fail("Could not save that suggestion. Try again.", r.fieldErrors);
        }
      };
      void call();
    }
    if (kind === "department") {
      if (
        customDepartment.trim().toLowerCase() === clean.toLowerCase() &&
        customDepartment.trim()
      ) {
        setSuggestPending(false);
        return;
      }
      const call = async () => {
        const r = await suggestDepartment({ name: clean });
        if (r.ok && r.name) {
          setCustomDepartment(r.name);
          setDepartmentId("");
          setDepartment(null);
          setProgrammeId("");
          setProgramme(null);
          done(r.name);
        } else {
          setSuggestPending(false);
          fail("Could not save that suggestion. Try again.", r.fieldErrors);
        }
      };
      void call();
    }
  }

  const stepNumber = view === "start" ? 0 : view === "welcome" ? 4 : view;
  const progressValue =
    view === "start" ? 5 : view === 1 ? 33 : view === 2 ? 66 : 100;

  const stepTitle =
    view === "start"
      ? "Welcome to Cevo"
      : view === 1
        ? "Tell us who you are"
        : view === 2
          ? "Where do you study?"
          : view === 3
            ? "How should Cevo write for you?"
            : "You are set up";

  const stepCopy =
    view === "start"
      ? "Three short steps stand between you and your workspace. Your answers shape your templates, and finishing adds 50 welcome credits once."
      : view === 1
        ? "Step 1 of 3. This is the personalization that shapes everything after it."
        : view === 2
          ? "Step 2 of 3. Pick from the lists or suggest a missing name to keep moving."
          : view === 3
            ? "Step 3 of 3. Confirm your citation style, then claim your credits."
            : "Onboarding is complete. Your workspace is ready.";

  return (
    <div className="grid gap-6 lg:grid-cols-[290px_minmax(0,1fr)]">
      <aside className="flex flex-col gap-5">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCapIcon className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="font-serif text-lg leading-none font-semibold">Cevo</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Academic project workspace
            </p>
          </div>
        </div>

        <nav aria-label="Onboarding progress">
          <ol className="flex flex-col gap-1">
            {STEPS.map((name, i) => {
              const n = i + 1;
              const active = stepNumber === n;
              const done = savedSteps.includes(n) || stepNumber > n;
              return (
                <li
                  key={name}
                  aria-current={active ? "step" : undefined}
                  className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 ${
                    active
                      ? "border-primary/40 bg-accent"
                      : "border-transparent"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                      done
                        ? "bg-primary text-primary-foreground"
                        : active
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground"
                    }`}
                    aria-hidden="true"
                  >
                    {done ? <CheckIcon className="size-3.5" /> : n}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {done && !active
                        ? "Saved"
                        : active
                          ? STEP_DESCRIPTIONS[i]
                          : STEP_DESCRIPTIONS[i]}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="rounded-xl border bg-card p-4">
          <p className="flex items-center gap-2 text-sm font-medium">
            <SparklesIcon className="size-4 text-primary" aria-hidden="true" />
            50 welcome credits
          </p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Granted once when you finish all three steps. They fund your first
            research and drafting runs.
          </p>
        </div>

        <p className="text-xs text-muted-foreground">
          Progress saves as you complete each step. Leave any time and resume
          where you stopped.
        </p>
      </aside>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-2xl">{stepTitle}</CardTitle>
          <CardDescription>{stepCopy}</CardDescription>
          <Progress
            value={progressValue}
            aria-label={
              view === "welcome"
                ? "Onboarding complete"
                : view === "start"
                  ? "Onboarding not started"
                  : `Step ${stepNumber} of 3`
            }
          />
        </CardHeader>
        <CardContent>
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
          {notice && (
            <Alert className="mb-4">
              <AlertDescription>{notice}</AlertDescription>
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
                  className="flex-1"
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
                  >
                    Review from the start
                  </Button>
                )}
              </div>
            </div>
          )}

          {view === 1 && (
            <form onSubmit={submitPersonal} className="flex flex-col gap-4">
              <Field data-invalid={errors["firstName"] ? true : undefined}>
                <FieldLabel htmlFor="firstName">First name</FieldLabel>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                  aria-invalid={errors["firstName"] ? true : undefined}
                />
                {errors["firstName"] && (
                  <FieldError>{errors["firstName"]}</FieldError>
                )}
              </Field>
              <Field data-invalid={errors["lastName"] ? true : undefined}>
                <FieldLabel htmlFor="lastName">Last name</FieldLabel>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                  aria-invalid={errors["lastName"] ? true : undefined}
                />
                {errors["lastName"] && (
                  <FieldError>{errors["lastName"]}</FieldError>
                )}
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field data-invalid={errors["country"] ? true : undefined}>
                  <FieldLabel htmlFor="country">Country</FieldLabel>
                  <Input
                    id="country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    autoComplete="country-name"
                    aria-invalid={errors["country"] ? true : undefined}
                  />
                  {errors["country"] && (
                    <FieldError>{errors["country"]}</FieldError>
                  )}
                </Field>
                <Field>
                  <FieldLabel htmlFor="language">Preferred language</FieldLabel>
                  <FieldDescription>
                    Used for guidance text and templates.
                  </FieldDescription>
                  <NativeSelect
                    id="language"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                  >
                    <NativeSelectOption value="en">English</NativeSelectOption>
                    <NativeSelectOption value="fr">French</NativeSelectOption>
                  </NativeSelect>
                </Field>
              </div>
              <Button type="submit" disabled={pending} aria-busy={pending}>
                {pending && <Spinner aria-hidden="true" />}
                Save and continue
              </Button>
            </form>
          )}

          {view === 2 && (
            <form onSubmit={submitAcademic} className="flex flex-col gap-5">
              <AcademicPicker
                label="University"
                description="Search the list, or suggest a missing school to continue."
                placeholder="Search universities, for example Buea"
                searchPlaceholder="Search again to change university"
                parentReady
                parentHint=""
                customParentActive={false}
                selected={institution}
                customText={customInstitution}
                error={errors["institutionId"] ?? errors["customInstitution"]}
                suggestPending={suggestPending}
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
                }}
                onSuggest={(name) => suggestValue("institution", name)}
              />
              {customInstitution.trim() && (
                <Field>
                  <FieldLabel htmlFor="customInstitution">
                    Suggested university
                  </FieldLabel>
                  <FieldDescription>
                    Edit it here any time before you save this step.
                  </FieldDescription>
                  <Input
                    id="customInstitution"
                    value={customInstitution}
                    onChange={(e) => setCustomInstitution(e.target.value)}
                    maxLength={120}
                  />
                </Field>
              )}

              <AcademicPicker
                label="Faculty"
                description="Filtered by your university."
                placeholder="Search faculties"
                searchPlaceholder="Search again to change faculty"
                parentReady={!!institutionId}
                parentHint="Pick a university first, then search faculties here."
                customParentActive={!institutionId && !!customInstitution.trim()}
                selected={faculty}
                customText={customFaculty}
                error={errors["facultyId"] ?? errors["customFaculty"]}
                suggestPending={suggestPending}
                doSearch={(query, page) =>
                  searchFaculties({ institutionId, query, page }) as Promise<SearchResult>
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
                }}
                onSuggest={(name) => suggestValue("faculty", name)}
              />
              {customFaculty.trim() && (
                <Field>
                  <FieldLabel htmlFor="customFaculty">
                    Suggested faculty
                  </FieldLabel>
                  <Input
                    id="customFaculty"
                    value={customFaculty}
                    onChange={(e) => setCustomFaculty(e.target.value)}
                    maxLength={120}
                  />
                </Field>
              )}

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
                error={errors["departmentId"] ?? errors["customDepartment"]}
                suggestPending={suggestPending}
                doSearch={(query, page) =>
                  searchDepartments({ facultyId, query, page }) as Promise<SearchResult>
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
                }}
                onSuggest={(name) => suggestValue("department", name)}
              />
              {customDepartment.trim() && (
                <Field>
                  <FieldLabel htmlFor="customDepartment">
                    Suggested department
                  </FieldLabel>
                  <Input
                    id="customDepartment"
                    value={customDepartment}
                    onChange={(e) => setCustomDepartment(e.target.value)}
                    maxLength={120}
                  />
                </Field>
              )}

              <AcademicPicker
                label="Programme (optional)"
                description="Filtered by your department. Skip it if nothing fits."
                placeholder="Search programmes"
                searchPlaceholder="Search again to change programme"
                parentReady={!!departmentId}
                parentHint="Pick a department first, then optionally search programmes."
                customParentActive={!departmentId && !!customDepartment.trim()}
                selected={programme}
                customText=""
                error={errors["programmeId"]}
                suggestPending={suggestPending}
                doSearch={(query, page) =>
                  searchProgrammes({ departmentId, query, page }) as Promise<SearchResult>
                }
                onPick={(item) => {
                  setProgramme(item);
                  setProgrammeId(item.id);
                }}
                onClear={() => {
                  setProgramme(null);
                  setProgrammeId("");
                }}
                onSuggest={() => undefined}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="qualification">Qualification</FieldLabel>
                  <NativeSelect
                    id="qualification"
                    value={qualification}
                    onChange={(e) => setQualification(e.target.value)}
                  >
                    <NativeSelectOption value="HND">HND</NativeSelectOption>
                    <NativeSelectOption value="BACHELORS">
                      Bachelors
                    </NativeSelectOption>
                    <NativeSelectOption value="MASTERS">
                      Masters
                    </NativeSelectOption>
                    <NativeSelectOption value="PHD">PhD</NativeSelectOption>
                    <NativeSelectOption value="OTHER">Other</NativeSelectOption>
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
                    aria-invalid={errors["academicSession"] ? true : undefined}
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
                >
                  <ArrowLeftIcon aria-hidden="true" />
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={pending}
                  aria-busy={pending}
                  className="flex-1"
                >
                  {pending && <Spinner aria-hidden="true" />}
                  Save and continue
                </Button>
              </div>
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
                >
                  <NativeSelectOption value="APA_7">APA 7</NativeSelectOption>
                  <NativeSelectOption value="Harvard">Harvard</NativeSelectOption>
                  <NativeSelectOption value="MLA">MLA</NativeSelectOption>
                </NativeSelect>
              </Field>
              <Field>
                <FieldLabel htmlFor="prefLang">Preferred language</FieldLabel>
                <FieldDescription>
                  Winning choice if it differs from step 1. Going back keeps
                  this value in sync.
                </FieldDescription>
                <NativeSelect
                  id="prefLang"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  <NativeSelectOption value="en">English</NativeSelectOption>
                  <NativeSelectOption value="fr">French</NativeSelectOption>
                </NativeSelect>
              </Field>
              <Alert>
                <AlertDescription>
                  Completing this step grants 50 welcome credits once and takes
                  you to your dashboard. Returning here later shows your
                  current state with no extra grant.
                </AlertDescription>
              </Alert>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setView(2)}
                >
                  <ArrowLeftIcon aria-hidden="true" />
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={pending}
                  aria-busy={pending}
                  className="flex-1"
                >
                  {pending && <Spinner aria-hidden="true" />}
                  Complete setup
                </Button>
              </div>
            </form>
          )}

          {view === "welcome" && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <span
                className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground"
                aria-hidden="true"
              >
                <CheckIcon className="size-6" />
              </span>
              <div>
                <p className="font-serif text-xl font-semibold">
                  {walletBalance ?? 50} welcome credits are yours
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your profile, academic place, and preferences are saved.
                  Your dashboard is ready when you are.
                </p>
              </div>
              <Button
                type="button"
                className="w-full sm:w-auto"
                onClick={() => router.push("/dashboard")}
              >
                Go to dashboard
                <ArrowRightIcon aria-hidden="true" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
