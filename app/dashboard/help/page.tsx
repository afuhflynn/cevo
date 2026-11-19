import { HelpFaq } from "@/components/dashboard/help-faq";

export default function HelpPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Help</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Answers to common questions, plus where to get human help.
        </p>
      </div>

      <HelpFaq audience="page" />
    </div>
  );
}
