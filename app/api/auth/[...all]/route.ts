import { toNextJsHandler } from "better-auth/next-js";
import { NextResponse } from "next/server";
import { type AuthRateLimitKind, checkAuthRateLimit } from "@/lib/arcjet";
import { auth } from "@/lib/auth";
import { db } from "@/lib/prisma";

const { GET: baseGET, POST: basePOST } = toNextJsHandler(auth.handler);

function rateLimitedResponse() {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "RATE_LIMITED",
        message: "Too many attempts. Wait a moment, then try again.",
      },
    },
    { status: 429 },
  );
}

function expiredTokenResponse() {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "TOKEN_EXPIRED",
        message: "This link has expired. Request a fresh one and try again.",
      },
    },
    { status: 410 },
  );
}

async function readToken(req: Request): Promise<string | null> {
  try {
    const body = (await req.clone().json()) as unknown;
    if (body && typeof body === "object" && "token" in body) {
      const token = (body as { token: unknown }).token;
      return typeof token === "string" && token.length > 0 ? token : null;
    }
    return null;
  } catch {
    return null;
  }
}
function inactiveAccountResponse() {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "ACCOUNT_INACTIVE",
        message: "This account has been deactivated. Contact support.",
      },
    },
    { status: 403 },
  );
}

async function readEmail(req: Request): Promise<string | null> {
  try {
    const body = (await req.clone().json()) as unknown;
    if (body && typeof body === "object" && "email" in body) {
      const email = (body as { email: unknown }).email;
      return typeof email === "string" ? email.trim().toLowerCase() : null;
    }
    return null;
  } catch {
    return null;
  }
}

function rateLimitKindFor(pathname: string): AuthRateLimitKind | null {
  if (pathname.endsWith("/sign-in/email")) {
    return "sign-in";
  }
  if (pathname.endsWith("/sign-up/email")) {
    return "sign-up";
  }
  if (pathname.endsWith("/request-password-reset")) {
    return "password-reset";
  }
  if (pathname.endsWith("/send-verification-email")) {
    return "resend-verification";
  }
  return null;
}

export async function POST(req: Request) {
  const pathname = new URL(req.url).pathname;
  const kind = rateLimitKindFor(pathname);
  const email = kind ? await readEmail(req) : null;

  if (kind) {
    const allowed = await checkAuthRateLimit(req, kind, email ?? undefined);
    if (!allowed) {
      return rateLimitedResponse();
    }
  }

  if (pathname.endsWith("/reset-password")) {
    const token = await readToken(req);
    if (token) {
      const row = await db.orm.public.Verification.where({
        identifier: `reset-password:${token}`,
      }).first();
      if (row && row.expiresAt < new Date()) {
        return expiredTokenResponse();
      }
    }
  }

  if (pathname.endsWith("/sign-in/email") && email) {
    const row = await db.orm.public.User.where({ email }).first();
    if (row && row.isActive === false) {
      return inactiveAccountResponse();
    }
  }

  return basePOST(req);
}

export async function GET(req: Request) {
  const res = await baseGET(req);
  const pathname = new URL(req.url).pathname;
  if (pathname.includes("verify-email")) {
    res.headers.set("Referrer-Policy", "no-referrer");
    res.headers.set("Cache-Control", "no-store");
  }
  return res;
}
