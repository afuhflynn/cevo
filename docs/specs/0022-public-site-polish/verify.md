# Verify: public site polish · spec 0022 · updated 2026-11-15
_Steps derived from spec 0022 acceptance criteria. `/verify-release` runs these; `/test-engineer` locks the durable ones._
## UI / manual
- [ ] Visit `/` → hero shows badge plus headline From idea to verified exportable report plus Start your project plus See pricing in XAF → AC-1
- [ ] On `/` → proof band shows workspace mock with 3 chapters plus APA 7 chip plus PDF and DOCX badges, and citation mock, with screen reader alt → AC-2
- [ ] On `/` → sections appear in order: hero, proof, how it works, features, pricing teaser, final call, footer → AC-1
- [ ] Visit `/pricing` → each card shows name plus XAF price plus credits plus one usage hint line, at most one Popular badge → AC-3
- [ ] On `/pricing` → tap Buy logged out → lands on signup with billing next plus packageId; logged in → goes direct to billing checkout with packageId → AC-4
- [ ] Header shows logo plus Pricing plus Sign in plus Get started; shrink under md → hamburger with expanded state, close on navigate → AC-4
- [ ] Footer shows Pricing, Get started, Sign in, Terms, Privacy, Refunds, support mail → AC-4
- [ ] Visit `/terms`, `/privacy`, `/refunds` → narrow prose with anchor nav, stacked on mobile, side anchored on desktop, readable in light and dark → AC-5
- [ ] At 360px wide → grids one column, mock stacks above copy, pricing cards stack, no horizontal scroll, long words break → AC-6
- [ ] Cold load `/` → body renders in Roboto, long reading in Source Serif 4, code in JetBrains Mono, no layout shift → AC-8
- [ ] Visit sign in, sign up, forgot, reset → same card family and flows as spec 0019, only font and rhythm aligned → AC-9
- [ ] With zero active packages → kind empty guidance with contact link plus Create an account anyway, never blank → AC-10
- [ ] With fetch failure → kind Pricing could not load message with contact link; with stale cache → last known prices notice → AC-10
- [ ] Confirm no scroll linked effects and no new motion library in bundle → AC-11
- [ ] Confirm mocks, cards, nav use foundation primitives only, no custom input or dialog or toast styles → AC-12
## Commands
- [ ] `pnpm typecheck` → clean → AC-1 through AC-11
## Acceptance-criteria coverage
- AC-1 … covered by landing order steps · AC-2 … covered by proof band steps · AC-3 … covered by pricing card plus hint steps · AC-4 … covered by header footer plus Buy routing steps · AC-5 … covered by legal steps · AC-6 … covered by responsive step · AC-7 … covered by revalidate plus SEO check below · AC-8 … covered by font step · AC-9 … covered by auth step · AC-10 … covered by empty plus failure steps · AC-11 … covered by motion step · AC-12 … covered by primitives step
- AC-7 detail: hourly cache via `cacheLife("hours")` in `lib/public-pricing.ts` (no `revalidate` export, incompatible with Cache Components); metadataBase canonical plus title plus description per page; OG card; sitemap; robots
