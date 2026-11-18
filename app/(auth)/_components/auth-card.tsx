import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { CardDescription, CardTitle } from "@/components/ui/card";
import { cn } from "cn";

export function AuthCard({
  icon: Icon,
  iconTone = "primary",
  title,
  description,
  children,
  footer,
}: {
  icon?: LucideIcon;
  iconTone?: "primary" | "destructive";
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col items-center gap-3 text-center">
        {Icon && (
          <span
            className={cn(
              "flex size-12 items-center justify-center rounded-2xl",
              iconTone === "destructive"
                ? "bg-destructive/10 text-destructive"
                : "bg-primary/10 text-primary",
            )}
          >
            <Icon className="size-5" aria-hidden="true" />
          </span>
        )}
        <CardTitle className="text-3xl font-bold tracking-tight text-balance">
          {title}
        </CardTitle>
        {description && (
          <CardDescription className="text-[15px] leading-relaxed">
            {description}
          </CardDescription>
        )}
      </div>
      {children ? (
        <div className="flex flex-col gap-4">{children}</div>
      ) : null}
      {footer && <div className="flex justify-center">{footer}</div>}
    </div>
  );
}

export function AuthFooterLink({ children }: { children: ReactNode }) {
  return (
    <p className="text-center text-sm text-muted-foreground">{children}</p>
  );
}
