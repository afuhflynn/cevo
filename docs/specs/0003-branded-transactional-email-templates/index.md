# 0003. Branded transactional email templates

**Date**: 2026-11-12
**Status**: In Progress

## Summary

Cevo sends verification and password reset mail as bare paragraphs with no logo, no button, and no plain text part, so the mail looks generic and can feel like phishing. This spec wraps both mails in one shared branded layout (a common header, body, and footer renderer) with the Cevo logo, a blue action button, a footer with support and legal links, and a matching plain text body. Building it means editing only `lib/email.ts`, adding one optional support contact setting, and proving both mails in Mailpit (the local mail preview tool already in `docker-compose.yml`).

## Requirements

**User stories**:
- As a student, I want verification mail that clearly comes from Cevo so that I trust the link enough to click it.
- As a student, I want password reset mail with a clear action button so that I recover access without confusion.
- As a student on a text only client, I want a readable plain text body so that I can still verify or reset.

**Acceptance criteria** (the contract, each criterion is IDed and independently checkable):
- **AC-1**: Verification mail renders a logo header, a heading, an action button in Cevo blue linking the Better Auth URL, an expiry line stating 24 hours, and a footer with support and legal links; proven in a Mailpit preview.
- **AC-2**: Password reset mail renders the same layout with reset heading and button, an expiry line stating 60 minutes, and the same footer; proven in a Mailpit preview.
- **AC-3**: Each send includes a plain text part carrying the same action link and expiry wording; the Nodemailer text field is set on both mails.
- **AC-4**: HTML uses table layout with inline styles only, no external CSS or web fonts; the message stays readable with images blocked (alt text plus wordmark); the canvas is a centered fluid container capped at 600 pixels on a white background.
- **AC-5**: Subjects, link URLs, token lifetimes, and send triggers in `lib/auth.ts` stay behaviorally identical; only presentation changes and no new mail types are added.

## Decision

**Chosen option**: Option 1: Hand rolled string layout in `lib/email.ts`.

One shared layout helper in the existing mail module styles both mails with no new dependencies. Builder settled details: layout helper named `brandedEmailLayout` with `verificationEmailText` and `resetPasswordEmailText` beside it (keeps every mail helper in one module; runner up is a separate template module, which pays off only when a third mail arrives); header logo is `cevo-logo.png` served by absolute app URL at width 160 with alt text plus a styled Cevo wordmark fallback (runner up is the white background JPG variant if the transparent file proves illegible on white); button blue is a code constant pinned to the exact hex of theme `--primary` at build time (runner up is an env var, rejected because brand color is not per environment config); each mail carries a hidden preheader summarizing its action (runner up is omitting it, which wastes the inbox preview line).

## Feature design

**Data model sketch**:

No persistence. This feature stores nothing: no entities, no columns, no migration. It formats values owned by spec 0002 at send time.

**API surface**:

| Function | Key inputs | Key outputs | Key errors |
|---|---|---|---|
| `brandedEmailLayout` | content HTML string, preheader text | full HTML document string | none, pure function |
| `verificationEmailHtml` | url string | branded HTML string | none, pure function |
| `resetPasswordEmailHtml` | url string | branded HTML string | none, pure function |
| `verificationEmailText` | url string | plain text string with link and 24 hour wording | none, pure function |
| `resetPasswordEmailText` | url string | plain text string with link and 60 minute wording | none, pure function |
| `sendAuthEmail` (extended) | to, subject, html, text optional | sent mail with text part set | transport errors propagate as today |

Call sites in `lib/auth.ts` keep their subjects and pass the matching text alongside the HTML. The optional text parameter keeps existing callers compiling during the change.

**Value sourcing** (every value each mail produces names where it comes from):

| Action | Value produced or displayed | Source |
|---|---|---|
| Render header | logo image URL | `NEXT_PUBLIC_APP_URL` plus `/branding/cevo-logo.png` |
| Render header | wordmark fallback beside logo | literal text Cevo, styled inline |
| Render body | action button link | url parameter from the Better Auth callback |
| Render body | expiry wording | token lifetimes in `lib/auth.ts` (24 hours verify, 60 minutes reset) |
| Render body | preheader summary | literal copy per mail type, written at build |
| Render footer | support contact | `SUPPORT_EMAIL` env, falls back to `SMTP_FROM` |
| Render footer | support, terms, privacy links | `NEXT_PUBLIC_APP_URL` plus `/support`, `/terms`, `/privacy` |
| Render button | Cevo blue background | hex constant pinned from `--primary` in `app/globals.css` at build |
| Send | plain text body | `verificationEmailText` or `resetPasswordEmailText` with the same url |

**Key invariants**:
- Every send sets both HTML and text parts; a missing text part fails the build checklist.
- Interpolated URLs are escaped (ampersands encoded) so query strings never break markup.
- Images are decorative only; with images blocked the heading, button text, link, and footer stay fully readable.
- Subjects, URLs, token lifetimes, and triggers match spec 0002 exactly; this spec changes presentation only.
- Canvas is light throughout; no dark mode variant in this slice.

**Security model**:
- Mail bodies carry token links equivalent to credentials, so bodies contain no additional sensitive data beyond the recipient address.
- Tokens stay single use and short lived per spec 0002; this spec does not alter token handling.
- HTML escaping on interpolated values prevents markup breakage or injection through odd characters.
- Public footer links only; no authenticated URLs in mail.

**Configuration required**:
- `SUPPORT_EMAIL`: footer and reply contact, new and optional with fallback to `SMTP_FROM`.
- `NEXT_PUBLIC_APP_URL`: canonical base for absolute logo URL and footer links, already in use.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`: existing transport settings, unchanged.

**Critical test scenarios** (each maps to an acceptance criterion in ## Requirements):
- Happy path: sign up triggers branded verification mail; Mailpit shows logo, blue button with the correct URL, 24 hour wording, footer links; text part carries the same link, verifies **AC-1**, **AC-3**.
- Happy path: reset request triggers branded reset mail with 60 minute wording and the same layout, verifies **AC-2**, **AC-3**.
- Failure case: preview with images blocked and at narrow phone width stays readable with wordmark, button, and footer intact, verifies **AC-4**.
- Auth/permission: not applicable beyond link secrecy; instead confirm `lib/auth.ts` diff shows subjects, URLs, lifetimes, and triggers untouched, verifies **AC-5**.

## Build plan

Build approach: Tracer Bullet (the project default from the scope header). Stand up the thin thread end to end first (layout plus one mail sent and previewed), then thicken with the second mail, footer wiring, and automated asserts.

1. Add `brandedEmailLayout`, the escape helper, and the pinned blue constant in `lib/email.ts`; brand the verification HTML plus its text part; extend `sendAuthEmail` with the optional text field; preview the verification mail in Mailpit, satisfies **AC-1**, **AC-3**, **AC-4**.
2. Add branded reset HTML plus its text part on the same layout with 60 minute wording, satisfies **AC-2**, **AC-3**.
3. Wire the logo header (absolute URL with alt plus wordmark fallback) and the footer (support contact with fallback, support plus terms plus privacy links from the app URL), satisfies **AC-1**, **AC-2**, **AC-4**.
4. Add unit asserts (logo present, button URL equals the input URL, footer links present, text part present with link, ampersand escaping) and run the Mailpit preview checklist for both mails including images blocked and narrow width; confirm the `lib/auth.ts` diff touches presentation only, satisfies **AC-4**, **AC-5**.

## Consequences

**Positive**:
- Both mails visibly belong to Cevo, raising trust at the exact moment students decide whether a link is safe.
- Plain text parts improve deliverability and keep text only clients working.
- One layout helper means the next mail (welcome, receipts) reuses the brand instead of inventing markup.

**Negative or tradeoffs**:
- Hosted logo needs an absolute app URL, so Mailpit image previews need the dev server running; image blocking is mitigated by the wordmark fallback, not eliminated.
- Hand written table markup is maintained by hand; each future layout tweak touches raw HTML strings.
- Light canvas ignores dark mode client preference; accepted for predictable rendering in this slice.
- One more optional setting (`SUPPORT_EMAIL`) to document and manage.

**Neutral**:
- Cutover is a single commit retiring the old plain markup; rollback is a revert.
- Theme changes to `--primary` need a manual hex re pin in mail code since clients cannot read OKLCH.
- No migration, no new dependency, no route changes.

## Follow-up

- [ ] Confirm `cevo-logo.png` stays legible at width 160 on white in Mailpit; if not, switch the header to the white background variant.
- [ ] Reuse this layout for the welcome mail and payment receipts when those features arrive rather than speccing mail branding again.
- [ ] Watch spam placement for the new markup in production and revisit if the hosted image hurts it.
