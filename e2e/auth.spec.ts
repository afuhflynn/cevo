import { expect, test } from "@playwright/test";

// Mail delivery and the Arcjet decision API sit in these request paths,
// so post submit assertions allow a slow first call.
const slow = { timeout: 20000 };

const stamp = Date.now();
const password = "correct-horse-12";

async function mailIds(
  request: import("@playwright/test").APIRequestContext,
): Promise<Set<string>> {
  const list = await request.get("http://localhost:8025/api/v1/messages");
  expect(list.ok()).toBeTruthy();
  const data = await list.json();
  return new Set(
    (data.messages as Array<{ ID: string }>).map((message) => message.ID),
  );
}

async function newestMailLink(
  request: import("@playwright/test").APIRequestContext,
  subject: string,
  seen: Set<string>,
): Promise<string> {
  const list = await request.get("http://localhost:8025/api/v1/messages");
  expect(list.ok()).toBeTruthy();
  const data = await list.json();
  const fresh = (
    data.messages as Array<{ ID: string; Subject: string }>
  ).filter((message) => message.Subject === subject && !seen.has(message.ID));
  expect(fresh.length).toBeGreaterThan(0);
  const full = await request.get(
    `http://localhost:8025/api/v1/message/${fresh[0]!.ID}`,
  );
  const body = await full.json();
  const match = /href="([^"]+)"/.exec(body.HTML as string);
  expect(match?.[1]).toBeTruthy();
  return match![1]!;
}

test.describe("authentication flows", () => {
  test("AC-1: sign up, verify by email, then sign in", async ({
    page,
    request,
  }) => {
    const email = `e2e-${stamp}@example.com`;
    const seen = await mailIds(request);
    await page.goto("/sign-up");
    await page.getByLabel(/full name/i).fill("E2E User");
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/^password/i).fill(password);
    await page.getByRole("button", { name: /create account/i }).click();

    await expect(page.getByText(/check your inbox/i)).toBeVisible(slow);
    const verifyUrl = await newestMailLink(
      request,
      "Verify your Cevo email",
      seen,
    );
    await page.goto(verifyUrl);
    await expect(page).toHaveURL(/sign-in\?verified=1/);
    await expect(page.getByText(/email verified/i)).toBeVisible();

    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/^password/i).fill(password);
    await page.getByRole("button", { name: /^sign in$/i }).click();
    await expect(page).toHaveURL("http://localhost:3000/", slow);
  });

  test("AC-2: wrong credentials show an error and stay put", async ({
    page,
  }) => {
    await page.goto("/sign-in");
    await page.getByLabel(/email/i).fill("nobody@example.com");
    await page.getByLabel(/^password/i).fill("wrong-password-1");
    await page.getByRole("button", { name: /^sign in$/i }).click();

    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: /incorrect email or password/i }),
    ).toBeVisible(slow);
    await expect(page).toHaveURL(/sign-in/);
  });

  test("AC-3: reset the password by email and sign in with the new one", async ({
    page,
    request,
  }) => {
    const email = `e2e-reset-${stamp}@example.com`;
    const seen = await mailIds(request);
    await page.goto("/sign-up");
    await page.getByLabel(/full name/i).fill("Reset User");
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/^password/i).fill(password);
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page.getByText(/check your inbox/i)).toBeVisible(slow);

    await page.goto("/forgot-password");
    await page.getByLabel(/email/i).fill(email);
    await page.getByRole("button", { name: /send reset link/i }).click();
    await expect(page.getByText(/check your inbox/i)).toBeVisible(slow);

    const resetUrl = await newestMailLink(
      request,
      "Reset your Cevo password",
      seen,
    );
    await page.goto(resetUrl);
    await page.getByLabel(/^new password/i).fill("fresh-horse-99");
    await page.getByLabel(/confirm new password/i).fill("fresh-horse-99");
    await page.getByRole("button", { name: /update password/i }).click();
    await expect(page.getByText(/password updated/i)).toBeVisible(slow);

    await page.goto("/sign-in");
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/^password/i).fill("fresh-horse-99");
    await page.getByRole("button", { name: /^sign in$/i }).click();
    await expect(page).toHaveURL("http://localhost:3000/", slow);
  });

  test("AC-3: an expired reset link shows the expired state", async ({
    page,
  }) => {
    await page.goto("/reset-password?error=expired");
    await expect(page.getByText(/this link has expired/i)).toBeVisible();
    await expect(
      page.getByRole("link", { name: /request a new reset link/i }),
    ).toHaveAttribute("href", "/forgot-password");
  });

  test("AC-1: a verified link landing shows the confirmation notice", async ({
    page,
  }) => {
    await page.goto("/sign-in?verified=1");
    await expect(page.getByText(/email verified/i)).toBeVisible();
  });
});
