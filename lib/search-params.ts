import {
  createLoader,
  parseAsArrayOf,
  parseAsBoolean,
  parseAsInteger,
  parseAsString,
} from "nuqs/server";

export const PROJECT_STATUSES = [
  "DRAFT",
  "PLANNING",
  "IN_PROGRESS",
  "READY_FOR_REVIEW",
  "COMPLETED",
] as const;

export type ProjectStatusFilter = (typeof PROJECT_STATUSES)[number] | "all";

export const dashboardSearchParams = {
  search: parseAsString.withDefault(""),
  status: parseAsString.withDefault("all"),
  page: parseAsInteger.withDefault(1),
};

export const loadDashboardSearchParams = createLoader(dashboardSearchParams);

export const archivedSearchParams = {
  search: parseAsString.withDefault(""),
  page: parseAsInteger.withDefault(1),
};

export const loadArchivedSearchParams = createLoader(archivedSearchParams);

export const signInSearchParams = {
  verified: parseAsString,
  error: parseAsString,
};

export const loadSignInSearchParams = createLoader(signInSearchParams);

export const resetPasswordSearchParams = {
  token: parseAsString,
  error: parseAsString,
};

export const loadResetPasswordSearchParams = createLoader(
  resetPasswordSearchParams,
);

export const paginationSearchParams = {
  page: parseAsInteger.withDefault(1),
  limit: parseAsInteger.withDefault(20),
};

export const wizardSearchParams = {
  status: parseAsString.withDefault("all"),
  page: parseAsInteger.withDefault(1),
};

export const loadWizardSearchParams = createLoader(wizardSearchParams);

export const textSearchParam = {
  search: parseAsString.withDefault(""),
};

export const tagFilterParam = {
  tags: parseAsArrayOf(parseAsString),
};

export const flagFilterParam = {
  only: parseAsBoolean,
};
