import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireUser } from "@/lib/auth-helpers";
import { getOnboardingState } from "@/lib/onboarding";
import { db } from "@/lib/prisma";

export const instant = false;

export default async function DashboardPage() {
  const user = await requireUser();
  const state = await getOnboardingState(user.id);
  const wallet = await db.orm.public.CreditWallet.where({
    userId: user.id,
  }).first();
  const student = state.student;
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div>
        <h1 className="font-serif text-3xl">
          Welcome{student?.firstName ? `, ${student.firstName}` : ""}.
        </h1>
        <p className="text-sm text-muted-foreground">
          Your academic profile is ready. You hold {wallet?.balance ?? 0}{" "}
          credits.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Start a project</CardTitle>
            <CardDescription>
              Create your first academic project brief.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/dashboard"
              className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground"
            >
              Open catalog soon
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Your profile</CardTitle>
            <CardDescription>
              {state.academic?.customInstitution ?? "University saved"} ·{" "}
              {state.academic?.qualification ?? ""} ·{" "}
              {state.academic?.academicSession ?? ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/onboarding?step=1"
              className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium"
            >
              Review setup
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
