import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card className="w-full shadow-sm">
      <CardHeader className="gap-3">
        {Icon && (
          <span
            className={cn(
              "flex size-11 items-center justify-center rounded-xl",
              iconTone === "destructive" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary",
            )}
          >
            <Icon className="size-5" aria-hidden="true" />
          </span>
        )}
        <div className="flex flex-col gap-1.5">
          <CardTitle className="font-serif text-2xl text-balance">{title}</CardTitle>
          {description && <CardDescription className="text-sm leading-relaxed">{description}</CardDescription>}
        </div>
      </CardHeader>
      {children ? <CardContent className="flex flex-col gap-4">{children}</CardContent> : null}
      {footer && <CardFooter className="justify-center">{footer}</CardFooter>}
    </Card>
  );
}

export function AuthFooterLink({ children }: { children: ReactNode }) {
  return <p className="text-center text-sm text-muted-foreground">{children}</p>;
}
