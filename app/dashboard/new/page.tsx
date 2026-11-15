import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { NewWizardEntry } from "@/components/wizard/new-wizard-entry";
import { requireUser } from "@/lib/auth-helpers";

export default async function NewProjectPage() {
  await requireUser();
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-2">
        <Link
          href="/dashboard"
          className={buttonVariants({
            variant: "ghost",
            size: "sm",
            className: "w-fit",
          })}
        >
          <ArrowLeftIcon aria-hidden="true" />
          Back to dashboard
        </Link>
        <h1 className="font-serif text-3xl tracking-tight">
          Start a new project
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Give your idea a title and tell us a little context. The guided
          briefing then turns it into an approved academic brief, and approval
          provisions your chapter tree.
        </p>
      </div>
      <NewWizardEntry />
    </div>
  );
}
