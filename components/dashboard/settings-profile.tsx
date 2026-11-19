"use client";

import { CheckCircle2Icon } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import * as React from "react";
import { saveProfile } from "@/app/dashboard/settings/actions";
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
import { cn } from "@/lib/utils";

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1] ?? "") : "";
  const both = `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
  if (both.trim().length > 0) return both;
  return "CE";
}

export function SettingsProfilePanel({
  user,
  student,
}: {
  user: { name: string; email: string; emailVerified: boolean };
  student: {
    firstName: string;
    lastName: string;
    country: string;
    preferredLanguage: string;
  } | null;
}) {
  const router = useRouter();
  const [firstName, setFirstName] = React.useState(student?.firstName ?? "");
  const [lastName, setLastName] = React.useState(student?.lastName ?? "");
  const [country, setCountry] = React.useState(student?.country ?? "");
  const [language, setLanguage] = React.useState(
    student?.preferredLanguage ?? "en",
  );
  const [photoVersion, setPhotoVersion] = React.useState(0);
  const [photoMissing, setPhotoMissing] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const fileRef = React.useRef<HTMLInputElement>(null);

  async function handlePhoto(file: File | null) {
    if (!file || uploading) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file (PNG, JPG, WebP or GIF).", {
        timeout: 4000,
      });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("That photo is larger than 5 MB.", { timeout: 4000 });
      return;
    }
    setUploading(true);
    try {
      const { requestAvatarUpload, confirmAvatarUpload } = await import(
        "@/app/dashboard/settings/actions"
      );
      const presigned = await requestAvatarUpload({
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
      });
      if (!presigned.ok) {
        toast.error("Could not start the upload. Try again.", {
          timeout: 4000,
        });
        return;
      }
      const put = await fetch(presigned.url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!put.ok) {
        toast.error("The upload failed. Check your connection and try again.", {
          timeout: 4000,
        });
        return;
      }
      const confirmed = await confirmAvatarUpload({ key: presigned.key });
      if (!confirmed.ok) {
        toast.error("The upload failed verification. Try again.", {
          timeout: 4000,
        });
        return;
      }
      setPhotoMissing(false);
      setPhotoVersion((v) => v + 1);
      toast.success("Profile photo updated.", { timeout: 4000 });
      router.refresh();
    } catch {
      toast.error("The upload failed. Check your connection and try again.", {
        timeout: 4000,
      });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setSaving(true);
    try {
      const result = await saveProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        country: country.trim(),
        preferredLanguage: language,
      });
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        if (result.error && !result.fieldErrors) {
          toast.error("Could not save. Check your connection and try again.", {
            timeout: 4000,
          });
        }
        return;
      }
      toast.success("Profile saved.", { timeout: 4000 });
      router.refresh();
    } catch {
      toast.error("Could not save. Check your connection and try again.", {
        timeout: 4000,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      aria-label="Profile Information"
      className="rounded-2xl border border-border/60 bg-card p-5 sm:p-8"
    >
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
          Profile Information
        </h1>
        <p className="text-sm text-muted-foreground">
          Update your personal information.
        </p>
      </div>

      <form onSubmit={handleSave} className="mt-6 flex flex-col gap-6">
        <div className="grid items-start gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
          <div className="flex flex-col items-center gap-3">
            <span className="relative flex size-28 items-center justify-center overflow-hidden rounded-full bg-muted text-2xl font-bold text-muted-foreground">
              {!photoMissing ? (
                <Image
                  key={photoVersion}
                  src={`/api/settings/avatar?v=${photoVersion}`}
                  alt=""
                  width={112}
                  height={112}
                  unoptimized
                  className="size-full object-cover"
                  onError={() => setPhotoMissing(true)}
                />
              ) : (
                <span aria-hidden="true">{initialsOf(user.name)}</span>
              )}
            </span>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="sr-only"
              aria-label="Choose a profile photo"
              disabled={uploading}
              onChange={(e) => void handlePhoto(e.target.files?.[0] ?? null)}
            />
            <Button
              type="button"
              variant="outline"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="h-11 rounded-xl px-5 text-sm"
            >
              {uploading && <Spinner aria-hidden="true" />}
              {uploading ? "Uploading…" : "Change Photo"}
            </Button>
          </div>

          <div className="grid min-w-0 flex-1 gap-4 sm:grid-cols-2">
            <Field data-invalid={errors.firstName ? true : undefined}>
              <FieldLabel htmlFor="settings-first-name">First Name</FieldLabel>
              <Input
                id="settings-first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                autoComplete="given-name"
                aria-invalid={errors.firstName ? true : undefined}
                className="h-12 rounded-xl"
              />
              {errors.firstName ? (
                <FieldError>{errors.firstName}</FieldError>
              ) : null}
            </Field>
            <Field data-invalid={errors.lastName ? true : undefined}>
              <FieldLabel htmlFor="settings-last-name">Last Name</FieldLabel>
              <Input
                id="settings-last-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                autoComplete="family-name"
                aria-invalid={errors.lastName ? true : undefined}
                className="h-12 rounded-xl"
              />
              {errors.lastName ? (
                <FieldError>{errors.lastName}</FieldError>
              ) : null}
            </Field>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Field>
                <FieldLabel htmlFor="settings-email">Email Address</FieldLabel>
                <div className="relative">
                  <Input
                    id="settings-email"
                    value={user.email}
                    readOnly
                    aria-readonly="true"
                    aria-describedby="settings-email-note"
                    className="h-12 rounded-xl bg-muted/50 pr-24"
                  />
                  <span
                    className={cn(
                      "absolute top-1/2 right-3 inline-flex -translate-y-1/2 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap",
                      user.emailVerified
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {user.emailVerified && (
                      <CheckCircle2Icon
                        className="size-3.5"
                        aria-hidden="true"
                      />
                    )}
                    {user.emailVerified ? "Verified" : "Unverified"}
                  </span>
                </div>
                <FieldDescription id="settings-email-note">
                  Email changes are not supported yet — contact support if you
                  need one.
                </FieldDescription>
              </Field>
            </div>
            <Field
              data-invalid={errors.country ? true : undefined}
              className="sm:col-span-2"
            >
              <FieldLabel htmlFor="settings-country">Country</FieldLabel>
              <Input
                id="settings-country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                autoComplete="country-name"
                list="settings-country-list"
                aria-invalid={errors.country ? true : undefined}
                className="h-12 rounded-xl"
              />
              <datalist id="settings-country-list">
                <option value="Cameroon" />
                <option value="Nigeria" />
                <option value="Ghana" />
                <option value="Kenya" />
                <option value="South Africa" />
              </datalist>
              {errors.country ? (
                <FieldError>{errors.country}</FieldError>
              ) : null}
            </Field>
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="settings-language">
                Preferred Language
              </FieldLabel>
              <NativeSelect
                id="settings-language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="h-12 rounded-xl"
              >
                <NativeSelectOption value="en">English</NativeSelectOption>
                <NativeSelectOption value="fr">French</NativeSelectOption>
              </NativeSelect>
            </Field>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={saving || uploading}
            aria-busy={saving}
            className="h-11 rounded-xl px-7 text-[15px]"
          >
            {saving && <Spinner aria-hidden="true" />}
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </form>
    </section>
  );
}
