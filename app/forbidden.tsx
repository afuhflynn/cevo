import { ShieldAlertIcon } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Forbidden() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <Card className="w-full max-w-md">
        <CardHeader>
          <span className="flex size-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <ShieldAlertIcon className="size-5" aria-hidden="true" />
          </span>
          <CardTitle className="font-serif text-2xl">Access denied</CardTitle>
          <CardDescription>
            You do not have permission to view this page. The attempt has been
            logged. If you believe this is a mistake, contact support.
          </CardDescription>
        </CardHeader>
        <CardFooter className="gap-2">
          <Link
            href="/"
            className={buttonVariants({
              variant: "outline",
              className: "flex-1",
            })}
          >
            Go home
          </Link>
          <Link
            href="/sign-in"
            className={buttonVariants({ className: "flex-1" })}
          >
            Sign in
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
