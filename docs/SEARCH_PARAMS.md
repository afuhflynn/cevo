# Search Params Rule: Cevo

Type-safe URL search params are handled with **nuqs** (`nuqs@^2`, currently
2.10.3). This is a project rule, not a suggestion. Every feature that reads
or writes query params must follow it, so params stay typed, validated, and
consistent across the app.

## The rule

1. **Never read `searchParams` ad hoc.** No `params.get("token")`, no manual
   `new URLSearchParams` parsing in pages, no untyped `useSearchParams()`
   calls for values the page depends on.
2. **Declare every route's params once** in `lib/search-params.ts` as a
   descriptor object built from nuqs parsers (`parseAsString`,
   `parseAsInteger`, `parseAsBoolean`, `parseAsArrayOf`, and so on), plus a
   loader made with `createLoader` from `nuqs/server`.
3. **Parse on the server with the loader.** Pages receive
   `searchParams: Promise<SearchParams>` (type from `nuqs/server`) and await
   their loader. Keep dynamic reads behind `<Suspense>` (async loader child
   pattern) so static shells still prerender under `cacheComponents`.
4. **Write URL state with `useQueryState` / `useQueryStates`** from `nuqs`
   (client components). The provider is already wired: `<NuqsAdapter>` wraps
   the app in `components/providers.tsx`. Do not add another adapter.
5. **Validate shapes with Zod at the boundary** when a param must match more
   than a primitive (nuqs loaders parse, they do not validate).

## Pattern

```tsx
// lib/search-params.ts
import { createLoader, parseAsInteger, parseAsString } from "nuqs/server";

export const projectListSearchParams = {
  q: parseAsString,
  status: parseAsString,
  page: parseAsInteger.withDefault(1),
};

export const loadProjectListSearchParams = createLoader(
  projectListSearchParams,
);
```

```tsx
// app/(app)/projects/page.tsx
import { Suspense } from "react";
import type { SearchParams } from "nuqs/server";
import { loadProjectListSearchParams } from "@/lib/search-params";

async function ProjectListLoader({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { q, status, page } = await loadProjectListSearchParams(searchParams);
  return <ProjectList q={q} status={status} page={page} />;
}

export default function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <Suspense fallback={<ProjectListSkeleton />}>
      <ProjectListLoader searchParams={searchParams} />
    </Suspense>
  );
}
```

```tsx
// client component, two-way URL state
"use client";
import { useQueryState } from "nuqs";
import { parseAsString } from "nuqs/server";

const [query, setQuery] = useQueryState("q", parseAsString.withDefault(""));
```

Batch related filters with one update via `useQueryStates`, keyed to the
same descriptor object the loader uses, so client and server can never drift:

```tsx
// client component, batched filter state (dashboard search, sort, page)
"use client";
import { useQueryStates } from "nuqs";
import { projectListSearchParams } from "@/lib/search-params";

const [{ q, status, page }, setFilters] = useQueryStates(
  projectListSearchParams,
);

setFilters({ status: "IN_PROGRESS", page: 1 });
```

## Shared building blocks

`lib/search-params.ts` also exports small parser bases every list route
should spread into its own descriptor instead of redeclaring them:

- `paginationSearchParams`: `page` (default 1), `limit` (default 20)
- `textSearchParam`: `search` (default `""`)
- `tagFilterParam`: `tags` (string array, absent when empty)
- `flagFilterParam`: `only` (boolean flag)

```ts
export const projectListSearchParams = {
  ...textSearchParam,
  ...paginationSearchParams,
  status: parseAsString.withDefault("all"),
  sort: parseAsString.withDefault("newest"),
};
```

Conventions (borrowed from the syntax-spring setup, updated to the current
docs): paginate with `page`/`limit` plus `withDefault`; free text with
`withDefault("")`; single-select filters with `withDefault("all")`;
multi-selects with `parseAsArrayOf(parseAsString)`; toggles with
`parseAsBoolean`. Keep descriptors per route, never one global schema shared
by every page: a global schema leaks unrelated keys into every URL.

## First adopters (reference)

- `app/(auth)/sign-in`: `signInSearchParams` (`verified`, `error` flags).
- `app/(auth)/reset-password`: `resetPasswordSearchParams` (`token`, `error`).

## Sources

- nuqs docs, server-side loaders: https://nuqs.dev/docs/server-side
- nuqs docs, framework adapters: https://nuqs.dev/docs/adapters
- nuqs repo: https://github.com/47ng/nuqs
