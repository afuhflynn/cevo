import nodemailer, { type Transporter } from "nodemailer";

const fromAddress = process.env["SMTP_FROM"] ?? "Cevo <no-reply@cevo.example>";

/**
 * Cevo blue for mail buttons, pinned at build time from theme `--primary`
 * (`oklch(0.6231 0.188 259.8145)` in `app/globals.css`, renders as #3b82f6).
 * Mail clients cannot read OKLCH, so this hex is kept as a code constant.
 * If the theme primary changes, re-pin this value by hand.
 */
export const CEVO_BRAND_BLUE = "#3b82f6";

function appBaseUrl(): string {
  return process.env["NEXT_PUBLIC_APP_URL"] ?? "http://localhost:3000";
}

function supportContact(): { email: string; display: string } {
  const raw =
    process.env["SUPPORT_EMAIL"] ?? process.env["SMTP_FROM"] ?? fromAddress;
  const match = raw.match(/<([^>]+)>/);
  const email = match?.[1]?.trim() || raw.trim();
  return { email, display: email };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeUrl(url: string): string {
  return escapeHtml(url);
}

export function brandedEmailLayout(
  contentHtml: string,
  preheader: string,
): string {
  const base = appBaseUrl();
  const logoUrl = `${base}/branding/cevo-logo.png`;
  const support = supportContact();

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cevo</title></head><body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;"><div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f3f4f6;"><tr><td align="center" style="padding:24px 12px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:100%;max-width:600px;background-color:#ffffff;border-radius:8px;"><tr><td align="center" style="padding:28px 32px 8px 32px;"><img src="${escapeUrl(logoUrl)}" alt="Cevo" width="160" style="display:block;width:160px;max-width:100%;height:auto;border:0;"><div style="font-size:22px;font-weight:bold;color:#111827;letter-spacing:0.5px;padding-top:8px;">Cevo</div></td></tr><tr><td style="padding:16px 32px 8px 32px;">${contentHtml}</td></tr><tr><td style="padding:16px 32px 28px 32px;border-top:1px solid #e5e7eb;"><p style="margin:0 0 8px 0;font-size:12px;line-height:18px;color:#6b7280;">Need help? Contact <a href="mailto:${escapeHtml(support.email)}" style="color:#3b82f6;text-decoration:underline;">${escapeHtml(support.display)}</a>.</p><p style="margin:0;font-size:12px;line-height:18px;color:#6b7280;"><a href="${escapeUrl(`${base}/support`)}" style="color:#6b7280;text-decoration:underline;">Support</a> &nbsp;·&nbsp; <a href="${escapeUrl(`${base}/terms`)}" style="color:#6b7280;text-decoration:underline;">Terms</a> &nbsp;·&nbsp; <a href="${escapeUrl(`${base}/privacy`)}" style="color:#6b7280;text-decoration:underline;">Privacy</a></p></td></tr></table><p style="font-size:11px;line-height:16px;color:#9ca3af;margin:12px 0 0 0;">You received this because you have a Cevo account. If you did not ask for this, ignore this message.</p></td></tr></table></body></html>`;
}

function actionButton(label: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;"><tr><td align="center" bgcolor="${CEVO_BRAND_BLUE}" style="border-radius:6px;background-color:${CEVO_BRAND_BLUE};"><a href="${escapeUrl(url)}" style="display:inline-block;padding:12px 28px;font-size:16px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:6px;">${escapeHtml(label)}</a></td></tr></table>`;
}

export function verificationEmailHtml(url: string): string {
  const safe = escapeUrl(url);
  const body = `<h1 style="margin:0 0 12px 0;font-size:22px;line-height:28px;color:#111827;">Verify your email</h1><p style="margin:0 0 12px 0;font-size:15px;line-height:22px;color:#374151;">Welcome to Cevo. Confirm your email address by clicking the button below. The link expires in 24 hours.</p>${actionButton("Verify my email", url)}<p style="margin:0 0 6px 0;font-size:13px;line-height:20px;color:#6b7280;">Button not working? Paste this link into your browser:</p><p style="margin:0;font-size:13px;line-height:20px;word-break:break-all;"><a href="${safe}" style="color:#3b82f6;text-decoration:underline;">${safe}</a></p><p style="margin:12px 0 0 0;font-size:13px;line-height:20px;color:#6b7280;">If you did not create this account, ignore this message.</p>`;
  return brandedEmailLayout(
    body,
    "Confirm your Cevo email address to finish signing up.",
  );
}

export function resetPasswordEmailHtml(url: string): string {
  const safe = escapeUrl(url);
  const body = `<h1 style="margin:0 0 12px 0;font-size:22px;line-height:28px;color:#111827;">Reset your password</h1><p style="margin:0 0 12px 0;font-size:15px;line-height:22px;color:#374151;">You asked to reset your Cevo password. Click the button below to choose a new one. The link expires in 60 minutes.</p>${actionButton("Reset my password", url)}<p style="margin:0 0 6px 0;font-size:13px;line-height:20px;color:#6b7280;">Button not working? Paste this link into your browser:</p><p style="margin:0;font-size:13px;line-height:20px;word-break:break-all;"><a href="${safe}" style="color:#3b82f6;text-decoration:underline;">${safe}</a></p><p style="margin:12px 0 0 0;font-size:13px;line-height:20px;color:#6b7280;">If you did not ask for this, ignore this message.</p>`;
  return brandedEmailLayout(
    body,
    "Reset your Cevo password with the link inside.",
  );
}

export function verificationEmailText(url: string): string {
  return `Verify your Cevo email\n\nWelcome to Cevo. Confirm your email address with the link below. The link expires in 24 hours.\n\n${url}\n\nIf you did not create this account, ignore this message.`;
}

export function resetPasswordEmailText(url: string): string {
  return `Reset your Cevo password\n\nYou asked to reset your Cevo password. Use the link below to choose a new one. The link expires in 60 minutes.\n\n${url}\n\nIf you did not ask for this, ignore this message.`;
}

function hasSmtpConfig(): boolean {
  return Boolean(process.env["SMTP_HOST"] && process.env["SMTP_PORT"]);
}

let cachedTransport: Transporter | null = null;

function getTransport(): Transporter {
  if (cachedTransport) {
    return cachedTransport;
  }
  if (hasSmtpConfig()) {
    cachedTransport = nodemailer.createTransport({
      host: process.env["SMTP_HOST"],
      port: Number(process.env["SMTP_PORT"]),
      secure: Number(process.env["SMTP_PORT"]) === 465,
      auth:
        process.env["SMTP_USER"] && process.env["SMTP_PASS"]
          ? {
              user: process.env["SMTP_USER"],
              pass: process.env["SMTP_PASS"],
            }
          : undefined,
    });
  } else {
    cachedTransport = nodemailer.createTransport({
      streamTransport: true,
      newline: "unix",
      buffer: true,
    });
  }
  return cachedTransport;
}

export interface AuthEmail {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

function extractLink(html: string): string | null {
  const match = html.match(/href="([^"]+)"/);
  return match ? (match[1] ?? null) : null;
}

export async function sendAuthEmail(email: AuthEmail): Promise<void> {
  const transport = getTransport();
  await transport.sendMail({
    from: fromAddress,
    to: email.to,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });
  if (!hasSmtpConfig()) {
    const link = extractLink(email.html);
    console.info(
      `[auth-email] to=${email.to} subject="${email.subject}" link=${link ?? "(none)"}`,
    );
  }
}
