# Changelog

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0/).

## [Unreleased]

### Added
- Email and password authentication: sign up, email verification, sign in, password reset, and sign out, with role guarded admin routes and denied attempt audit logging (see spec 0002)
- Arcjet rate limiting on public auth endpoints with fail open behavior when the decision service errs
- Mailpit dev mail capture through Docker Compose plus documented SMTP settings
- Sign in, sign up, forgot password, and reset password pages with loading, error, and success states
- Type safe URL search params through nuqs with per route loaders, shared pagination and filter building blocks, and the rule in `docs/SEARCH_PARAMS.md`

### Fixed
- Regenerated corrupt favicon and touch icons that broke every route compilation in dev
- Auth rate limit rules now key on a non reserved characteristic name so decisions run instead of failing open
- Auth error messages now read the nested client error shape, so rate limit, deactivated account, and expired token messages display as intended
- `pnpm build` and `db:generate` scripts now run the Prisma 8 contract emit instead of the removed `prisma generate` command

### Security
- Passwords hashed with Argon2id, sessions expire after 30 days of sliding activity, reset tokens are single use and expire after one hour
- Signup and reset responses stay generic so addresses cannot be enumerated
- Admin routes read the role from the database on every request, so demotion takes effect at once
