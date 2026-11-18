import { cn } from "cn";

export const WIZARD_STEPS = [
  "Basics",
  "Idea",
  "Details",
  "Template",
  "Review",
] as const;

/** Server currentStep (1..5) required before new-step N (1..5) unlocks. */
export const REQUIRED_SERVER_STEP: Record<number, number> = {
  1: 1,
  2: 1,
  3: 3,
  4: 3,
  5: 4,
};

export function WizardStepper({
  active,
  completed,
  onNavigate,
  canGo,
}: {
  /** 1-based active step */
  active: number;
  /** true when step n is done */
  completed: (n: number) => boolean;
  onNavigate?: (n: number) => void;
  canGo?: (n: number) => boolean;
}) {
  return (
    <nav aria-label="New project progress" className="w-full">
      <ol className="flex items-center">
        {WIZARD_STEPS.map((name, i) => {
          const n = i + 1;
          const isActive = active === n;
          const done = completed(n);
          const allowed = canGo ? canGo(n) : true;
          const clickable = !!onNavigate && allowed && !isActive;
          return (
            <li key={name} className="flex items-center">
              <span
                aria-current={isActive ? "step" : undefined}
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                  isActive || done
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {n}
              </span>
              {clickable && onNavigate ? (
                <button
                  type="button"
                  onClick={() => onNavigate(n)}
                  className="ml-2 hidden text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline min-[480px]:inline"
                >
                  {name}
                </button>
              ) : (
                <span
                  className={cn(
                    "ml-2 text-sm",
                    isActive
                      ? "font-bold"
                      : "hidden font-medium text-muted-foreground min-[480px]:inline",
                  )}
                >
                  {name}
                </span>
              )}
              {i < WIZARD_STEPS.length - 1 && (
                <span
                  aria-hidden="true"
                  className="mx-1 h-px w-3 bg-muted-foreground/30 min-[480px]:mx-2 min-[480px]:w-10"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
