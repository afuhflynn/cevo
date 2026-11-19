import { HelpFaq } from "@/components/dashboard/help-faq";

export function SettingsHelpPanel() {
  return (
    <section
      aria-label="Help and support"
      className="flex flex-col gap-5 rounded-2xl border border-border/60 bg-card p-5 sm:p-8"
    >
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Help</h1>
        <p className="text-sm text-muted-foreground">
          Answers to common questions, plus where to get human help.
        </p>
      </div>

      <HelpFaq audience="settings" />
    </section>
  );
}
