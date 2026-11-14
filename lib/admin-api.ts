import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { logTemplateAudit } from "@/lib/templates";

export async function requireAdminApi(request: Request) {
  const user = await getCurrentUser();
  const pathname = new URL(request.url).pathname;
  if (!user) {
    await logTemplateAudit({
      userId: null,
      action: "ADMIN_ACCESS_DENIED",
      targetType: "ROUTE",
      targetId: pathname,
      details: { path: pathname, role: null, reason: "no-session" },
    });
    return {
      error: NextResponse.json(
        { error: "UNAUTHENTICATED" },
        { status: 401 },
      ) as NextResponse,
    };
  }
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    await logTemplateAudit({
      userId: user.id,
      action: "template.access.denied",
      targetType: "ProjectTemplate",
      targetId: "admin-api",
      details: { path: new URL(request.url).pathname, role: user.role },
    });
    return {
      error: NextResponse.json(
        { error: "FORBIDDEN" },
        { status: 403 },
      ) as NextResponse,
    };
  }
  return { user };
}
