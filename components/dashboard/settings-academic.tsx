"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import {
  saveAcademicStep,
  searchDepartments,
  searchFaculties,
  searchInstitutions,
  searchProgrammes,
  suggestDepartment,
  suggestFaculty,
  suggestInstitution,
} from "@/app/onboarding/actions";
import {
  AcademicPicker,
  type Item,
  type SearchResult,
} from "@/components/dashboard/academic-picker";
import type { AcademicInfo } from "@/components/dashboard/settings-tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";

function item(id: string | null, name: string | null): Item | null {
  if (!id || !name) return null;
  return { id, name };
}

export function SettingsAcademicPanel({
  academic,
  academicNames,
}: {
  academic: AcademicInfo;
  academicNames: Record<string, string>;
}) {
  const router = useRouter();
  const [institution, setInstitution] = React.useState<Item | null>(() =>
    item(
      academic?.institutionId ?? null,
      academic?.institutionId
        ? (academicNames[academic.institutionId] ?? null)
        : null,
    ),
  );
  const [institutionId, setInstitutionId] = React.useState(
    academic?.institutionId ?? "",
  );
  const [customInstitution, setCustomInstitution] = React.useState(
    academic?.customInstitution ?? "",
  );
  const [faculty, setFaculty] = React.useState<Item | null>(() =>
    item(
      academic?.facultyId ?? null,
      academic?.facultyId ? (academicNames[academic.facultyId] ?? null) : null,
    ),
  );
  const [facultyId, setFacultyId] = React.useState(academic?.facultyId ?? "");
  const [customFaculty, setCustomFaculty] = React.useState(
    academic?.customFaculty ?? "",
  );
  const [department, setDepartment] = React.useState<Item | null>(() =>
    item(
      academic?.departmentId ?? null,
      academic?.departmentId
        ? (academicNames[academic.departmentId] ?? null)
        : null,
    ),
  );
  const [departmentId, setDepartmentId] = React.useState(
    academic?.departmentId ?? "",
  );
  const [customDepartment, setCustomDepartment] = React.useState(
    academic?.customDepartment ?? "",
  );
  const [programme, setProgramme] = React.useState<Item | null>(() =>
    item(
      academic?.programmeId ?? null,
      academic?.programmeId
        ? (academicNames[academic.programmeId] ?? null)
        : null,
    ),
  );
  const [programmeId, setProgrammeId] = React.useState(
    academic?.programmeId ?? "",
  );
  const [qualification, setQualification] = React.useState(
    academic?.qualification ?? "",
  );
  const [session, setSession] = React.useState(academic?.academicSession ?? "");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  const uniDone = !!institution || customInstitution.trim().length > 0;
  const facDone = !!faculty || customFaculty.trim().length > 0;
  const depDone = !!department || customDepartment.trim().length > 0;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setFormError(null);
    setPending(true);
    try {
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
          suggestDepartment({ name: customDepartment.trim() }).catch(
            () => null,
          ),
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
      if (!r.ok) {
        if (r.error === "404") {
          setFormError(
            "One of your picks no longer exists. Pick it again from the list.",
          );
        } else if (r.fieldErrors) {
          const out: Record<string, string> = {};
          for (const [key, issues] of Object.entries(r.fieldErrors)) {
            if (issues?.[0]) out[key] = issues[0];
          }
          setErrors(out);
        } else {
          setFormError("Could not save. Try again.");
        }
        return;
      }
      toast.success("Academic profile saved.", { timeout: 4000 });
      router.refresh();
    } catch {
      setFormError("Could not save. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section
      aria-label="Academic profile"
      className="rounded-2xl border border-border/60 bg-card p-5 sm:p-8"
    >
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          Academic Profile
        </h1>
        <p className="text-sm text-muted-foreground">
          Used to match institutional templates and citation style.
        </p>
      </div>

      <form onSubmit={handleSave} className="mt-6 flex flex-col gap-5">
        {formError ? (
          <Alert variant="destructive">
            <AlertTitle>Could not save</AlertTitle>
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}

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
          error={errors.institutionId ?? errors.customInstitution}
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
            onCustomText={setCustomFaculty}
            error={errors.facultyId ?? errors.customFaculty}
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
        ) : null}

        {facDone ? (
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
            error={errors.departmentId ?? errors.customDepartment}
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
        ) : null}

        {depDone ? (
          <>
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
              onCustomText={() => undefined}
              allowCustom={false}
              error={errors.programmeId}
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
                <FieldLabel htmlFor="settings-qualification">
                  Qualification
                </FieldLabel>
                <NativeSelect
                  id="settings-qualification"
                  value={qualification}
                  onChange={(e) => setQualification(e.target.value)}
                  className="h-12 rounded-xl"
                >
                  <NativeSelectOption value="">Select</NativeSelectOption>
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
              <Field data-invalid={errors.academicSession ? true : undefined}>
                <FieldLabel htmlFor="settings-session">
                  Academic session
                </FieldLabel>
                <FieldDescription>
                  Format YYYY/YYYY, for example 2024/2025.
                </FieldDescription>
                <Input
                  id="settings-session"
                  value={session}
                  onChange={(e) => setSession(e.target.value)}
                  placeholder="2024/2025"
                  inputMode="numeric"
                  aria-invalid={errors.academicSession ? true : undefined}
                  className="h-12 rounded-xl"
                />
                {errors.academicSession && (
                  <FieldError>{errors.academicSession}</FieldError>
                )}
              </Field>
            </div>
          </>
        ) : null}

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={pending}
            aria-busy={pending}
            className="h-11 rounded-xl px-7 text-[15px]"
          >
            {pending && <Spinner aria-hidden="true" />}
            {pending ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </form>
    </section>
  );
}
