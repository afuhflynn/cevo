"use client";

import { CheckIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "cn";

export const PASSWORD_SYMBOL_SET = "!@#$%^&*()_+-=[]{};:,.<>?";
export const PASSWORD_HINT = `At least 12 characters, up to 128. Include upper and lower case, a number, and a symbol such as ${PASSWORD_SYMBOL_SET.slice(0, 8)}.`;

export interface PasswordChecks {
  length: boolean;
  upper: boolean;
  lower: boolean;
  number: boolean;
  symbol: boolean;
}

export function getPasswordChecks(value: string): PasswordChecks {
  return {
    length: value.length >= 12 && value.length <= 128,
    upper: /[A-Z]/.test(value),
    lower: /[a-z]/.test(value),
    number: /[0-9]/.test(value),
    symbol: [...value].some((ch) => PASSWORD_SYMBOL_SET.includes(ch)),
  };
}

export function getPasswordLevel(value: string): 0 | 1 | 2 | 3 | 4 {
  if (!value) return 0;
  const c = getPasswordChecks(value);
  if (!c.length) return 1;
  let level = 1;
  if (c.upper && c.lower) level += 1;
  if (c.number) level += 1;
  if (c.symbol) level = Math.min(4, level + 1);
  return level as 0 | 1 | 2 | 3 | 4;
}

export function isPasswordComplete(value: string): boolean {
  const c = getPasswordChecks(value);
  return c.length && c.upper && c.lower && c.number && c.symbol;
}

const LEVEL_LABEL = ["", "Too weak", "Fair", "Good", "Strong"];

export function PasswordField({
  id,
  label = "Password",
  value,
  onChange,
  autoComplete = "new-password",
  disabled = false,
  withMeter = false,
  withChecklist = false,
  hint,
  error,
  placeholder = "At least 12 characters",
  labelAction,
}: {
  id: string;
  label?: string;
  value: string;
  onChange: (next: string) => void;
  autoComplete?: string;
  disabled?: boolean;
  withMeter?: boolean;
  withChecklist?: boolean;
  hint?: string;
  error?: string | null;
  placeholder?: string;
  labelAction?: React.ReactNode;
}) {
  const [show, setShow] = useState(false);
  const checks = getPasswordChecks(value);
  const level = getPasswordLevel(value);
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint || withChecklist ? hintId : null, error ? errorId : null]
    .filter(Boolean)
    .join(" ");

  return (
    <Field data-invalid={error ? true : undefined}>
      <div className="flex items-center justify-between gap-2">
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        {labelAction}
      </div>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          required
          minLength={12}
          maxLength={128}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className="pr-11"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          disabled={disabled}
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
          className="absolute top-1/2 right-2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50"
        >
          {show ? <span aria-hidden="true" className="text-xs font-medium">Hide</span> : <span aria-hidden="true" className="text-xs font-medium">Show</span>}
        </button>
      </div>
      {withMeter && value.length > 0 && (
        <div className="flex flex-col gap-1.5" aria-live="polite">
          <div
            className="flex gap-1"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={4}
            aria-valuenow={level}
            aria-label={`Password strength: ${LEVEL_LABEL[level]}`}
          >
            {[1, 2, 3, 4].map((i) => (
              <span
                key={i}
                aria-hidden="true"
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors",
                  i <= level
                    ? level <= 1
                      ? "bg-destructive"
                      : level === 2
                        ? "bg-primary/50"
                        : level === 3
                          ? "bg-primary/70"
                          : "bg-primary"
                    : "bg-muted",
                )}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{LEVEL_LABEL[level]}</p>
        </div>
      )}
      {(hint || withChecklist) && (
        <FieldDescription id={hintId}>{hint ?? PASSWORD_HINT}</FieldDescription>
      )}
      {withChecklist && (
        <ul className="flex flex-col gap-1 text-xs" aria-label="Requirements">
          <ChecklistRow pass={checks.length} text="12 to 128 characters" />
          <ChecklistRow pass={checks.upper} text="An upper case letter" />
          <ChecklistRow pass={checks.lower} text="A lower case letter" />
          <ChecklistRow pass={checks.number} text="A number" />
          <ChecklistRow pass={checks.symbol} text="A symbol" />
        </ul>
      )}
      {error && (
        <FieldError id={errorId}>{error}</FieldError>
      )}
    </Field>
  );
}

function ChecklistRow({ pass, text }: { pass: boolean; text: string }) {
  return (
    <li className={cn("inline-flex items-center gap-1.5", pass ? "text-primary" : "text-muted-foreground")}>
      {pass ? <CheckIcon className="size-3.5" aria-hidden="true" /> : <XIcon className="size-3.5" aria-hidden="true" />}
      <span>{text}</span>
    </li>
  );
}
