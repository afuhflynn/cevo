import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const PUBLIC_PREFIXES = [
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/pricing",
  "/terms",
  "/privacy",
  "/refunds",
  "/api/auth",
  "/_next",
  "/favicon",
  "/apple-touch",
  "/branding",
  "/brands",
  "/robots.txt",
  "/sitemap.xml",
];

export async function proxy(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const path = url.pathname;
  // Public static assets (favicons, brand art, page illustrations) need no
  // session — Next itself serves them openly, and the image optimizer fetches
  // them internally without credentials.
  if (
    /\.(png|jpe?g|svg|webp|avif|gif|ico|css|js|woff2?|ttf|map|txt|xml)$/i.test(
      path,
    )
  ) {
    return NextResponse.next();
  }
  if (
    path === "/" ||
    PUBLIC_PREFIXES.some(
      (p) => path === p || path.startsWith(`${p}/`) || path.startsWith(p),
    )
  ) {
    return NextResponse.next();
  }
  if (path.startsWith("/onboarding")) {
    return NextResponse.next();
  }
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }
    const signIn = new URL("/sign-in", url);
    return NextResponse.redirect(signIn);
  }
  if (path.startsWith("/api/")) {
    return NextResponse.next();
  }
  if (path.startsWith("/admin")) {
    return NextResponse.next();
  }
  const { db } = await import("@/lib/prisma");
  const profile = await db.orm.public.StudentProfile.where({
    userId: session.user.id,
  }).first();
  if (!profile || profile.onboardingCompleted !== true) {
    const onboarding = new URL("/onboarding", url);
    const step = url.searchParams.get("step");
    if (step) onboarding.searchParams.set("step", step);
    return NextResponse.redirect(onboarding);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
