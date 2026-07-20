import { expect, test } from "@playwright/test";

const unavailable = !process.env.BASE_URL;
test.skip(
  unavailable,
  "Set BASE_URL and start the portal before running E2E smoke tests. Full scenarios also require local Supabase.",
);

test("home page shows VDB branding and payment rule", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("VDB DIGITAL", { exact: true })).toBeVisible();
  await expect(page.getByText(/Klanten betalen altijd rechtstreeks aan VDB Digital Software/i)).toBeVisible();
});

test("login page is accessible", async ({ page }) => {
  await page.goto("/login");
  await expect(page).toHaveURL(/\/login/);
});

test("registration page is accessible", async ({ page }) => {
  await page.goto("/register");
  await expect(page).toHaveURL(/\/register/);
});
