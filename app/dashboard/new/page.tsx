import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const instant = false;

export default function NewProjectPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10 sm:px-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-2xl">
            Start a new project
          </CardTitle>
          <CardDescription>
            The guided creation wizard arrives with the next slice. Your
            dashboard already tracks credits, status, and milestones, so this
            entry stays ready.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Link
            href="/dashboard"
            className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground"
          >
            Back to dashboard
          </Link>
          <Link
            href="/dashboard/archived"
            className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium"
          >
            View archived
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
