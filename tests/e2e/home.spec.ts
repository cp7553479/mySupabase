import { expect, test } from "@playwright/test";

test("home page is reachable", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/LogoPress/);
  await expect(
    page.getByRole("heading", { level: 1, name: "LogoPress" }),
  ).toBeVisible();
});
