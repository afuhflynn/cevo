# Git Workflow for Feature Branches and PRs

This workflow is used when `AGENTS.md` contains `integration: on`.

## Branch Naming

```
feature/<scope-number>-<kebab-case-feature-name>
```

Examples:
- `feature/12-inngest-background-engine`
- `feature/13-arcjet-security-rate-limiting`
- `feature/16-landing-page-pricing`

## Workflow Per Feature

### 1. Start Feature

```bash
git fetch origin
git checkout main
git pull origin main
git checkout -b feature/NN-feature-name
```

### 2. Build the Feature

Run `/feature-build <feature>` as normal. All code changes happen on the feature branch.

### 3. Commit at Milestones

Commit after each milestone in the scope's `Build it` checklist:

```bash
git add -A
git commit -m "feat(scope NN): <milestone description>"
```

Use conventional commits:
- `feat(scope NN):` new functionality
- `fix(scope NN):` bug fix
- `refactor(scope NN):` code restructuring
- `test(scope NN):` test additions
- `chore(scope NN):` config, deps, tooling

### 4. Push and Open PR

```bash
git push -u origin feature/NN-feature-name
gh pr create --title "feat(scope NN): <feature name>" --body "
## Summary
<one line from scope's Done when>

## Scope
Closes feature NN in docs/scope/scope.md

## Checklist
- [ ] Build passes (pnpm build)
- [ ] Lint passes (pnpm lint)
- [ ] Tests pass (pnpm test)
- [ ] All scope milestones complete
- [ ] Spec status updated to Accepted
"

### 5. Review and Merge

- CI runs on PR (build, lint, test)
- Address review feedback with additional commits
- Squash and merge when approved
- Delete feature branch after merge

### 6. Sync After Merge

```bash
git checkout main
git pull origin main
git branch -d feature/NN-feature-name
```

## Scope Updates

The `/feature-build` skill updates `docs/scope/scope.md` in place:
- Status → `in-progress` when build starts
- Milestone checkboxes ticked as each lands
- Spec pointer line filled with code path
- Status → `done` when you confirm

These scope changes are committed with the feature's final commit.

## Spec Status

- Spec `Status: Proposed` → `In Progress` when build starts
- Spec `Status: In Progress` → `Accepted` when feature ships (merged to main)
- `/feature-build` only touches the Status line surgically

## CI Pipeline (Recommended)

```yaml
# .github/workflows/ci.yml
on:
  pull_request:
    branches: [main]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm build
      - run: pnpm test
```

## Emergency Hotfix

For urgent fixes to main:

```bash
git checkout main
git pull origin main
git checkout -b hotfix/<description>
# fix, test, commit
git push -u origin hotfix/<description>
gh pr create --title "hotfix: <description>" --base main
# merge after CI passes
```