import {
  createLoader,
  parseAsArrayOf,
  parseAsBoolean,
  parseAsInteger,
  parseAsString,
} from "nuqs/server";

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

export const textSearchParam = {
  search: parseAsString.withDefault(""),
};

export const tagFilterParam = {
  tags: parseAsArrayOf(parseAsString),
};

export const flagFilterParam = {
  only: parseAsBoolean,
};
