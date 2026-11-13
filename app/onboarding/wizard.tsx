"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
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

const STEPS = ["Personal details", "Academic place", "Preferences"];

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
  const [step, setStep] = useState<1 | 2 | 3>(initialStep);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);

  const [firstName, setFirstName] = useState(initialStudent?.firstName ?? "");
  const [lastName, setLastName] = useState(initialStudent?.lastName ?? "");
  const [country, setCountry] = useState(initialStudent?.country ?? "Cameroon");
  const [language, setLanguage] = useState(
    initialStudent?.preferredLanguage ?? "en",
  );

  const [institutionId, setInstitutionId] = useState(
    initialAcademic?.institutionId ?? "",
  );
  const [customInstitution, setCustomInstitution] = useState(
    initialAcademic?.customInstitution ?? "",
  );
  const [facultyId, setFacultyId] = useState(initialAcademic?.facultyId ?? "");
  const [customFaculty, setCustomFaculty] = useState(
    initialAcademic?.customFaculty ?? "",
  );
  const [departmentId, setDepartmentId] = useState(
    initialAcademic?.departmentId ?? "",
  );
  const [customDepartment, setCustomDepartment] = useState(
    initialAcademic?.customDepartment ?? "",
  );
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

  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [picker, setPicker] = useState<
    "institution" | "faculty" | "department" | "programme" | null
  >(null);
  const [suggestName, setSuggestName] = useState("");

  async function runSearch(kind: typeof picker) {
    setPicker(kind);
    setNotice(null);
    if (kind === "institution") {
      const r = await searchInstitutions({ query, page: 1 });
      if (r.ok) setItems(r.items as Item[]);
    }
    if (kind === "faculty" && institutionId) {
      const r = await searchFaculties({ institutionId, query, page: 1 });
      if (r.ok) setItems(r.items as Item[]);
    }
    if (kind === "department" && facultyId) {
      const r = await searchDepartments({ facultyId, query, page: 1 });
      if (r.ok) setItems(r.items as Item[]);
    }
    if (kind === "programme" && departmentId) {
      const r = await searchProgrammes({ departmentId, query, page: 1 });
      if (r.ok) setItems(r.items as Item[]);
    }
  }

  function pick(item: Item) {
    if (picker === "institution") {
      setInstitutionId(item.id);
      setCustomInstitution("");
      setFacultyId("");
      setDepartmentId("");
      setProgrammeId("");
    }
    if (picker === "faculty") {
      setFacultyId(item.id);
      setCustomFaculty("");
      setDepartmentId("");
      setProgrammeId("");
    }
    if (picker === "department") {
      setDepartmentId(item.id);
      setCustomDepartment("");
      setProgrammeId("");
    }
    if (picker === "programme") setProgrammeId(item.id);
    setPicker(null);
    setItems([]);
  }

  async function runSuggest() {
    if (!suggestName.trim()) return;
    setPending(true);
    try {
      if (picker === "institution" || (!institutionId && !picker)) {
        const r = await suggestInstitution({ name: suggestName });
        if (r.ok && r.name) {
          setCustomInstitution(r.name);
          setInstitutionId("");
          setNotice(
            `Saved suggestion ${r.name}. You can finish onboarding with it.`,
          );
        }
      }
      if (picker === "faculty") {
        const r = await suggestFaculty({ name: suggestName });
        if (r.ok && r.name) {
          setCustomFaculty(r.name);
          setFacultyId("");
          setNotice(`Saved suggestion ${r.name}.`);
        }
      }
      if (picker === "department") {
        const r = await suggestDepartment({ name: suggestName });
        if (r.ok && r.name) {
          setCustomDepartment(r.name);
          setDepartmentId("");
          setNotice(`Saved suggestion ${r.name}.`);
        }
      }
      setSuggestName("");
    } finally {
      setPending(false);
    }
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
      setErrors(r.fieldErrors ?? { form: "Could not save. Try again." });
      return;
    }
    setStep(2);
    router.refresh();
  }

  async function submitAcademic(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setErrors({});
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
      setErrors(
        r.fieldErrors ?? {
          form: "Could not save. Check the highlighted fields.",
        },
      );
      return;
    }
    setStep(3);
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
      setErrors(pref.fieldErrors ?? { form: "Could not save preferences." });
      return;
    }
    const done = await completeOnboarding();
    setPending(false);
    if (!done.ok) {
      setErrors(
        done.fieldErrors ?? { form: "Complete the earlier steps first." },
      );
      if (done.error === "422") router.push("/onboarding?step=2");
      return;
    }
    router.push(done.redirectTo ?? "/dashboard");
    router.refresh();
  }

  const progressValue = step === 1 ? 33 : step === 2 ? 66 : 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif text-2xl">
          Set up your student profile
        </CardTitle>
        <CardDescription>
          Step {step} of 3: {STEPS[step - 1]}. Your progress saves as you go.
        </CardDescription>
        <Progress value={progressValue} aria-label={`Step ${step} of 3`} />
      </CardHeader>
      <CardContent>
        {errors["form"] && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Check this step</AlertTitle>
            <AlertDescription>{errors["form"]}</AlertDescription>
          </Alert>
        )}
        {notice && (
          <Alert className="mb-4">
            <AlertDescription>{notice}</AlertDescription>
          </Alert>
        )}

        {step === 1 && (
          <form onSubmit={submitPersonal} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
              {errors["firstName"] && (
                <p className="text-sm text-destructive">
                  {errors["firstName"]}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
              {errors["lastName"] && (
                <p className="text-sm text-destructive">{errors["lastName"]}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="language">Preferred language</Label>
              <Input
                id="language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={pending} aria-busy={pending}>
              {pending && <Spinner aria-hidden="true" />}
              Save and continue
            </Button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={submitAcademic} className="flex flex-col gap-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search universities, for example Buea"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search institutions"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => runSearch("institution")}
              >
                Search
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => runSearch("institution")}
              >
                Universities
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!institutionId}
                onClick={() => runSearch("faculty")}
              >
                Faculties
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!facultyId}
                onClick={() => runSearch("department")}
              >
                Departments
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!departmentId}
                onClick={() => runSearch("programme")}
              >
                Programmes
              </Button>
            </div>

            {items.length > 0 && (
              <ul className="flex max-h-56 flex-col gap-1 overflow-auto rounded-md border p-2">
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                      onClick={() => pick(item)}
                    >
                      {item.name}
                      {item.code ? (
                        <span className="text-muted-foreground">
                          {" "}
                          · {item.code}
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {picker && items.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No matches. Suggest the name below to continue without waiting.
              </p>
            )}

            <div className="flex gap-2">
              <Input
                placeholder="Suggest a missing name"
                value={suggestName}
                onChange={(e) => setSuggestName(e.target.value)}
                aria-label="Suggest a missing name"
              />
              <Button
                type="button"
                variant="secondary"
                disabled={pending || !suggestName.trim()}
                onClick={runSuggest}
              >
                Suggest
              </Button>
            </div>

            <div className="grid gap-3 rounded-md border p-3 text-sm">
              <p>
                <span className="text-muted-foreground">University: </span>
                {institutionId
                  ? institutionId.slice(0, 8) + " selected"
                  : customInstitution || "none yet"}
              </p>
              <p>
                <span className="text-muted-foreground">Faculty: </span>
                {facultyId ? "selected" : customFaculty || "none yet"}
              </p>
              <p>
                <span className="text-muted-foreground">Department: </span>
                {departmentId ? "selected" : customDepartment || "none yet"}
              </p>
              {customInstitution && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="customInstitution">
                    Suggested university
                  </Label>
                  <Input
                    id="customInstitution"
                    value={customInstitution}
                    onChange={(e) => setCustomInstitution(e.target.value)}
                  />
                </div>
              )}
              {customFaculty && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="customFaculty">Suggested faculty</Label>
                  <Input
                    id="customFaculty"
                    value={customFaculty}
                    onChange={(e) => setCustomFaculty(e.target.value)}
                  />
                </div>
              )}
              {customDepartment && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="customDepartment">Suggested department</Label>
                  <Input
                    id="customDepartment"
                    value={customDepartment}
                    onChange={(e) => setCustomDepartment(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="qualification">Qualification</Label>
                <select
                  id="qualification"
                  className="rounded-md border bg-background px-3 py-2 text-sm"
                  value={qualification}
                  onChange={(e) => setQualification(e.target.value)}
                >
                  <option value="HND">HND</option>
                  <option value="BACHELORS">Bachelors</option>
                  <option value="MASTERS">Masters</option>
                  <option value="PHD">PhD</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="session">Academic session (YYYY/YYYY)</Label>
                <Input
                  id="session"
                  value={session}
                  onChange={(e) => setSession(e.target.value)}
                  placeholder="2024/2025"
                />
                {errors["academicSession"] && (
                  <p className="text-sm text-destructive">
                    {errors["academicSession"]}
                  </p>
                )}
              </div>
            </div>
            {(errors["institutionId"] ||
              errors["facultyId"] ||
              errors["departmentId"]) && (
              <p className="text-sm text-destructive">
                {errors["institutionId"] ??
                  errors["facultyId"] ??
                  errors["departmentId"]}
              </p>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
              >
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

        {step === 3 && (
          <form onSubmit={submitPreferences} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="style">Citation style</Label>
              <select
                id="style"
                className="rounded-md border bg-background px-3 py-2 text-sm"
                value={style}
                onChange={(e) => setStyle(e.target.value)}
              >
                <option value="APA_7">APA 7</option>
                <option value="Harvard">Harvard</option>
                <option value="MLA">MLA</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="prefLang">Preferred language</Label>
              <Input
                id="prefLang"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Completing this step adds 50 welcome credits once and takes you to
              your dashboard.
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(2)}
              >
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
      </CardContent>
    </Card>
  );
}
