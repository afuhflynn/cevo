# Rationale: branded transactional email templates · spec 0003

_Decision record for spec 0003. The build contract lives in `index.md`; this file keeps why the team chose it._

## Context

Verification and reset mail today are plain strings built in `lib/email.ts` and sent through Nodemailer from Better Auth callbacks in `lib/auth.ts`. There is no text part, no branding, and no shared structure, so each future mail would invent its own markup. Students receiving a bare link with no brand have good reason to hesitate, and spam filters score text free HTML mail worse, which hurts deliverability of exactly the mail that unlocks accounts.

The forces shaping this choice are narrow. Only two mails exist and both already flow through one send function, so the change is presentation only over values owned by spec 0002 (subjects, link URLs, token lifetimes). Mail clients are hostile to modern CSS, so the markup must use tables with inline styles, hex colors, and no web fonts; the theme primary is stored as OKLCH in `app/globals.css`, which mail clients cannot read, so an exact hex must be pinned at build time. Logo files already sit in `public/branding/`, Mailpit already captures dev mail on ports 1025 and 8025, and the project carries no mail templating dependency. Scope row 19 asks for logo header, blue button, support and legal footer, plain text fallback, and Mailpit proof, and nothing more.

## Options considered

### Option 1: Hand rolled string layout in `lib/email.ts`

One layout helper plus small HTML and text builders beside the current functions, using table markup with inline styles and zero new dependencies.

**Pros**:
- Smallest diff, lives where mail already lives, full control over every byte clients receive.
- Table markup with inline styles is the proven pattern across Outlook, Gmail, and Apple Mail.

**Cons**:
- Hand written markup must be maintained by hand; no component model beyond string helpers.
- Richer future layouts cost more effort than with a dedicated toolchain.

### Option 2: React Email package

Author templates as components and render them to tested HTML output.

**Pros**:
- Component authoring with a preview server and output tested against common clients.

**Cons**:
- New dependency plus render step for two mails sharing one layout; heavy for this slice.
- The team still learns its client quirks, so most of the testing cost remains.

### Option 3: MJML toolchain

Write MJML markup and compile it to client safe HTML.

**Pros**:
- Best raw client coverage through compiled output.

**Cons**:
- Heaviest new toolchain and a new syntax for the team to carry.
- Overkill for two mails on one layout.

## Rationale

Only two mails share one layout and one send path, so a string helper captures the whole design with no framework to install, learn, or operate. The boring approach wins because the risk sits in client rendering quirks, which every option must still test in Mailpit, and the heavier options add dependency and toolchain cost without removing that testing. Extending the current module in place keeps the diff reviewable against spec 0002 behavior, and the layout stays open for welcome and payment mails later without redesign.
