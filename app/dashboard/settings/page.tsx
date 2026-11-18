import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/lib/auth-helpers";
import { getOnboardingState } from "@/lib/onboarding";

export const instant = false;

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border/60 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}

export default async function SettingsPage() {
  const user = await requireUser();
  const state = await getOnboardingState(user.id);
  const student = state.student;
  const academic = state.academic;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your account and academic profile. Edit them in onboarding — your
          progress is kept.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
          <CardDescription>
            Signed in as {user.email}. Email changes are not supported yet —
            contact support if you need one.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl>
            <Row label="Name" value={user.name || "—"} />
            <Row label="Email" value={user.email} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Academic profile</CardTitle>
          <CardDescription>
            Used to match institutional templates and citation style.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl>
            <Row
              label="Name"
              value={
                [student?.firstName, student?.lastName]
                  .filter(Boolean)
                  .join(" ") || "—"
              }
            />
            <Row label="Country" value={student?.country || "—"} />
            <Row
              label="Preferred language"
              value={student?.preferredLanguage || "—"}
            />
            <Row label="Qualification" value={academic?.qualification ?? "—"} />
            <Row
              label="Academic session"
              value={academic?.academicSession ?? "—"}
            />
          </dl>
          <Link href="/onboarding" className="mt-4 inline-block">
            <Button variant="outline" className="h-11 rounded-xl px-5 text-sm">
              Edit in onboarding
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
