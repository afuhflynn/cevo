import nodemailer, { type Transporter } from "nodemailer";

const fromAddress = process.env["SMTP_FROM"] ?? "Cevo <no-reply@cevo.example>";

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
}

export function verificationEmailHtml(url: string): string {
  return `<p>Welcome to Cevo. Confirm your email address by clicking the link below. The link expires in 24 hours.</p><p><a href="${url}">Verify my email</a></p><p>If you did not create this account, ignore this message.</p>`;
}

export function resetPasswordEmailHtml(url: string): string {
  return `<p>You asked to reset your Cevo password. Click the link below to choose a new one. The link expires in 60 minutes.</p><p><a href="${url}">Reset my password</a></p><p>If you did not ask for this, ignore this message.</p>`;
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
  });
  if (!hasSmtpConfig()) {
    const link = extractLink(email.html);
    console.info(
      `[auth-email] to=${email.to} subject="${email.subject}" link=${link ?? "(none)"}`,
    );
  }
}
