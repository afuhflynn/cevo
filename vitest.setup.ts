import "@testing-library/jest-dom/vitest";

process.env["BETTER_AUTH_SECRET"] ??= "test-only-secret-not-a-real-secret";
process.env["BETTER_AUTH_URL"] ??= "http://localhost:3000";

if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}
