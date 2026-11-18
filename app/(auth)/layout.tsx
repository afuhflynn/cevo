import { CevoLogo } from "@/components/cevo-logo";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background text-foreground">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-72 overflow-hidden"
      >
        <div className="absolute -bottom-28 left-[6%] size-80 rounded-full bg-primary/15" />
        <div className="absolute -bottom-40 left-[30%] size-[26rem] rounded-full bg-primary/10" />
        <div className="absolute -right-12 -bottom-24 size-64 rounded-full bg-primary/[0.07]" />
      </div>
      <main className="relative flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6">
        <CevoLogo size="md" href="/" priority className="mb-8" />
        <div className="w-full max-w-md break-words">{children}</div>
      </main>
    </div>
  );
}
