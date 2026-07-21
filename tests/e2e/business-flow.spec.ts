import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { expect, type Page, test } from "@playwright/test";

config({ path: ".env.local", override: true });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const canRun =
  Boolean(process.env.BASE_URL || true) &&
  supabaseUrl.includes("54421") &&
  Boolean(serviceRole);

test.skip(!canRun, "Requires local vdb-partners Supabase on 54421 and .env.local service role key.");

function adminClient() {
  return createClient(supabaseUrl, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function createConfirmedUser(role: "owner" | "seller" | "finance_admin") {
  const email = `ui-${role}-${randomUUID()}@example.test`;
  const password = "Ui-E2E-Password-1!";
  const db = adminClient();
  let lastError: unknown;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const { data, error } = await db.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { display_name: `UI ${role}` },
      });
      if (error || !data.user) throw error ?? new Error("Failed to create user");
      const { error: roleError } = await db.from("user_roles").insert({
        user_id: data.user.id,
        role,
      });
      if (roleError) throw roleError;
      return { id: data.user.id, email, password };
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Failed to create confirmed user");
}

async function login(page: Page, email: string, password: string) {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.getByLabel("E-mailadres").fill(email);
  await page.getByLabel("Wachtwoord").fill(password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30_000 }),
    page.getByRole("button", { name: "Inloggen" }).click(),
  ]);
}

test.describe.serial("UI business flow against local Supabase", () => {
  let owner: { id: string; email: string; password: string };
  let seller: { id: string; email: string; password: string };
  let sellerProfileId = "";
  let orderId = "";

  test.beforeAll(async () => {
    owner = await createConfirmedUser("owner");
    seller = await createConfirmedUser("seller");
  });

  test("seller completes onboarding and stays pending review", async ({ page }) => {
    await login(page, seller.email, seller.password);
    await expect(page).toHaveURL(/\/onboarding/);

    await page.getByTestId("onboarding-name").fill("UI Seller");
    await page.getByTestId("onboarding-dob").fill("1995-01-15");
    await page.getByTestId("onboarding-next").click();

    await page.getByTestId("onboarding-public-name").fill("UI Seller");
    await page.getByTestId("onboarding-next").click();

    await page.getByTestId("onboarding-payout-cash").check();
    await page.getByTestId("onboarding-next").click();
    await expect(page.getByTestId("onboarding-step-label")).toContainText("Stap 4 van 4");
    await expect(page.getByTestId("onboarding-verification-message")).toBeVisible();

    await page.getByTestId("onboarding-agreement").check();
    await page.getByTestId("onboarding-submit").click();
    await expect(page.getByText("Aanmelding ingediend")).toBeVisible();

    const db = adminClient();
    const { data: profile } = await db
      .from("seller_profiles")
      .select("id, status")
      .eq("user_id", seller.id)
      .single();
    expect(profile?.status).toBe("pending_review");
    sellerProfileId = profile?.id ?? "";
    expect(sellerProfileId).toBeTruthy();
  });

  test("owner approves pending seller via admin UI", async ({ page }) => {
    await login(page, owner.email, owner.password);
    await expect(page).toHaveURL(/\/admin/);
    await page.goto("/admin/applications");
    await page.getByTestId(`approve-seller-${sellerProfileId}`).click();
    await expect(page.getByTestId(`approve-seller-${sellerProfileId}`)).toHaveCount(0, {
      timeout: 20_000,
    });

    const { data: profile } = await adminClient()
      .from("seller_profiles")
      .select("status")
      .eq("id", sellerProfileId)
      .single();
    expect(profile?.status).toBe("approved");
  });

  test("approved seller registers a sale", async ({ page }) => {
    await login(page, seller.email, seller.password);
    await expect(page).toHaveURL(/\/dashboard/);
    await page.goto("/dashboard/sales/new");
    await page.getByTestId("sale-customer-name").fill("UI Customer");
    await page.getByTestId("sale-customer-email").fill(`customer-${randomUUID()}@example.test`);
    await page.getByTestId("sale-address").fill("Teststraat 1");
    await page.getByTestId("sale-postal-code").fill("1234AB");
    await page.getByTestId("sale-city").fill("Amsterdam");
    await page.getByTestId("submit-sale").click();
    await expect(page.getByTestId("sale-message")).toContainText(/VDB-ORD-/);

    const message = await page.getByTestId("sale-message").innerText();
    const orderNumber = message.match(/VDB-ORD-\d+/)?.[0];
    expect(orderNumber).toBeTruthy();

    const { data: order } = await adminClient()
      .from("orders")
      .select("id, status")
      .eq("order_number", orderNumber!)
      .single();
    expect(order?.status).toBe("submitted");
    orderId = order?.id ?? "";
    expect(orderId).toBeTruthy();
  });

  test("owner completes local payment and delivery settlement", async ({ page }) => {
    await login(page, owner.email, owner.password);
    await page.goto(`/admin/orders/${orderId}`);
    await page.getByTestId("admin-complete-order-flow").click();
    await expect(page.getByTestId("admin-order-status")).toContainText(/delivered|completed/i, {
      timeout: 30_000,
    });

    const db = adminClient();
    const { data: order } = await db.from("orders").select("status, delivered_at").eq("id", orderId).single();
    expect(order?.delivered_at).toBeTruthy();

    const { data: commissions } = await db
      .from("commissions")
      .select("status")
      .eq("order_id", orderId);
    expect(commissions?.length).toBeGreaterThan(0);
    expect(commissions?.every((row) => ["available", "pending", "paid"].includes(row.status))).toBe(true);
  });

  test("seller sees commission after settlement", async ({ page }) => {
    await login(page, seller.email, seller.password);
    await page.goto("/dashboard/commissions");
    await expect(page.getByText(/VDB-COM-/)).toBeVisible();
    await expect(page.getByText(/available|pending|paid/i).first()).toBeVisible();
  });
});
