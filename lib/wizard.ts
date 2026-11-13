import { z } from "zod";

export const WIZARD_FIELD_KEYS = [
  "background",
  "problem",
  "aim",
  "objectives",
  "questions",
  "scope",
  "limitations",
  "methodology",
  "outcomes",
] as const;

export type WizardFieldKey = (typeof WIZARD_FIELD_KEYS)[number];

const FIELD_TO_ENUM: Record<WizardFieldKey, string> = {
  background: "BACKGROUND",
  problem: "PROBLEM",
  aim: "AIM",
  objectives: "OBJECTIVES",
  questions: "QUESTIONS",
  scope: "SCOPE",
  limitations: "LIMITATIONS",
  methodology: "METHODOLOGY",
  outcomes: "OUTCOMES",
};

export function fieldKeyToEnum(key: WizardFieldKey): string {
  return FIELD_TO_ENUM[key];
}

export function enumToFieldKey(value: string): WizardFieldKey | null {
  const lower = value.toLowerCase() as WizardFieldKey;
  return (WIZARD_FIELD_KEYS as readonly string[]).includes(lower)
    ? lower
    : null;
}

export const WIZARD_STEPS = [
  { step: 1, key: "concept", title: "Project concept" },
  { step: 2, key: "context", title: "Academic context" },
  { step: 3, key: "briefing", title: "Conversational briefing" },
  { step: 4, key: "review", title: "Brief review" },
  { step: 5, key: "approval", title: "Approval and provisioning" },
] as const;

export const SUFFICIENCY_MINIMA = {
  background: { kind: "chars", min: 80 },
  problem: { kind: "chars", min: 80 },
  aim: { kind: "chars", min: 40 },
  objectives: { kind: "items", minItems: 3, minItemChars: 20 },
  questions: { kind: "items", minItems: 3, minItemChars: 10 },
  methodology: { kind: "chars", min: 80 },
  scope: { kind: "chars", min: 40 },
  outcomes: { kind: "chars", min: 40 },
  limitations: { kind: "chars", min: 30 },
} as const;

export function unicodeLength(value: string): number {
  return [...value.trim()].length;
}

function splitItems(value: string): string[] {
  return value
    .split(/\n+/)
    .map((line) => line.replace(/^[-*\d.)\s]+/, "").trim())
    .filter((line) => line.length > 0);
}

export function checkFieldSufficient(
  key: WizardFieldKey,
  answerText: string,
): { sufficient: boolean; detail: string } {
  const rule = SUFFICIENCY_MINIMA[key];
  if (rule.kind === "chars") {
    const len = unicodeLength(answerText);
    return {
      sufficient: len >= rule.min,
      detail:
        len >= rule.min
          ? `${len} chars, meets the ${rule.min} minimum`
          : `${len} of ${rule.min} chars needed`,
    };
  }
  const items = splitItems(answerText);
  const thin = items.filter((item) => unicodeLength(item) < rule.minItemChars);
  if (items.length < rule.minItems) {
    return {
      sufficient: false,
      detail: `${items.length} of ${rule.minItems} items listed`,
    };
  }
  if (thin.length > 0) {
    return {
      sufficient: false,
      detail: `${thin.length} item(s) under ${rule.minItemChars} chars`,
    };
  }
  return {
    sufficient: true,
    detail: `${items.length} items, each over ${rule.minItemChars} chars`,
  };
}

export type ReadinessMap = Record<WizardFieldKey, boolean>;

export function emptyReadiness(): ReadinessMap {
  return {
    background: false,
    problem: false,
    aim: false,
    objectives: false,
    questions: false,
    scope: false,
    limitations: false,
    methodology: false,
    outcomes: false,
  };
}

export function computeReadiness(
  answersByField: Partial<Record<WizardFieldKey, string>>,
): ReadinessMap {
  const readiness = emptyReadiness();
  for (const key of WIZARD_FIELD_KEYS) {
    const answer = answersByField[key] ?? "";
    readiness[key] = checkFieldSufficient(key, answer).sufficient;
  }
  return readiness;
}

export function readinessBlockedFields(readiness: ReadinessMap): string[] {
  return WIZARD_FIELD_KEYS.filter((key) => !readiness[key]);
}

export const FIELD_PROMPTS: Record<
  WizardFieldKey,
  { prompt: string; hint: string }
> = {
  background: {
    prompt:
      "Describe the background of your project. What area are you working in, and why does it matter right now?",
    hint: "Name the field, the setting, and one trend that makes this timely.",
  },
  problem: {
    prompt:
      "State the problem your project addresses. What gap, failure, or unanswered question motivates this work?",
    hint: "One clear problem in two to four sentences works best.",
  },
  aim: {
    prompt:
      "Write the overall aim of the project in one or two sentences. What will this project achieve?",
    hint: "Start with To design, To build, To evaluate, or To investigate.",
  },
  objectives: {
    prompt:
      "List at least three specific objectives, one per line. Each should name a concrete deliverable or outcome.",
    hint: "One objective per line, each at least a full clause.",
  },
  questions: {
    prompt:
      "List at least three research questions, one per line. Each should be answerable by your project.",
    hint: "Phrase each as a question ending with a question mark.",
  },
  scope: {
    prompt:
      "Define the scope. What is included, and where do you draw the boundary?",
    hint: "Name the users, platform, or setting, plus one explicit exclusion.",
  },
  limitations: {
    prompt:
      "Name the main limitations. What constraints on time, data, or access apply?",
    hint: "Even one honest constraint keeps the brief credible.",
  },
  methodology: {
    prompt:
      "Describe your methodology. What approach, tools, and evaluation will you use?",
    hint: "Name the method, the stack or instruments, and how you will test it.",
  },
  outcomes: {
    prompt:
      "Describe the expected outcomes. What will exist at the end, and who benefits?",
    hint: "Name the deliverable and the beneficiary in one or two sentences.",
  },
};

const GENERIC_FOLLOW_UPS: Record<WizardFieldKey, string[]> = {
  background: [
    "Which setting or community does this background describe? Add one sentence naming it.",
    "What recent trend makes this background timely? Add one sentence with a concrete example.",
  ],
  problem: [
    "Who feels this problem most directly? Add one sentence naming them.",
    "What happens if the problem stays unsolved? Add one sentence on the cost.",
  ],
  aim: [
    "What single deliverable proves the aim is met? Add a short clause naming it.",
    "Who benefits when the aim succeeds? Add a few words naming them.",
  ],
  objectives: [
    "Add one more objective as its own line, naming a concrete deliverable.",
    "Expand the thinnest objective into a full clause with a named output.",
  ],
  questions: [
    "Add one more research question as its own line ending with a question mark.",
    "Tie one question to a measurable outcome your project can observe.",
  ],
  scope: [
    "Name one explicit exclusion: what is out of scope for this project?",
    "Name the primary user or setting in one short phrase.",
  ],
  limitations: [
    "Name one concrete constraint on time, data, or access in a short sentence.",
    "What is the biggest risk to completion? Add a few words naming it.",
  ],
  methodology: [
    "Name the tools or instruments you will use in one sentence.",
    "How will you evaluate the result? Add one sentence naming the test or metric.",
  ],
  outcomes: [
    "Name the final deliverable in a few words: report, prototype, system, or study.",
    "Who benefits first from the outcome? Add a few words naming them.",
  ],
};

export function followUpFor(
  key: WizardFieldKey,
  answerText: string,
  priorFollowUps: number,
): string | null {
  if (priorFollowUps >= 2) return null;
  const { sufficient } = checkFieldSufficient(key, answerText);
  if (sufficient) return null;
  const pool = GENERIC_FOLLOW_UPS[key];
  return pool[Math.min(priorFollowUps, pool.length - 1)] ?? null;
}

export const briefPayloadSchema = z.object({
  background: z.string().min(80),
  problemStatement: z.string().min(80),
  aim: z.string().min(40),
  objectives: z.array(z.string().min(20)).min(3),
  researchQuestions: z.array(z.string().min(10)).min(3),
  scope: z.string().min(40),
  limitations: z.string().min(30),
  methodology: z.string().min(80),
  expectedOutcomes: z.string().min(40),
});

export type BriefPayload = z.infer<typeof briefPayloadSchema>;

export function answersToBriefInput(
  answers: Record<WizardFieldKey, string>,
): string {
  return WIZARD_FIELD_KEYS.map(
    (key) => `## ${key}\n${answers[key]?.trim() ?? ""}`,
  ).join("\n\n");
}

export const WIZARD_SESSION_TTL_DAYS = Number.parseInt(
  process.env["WIZARD_SESSION_TTL_DAYS"] ?? "30",
  10,
);

export const WIZARD_HOLD_EXPIRY_MINUTES = Number.parseInt(
  process.env["WIZARD_HOLD_EXPIRY_MINUTES"] ?? "15",
  10,
);

export const WIZARD_SYNTHESIS_DAILY_CAP = Number.parseInt(
  process.env["WIZARD_SYNTHESIS_DAILY_CAP"] ?? "10",
  10,
);

export function sessionExpiryDate(from: Date = new Date()): Date {
  const days =
    Number.isFinite(WIZARD_SESSION_TTL_DAYS) && WIZARD_SESSION_TTL_DAYS > 0
      ? WIZARD_SESSION_TTL_DAYS
      : 30;
  return new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
}

export function estimateSynthesisCredits(inputChars: number): number {
  const sampledInputTokens = Math.max(1, Math.ceil(inputChars / 4));
  const expectedOutputTokens = 1800;
  const pricePerMillion = 2_000;
  const estimate =
    ((sampledInputTokens + expectedOutputTokens) / 1_000_000) * pricePerMillion;
  return Math.max(1, Math.ceil(estimate));
}
