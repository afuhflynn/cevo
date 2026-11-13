import arcjet, { fixedWindow, tokenBucket } from "@arcjet/next";

const mode = (process.env.NODE_ENV === "production" ? "LIVE" : "DRY_RUN") as
  | "LIVE"
  | "DRY_RUN";

const key = process.env["ARCJET_KEY"];

const signInLimiter = key
  ? arcjet({
      key,
      rules: [
        tokenBucket({
          mode,
          capacity: 5,
          refillRate: 5,
          interval: "60s",
          characteristics: ["ip.src", "accountEmail"],
        }),
      ],
    })
  : null;

const signUpLimiter = key
  ? arcjet({ key, rules: [fixedWindow({ mode, max: 5, window: "1h" })] })
  : null;

const resetByEmailLimiter = key
  ? arcjet({
      key,
      rules: [
        fixedWindow({
          mode,
          max: 3,
          window: "1h",
          characteristics: ["accountEmail"],
        }),
      ],
    })
  : null;

const resetByIpLimiter = key
  ? arcjet({ key, rules: [fixedWindow({ mode, max: 10, window: "1h" })] })
  : null;

const resendLimiter = key
  ? arcjet({
      key,
      rules: [
        fixedWindow({
          mode,
          max: 3,
          window: "1h",
          characteristics: ["accountEmail"],
        }),
      ],
    })
  : null;

const wizardTurnLimiter = key
  ? arcjet({ key, rules: [fixedWindow({ mode, max: 60, window: "1m" })] })
  : null;

const wizardSynthesisLimiter = key
  ? arcjet({ key, rules: [fixedWindow({ mode, max: 10, window: "1h" })] })
  : null;

export type WizardRateLimitKind = "wizard-turn" | "wizard-synthesis";

export async function checkWizardRateLimit(
  req: Request,
  kind: WizardRateLimitKind,
): Promise<boolean> {
  const limiter =
    kind === "wizard-turn" ? wizardTurnLimiter : wizardSynthesisLimiter;
  if (!limiter) return true;
  const decision = await limiter.protect(req);
  if (decision.isErrored()) {
    console.warn(`[arcjet] decision error on ${kind}, failing open`);
    return true;
  }
  return !decision.isDenied();
}

export type AuthRateLimitKind =
  | "sign-in"
  | "sign-up"
  | "password-reset"
  | "resend-verification";

async function isAllowed(
  decision: { isDenied(): boolean; isErrored(): boolean },
  label: string,
): Promise<boolean> {
  if (decision.isErrored()) {
    console.warn(`[arcjet] decision error on ${label}, failing open`);
    return true;
  }
  return !decision.isDenied();
}

export async function checkAuthRateLimit(
  req: Request,
  kind: AuthRateLimitKind,
  email?: string,
): Promise<boolean> {
  switch (kind) {
    case "sign-in": {
      if (!signInLimiter || !email) {
        return true;
      }
      return isAllowed(
        await signInLimiter.protect(req, { accountEmail: email, requested: 1 }),
        kind,
      );
    }
    case "sign-up": {
      if (!signUpLimiter) {
        return true;
      }
      return isAllowed(await signUpLimiter.protect(req), kind);
    }
    case "password-reset": {
      if (!resetByEmailLimiter || !resetByIpLimiter || !email) {
        return true;
      }
      const [byEmail, byIp] = await Promise.all([
        resetByEmailLimiter.protect(req, { accountEmail: email }),
        resetByIpLimiter.protect(req),
      ]);
      return (
        (await isAllowed(byEmail, `${kind}:email`)) &&
        (await isAllowed(byIp, `${kind}:ip`))
      );
    }
    case "resend-verification": {
      if (!resendLimiter || !email) {
        return true;
      }
      return isAllowed(
        await resendLimiter.protect(req, { accountEmail: email }),
        kind,
      );
    }
  }
}
