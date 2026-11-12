import {
  ArrowLeftIcon,
  BookMarkedIcon,
  FileDownIcon,
  PenLineIcon,
} from "lucide-react";
import Link from "next/link";
import { CevoLogo } from "@/components/cevo-logo";
import { ThemeToggle } from "@/components/theme-toggle";

const highlights = [
  {
    icon: PenLineIcon,
    title: "From idea to structured brief",
    body: "Turn a rough project idea into aims, objectives, and a chapter plan.",
  },
  {
    icon: BookMarkedIcon,
    title: "Verified research, cited properly",
    body: "Real scholarly sources with deterministic APA 7 and Harvard citations.",
  },
  {
    icon: FileDownIcon,
    title: "Export that meets the rules",
    body: "Publication-ready PDF and DOCX output matched to your template.",
  },
];

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="hidden w-full max-w-md flex-col justify-between gap-10 border-r border-border/60 bg-card px-10 py-8 lg:flex">
        <CevoLogo size="lg" href="/" priority />
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <p className="font-serif text-3xl leading-tight text-balance">
              Your academic project, guided from idea to submission.
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Cevo walks you through research, writing, and formatting so your
              report meets institutional guidelines.
            </p>
          </div>
          <ul className="flex flex-col gap-5">
            {highlights.map((item) => (
              <li key={item.title} className="flex gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <item.icon className="size-4" aria-hidden="true" />
                </span>
                <span className="flex flex-col gap-1">
                  <span className="text-sm font-medium">{item.title}</span>
                  <span className="text-sm leading-relaxed text-muted-foreground">
                    {item.body}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-muted-foreground">
          Built for university students in Cameroon and beyond.
        </p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeftIcon className="size-4" aria-hidden="true" />
            Back home
          </Link>
          <ThemeToggle className="size-8" />
        </header>
        <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
          <div className="w-full max-w-md">{children}</div>
        </main>
      </div>
    </div>
  );
}
