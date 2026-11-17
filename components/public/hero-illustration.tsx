import { Badge } from "@/components/ui/badge";

/**
 * Bespoke hero illustration, built from tokens only (no raster assets).
 * Layered documents + graduation cap on a periwinkle cube + trust badge,
 * composed to echo the approved design mock. v1 is static; motion lands
 * as a follow-up (float/draw-in, reduced-motion safe).
 * Decorative: the hero heading carries the message, so this is aria-hidden.
 */
export function HeroIllustration() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto h-[400px] w-full max-w-[560px] select-none sm:h-[460px]"
    >
      {/* ambient brand wash */}
      <div className="absolute inset-x-6 top-8 bottom-8 rounded-full bg-primary/[0.07] blur-3xl" />

      {/* pedestal cube */}
      <div className="absolute top-32 right-8 h-60 w-60 rounded-[3rem] bg-gradient-to-b from-primary/25 to-primary/10 blur-[1px] sm:right-14 sm:h-72 sm:w-72" />
      <div className="absolute top-44 right-20 h-40 w-40 rounded-[2.5rem] bg-primary/20 sm:right-28 sm:h-48 sm:w-48" />

      {/* back document */}
      <div className="absolute top-24 left-2 w-48 rotate-[9deg] rounded-[1.75rem] border border-border/70 bg-card p-5 shadow-[0_48px_90px_-28px_var(--color-primary)] sm:left-6 sm:w-60">
        <div className="h-2.5 w-16 rounded-full bg-primary/40" />
        <div className="mt-4 flex flex-col gap-2.5">
          <div className="h-2 w-full rounded-full bg-primary/15" />
          <div className="h-2 w-11/12 rounded-full bg-primary/15" />
          <div className="h-2 w-4/5 rounded-full bg-primary/15" />
          <div className="h-2 w-full rounded-full bg-primary/15" />
          <div className="h-2 w-3/5 rounded-full bg-primary/15" />
        </div>
        <div className="mt-5 h-20 rounded-2xl bg-primary/10" />
      </div>

      {/* front document */}
      <div className="absolute top-10 right-0 w-52 -rotate-[5deg] rounded-[1.75rem] border border-border/70 bg-card p-5 shadow-[0_48px_90px_-24px_var(--color-primary)] sm:right-6 sm:w-64">
        <div className="flex items-center gap-2">
          <span className="size-5 rounded-md bg-primary/50" />
          <div className="h-2.5 w-20 rounded-full bg-primary/30" />
        </div>
        <div className="mt-4 flex flex-col gap-2.5">
          <div className="h-2 w-full rounded-full bg-primary/15" />
          <div className="h-2 w-full rounded-full bg-primary/15" />
          <div className="h-2 w-10/12 rounded-full bg-primary/15" />
          <div className="h-2 w-full rounded-full bg-primary/15" />
          <div className="h-2 w-2/3 rounded-full bg-primary/15" />
        </div>
        <div className="mt-4">
          <span className="rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-medium text-accent-foreground">
            (Ngo Bell, 2023)
          </span>
        </div>
        <div className="mt-3 flex gap-1.5">
          <Badge variant="secondary" className="text-[10px]">
            PDF
          </Badge>
          <Badge variant="secondary" className="text-[10px]">
            DOCX
          </Badge>
        </div>
      </div>

      {/* graduation cap */}
      <svg
        viewBox="0 0 120 92"
        className="absolute top-0 right-16 w-32 rotate-[4deg] drop-shadow-xl sm:right-24 sm:w-36"
      >
        <title>Graduation cap</title>
        <polygon points="60,6 114,30 60,54 6,30" fill="#232a52" />
        <polygon points="60,6 114,30 87,42 33,18" fill="#35406f" />
        <path d="M42 44 L42 62 Q60 72 78 62 L78 44 L60 53 Z" fill="#161b3a" />
        <circle cx="60" cy="30" r="3.5" fill="#f5a623" />
        <line
          x1="60"
          y1="30"
          x2="96"
          y2="46"
          stroke="#f5a623"
          strokeWidth="2.5"
        />
        <line
          x1="96"
          y1="46"
          x2="96"
          y2="64"
          stroke="#f5a623"
          strokeWidth="2.5"
        />
        <rect x="91" y="64" width="10" height="12" rx="3" fill="#f5a623" />
      </svg>
    </div>
  );
}
