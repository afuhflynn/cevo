import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();

export interface AuthErrorDetails {
  code?: string;
  message?: string;
  status?: number;
}

/**
 * Reads the code, message, and status out of a Better Auth client error.
 * Native library errors carry them flat ({ code, message, status }); error
 * bodies the app builds itself (the project envelope) arrive nested one
 * level deeper ({ error: { code, message }, status }). Both shapes resolve
 * to the same details here so call sites never guess the depth.
 */
export function toAuthErrorDetails(error: unknown): AuthErrorDetails {
  if (!error || typeof error !== "object") {
    return {};
  }
  const outer = error as Record<string, unknown>;
  const inner = outer["error"];
  const source =
    inner && typeof inner === "object"
      ? (inner as Record<string, unknown>)
      : outer;
  const status = outer["status"];
  return {
    code: typeof source["code"] === "string" ? source["code"] : undefined,
    message:
      typeof source["message"] === "string" ? source["message"] : undefined,
    status: typeof status === "number" ? status : undefined,
  };
}
