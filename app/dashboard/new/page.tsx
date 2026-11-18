import { NewWizardEntry } from "@/components/wizard/new-wizard-entry";
import { requireUser } from "@/lib/auth-helpers";

export const instant = false;

export default async function NewProjectPage() {
  await requireUser();
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8 sm:px-6 sm:py-10">
      <NewWizardEntry />
    </div>
  );
}
