import Link from "next/link";

export type LegalSection = {
  id: string;
  title: string;
  body: string;
};

export function LegalArticle({
  title,
  updated,
  intro,
  sections,
}: {
  title: string;
  updated: string;
  intro?: string;
  sections: LegalSection[];
}) {
  return (
    <div className="grid gap-8 lg:grid-cols-[200px_minmax(0,1fr)]">
      <nav
        aria-label="On this page"
        className="lg:sticky lg:top-20 lg:self-start"
      >
        <div className="flex flex-row gap-2 overflow-x-auto rounded-xl border border-border bg-card p-3 lg:flex-col lg:overflow-visible">
          <p className="hidden px-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase lg:block">
            On this page
          </p>
          {sections.map((s) => (
            <Link
              key={s.id}
              href={`#${s.id}`}
              className="shrink-0 rounded-md px-2 py-1.5 text-xs break-words text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {s.title}
            </Link>
          ))}
        </div>
      </nav>
      <article className="mx-auto w-full max-w-[65ch] flex-1">
        <h1 className="font-serif text-3xl text-balance">{title}</h1>
        <p className="mt-2 text-xs text-muted-foreground">
          Last updated: {updated}
        </p>
        {intro && (
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            {intro}
          </p>
        )}
        <div className="mt-6 flex flex-col gap-7">
          {sections.map((s) => (
            <section
              key={s.id}
              id={s.id}
              aria-labelledby={`${s.id}-heading`}
              className="scroll-mt-24 flex flex-col gap-2"
            >
              <h2
                id={`${s.id}-heading`}
                className="text-lg font-medium text-balance"
              >
                {s.title}
              </h2>
              <p className="text-sm leading-relaxed break-words text-muted-foreground">
                {s.body}
              </p>
            </section>
          ))}
        </div>
      </article>
    </div>
  );
}
