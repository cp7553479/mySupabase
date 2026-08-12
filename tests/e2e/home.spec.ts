import { expect, test } from "@playwright/test";

test("English homepage presents the public catalogue entry points", async ({
  page,
}) => {
  await page.goto("/en");

  await expect(page).toHaveTitle(/LogoPress/);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Make every product carry your brand.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Browse catalogue" }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Services" }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Start an enquiry" }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "hello@logopress.example" }),
  ).toBeVisible();
});

test("root selects the default locale and the Chinese route renders its entry point", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/en$/);

  await page.goto("/zh");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "让每一件商品，都承载你的品牌。",
    }),
  ).toBeVisible();
});

test("language selection is remembered for the root entry point", async ({
  page,
}) => {
  await page.goto("/en");
  await page.getByRole("link", { name: "中文" }).first().click();
  await expect(page).toHaveURL(/\/zh$/);

  await page.goto("/");
  await expect(page).toHaveURL(/\/zh$/);
});

test("mobile navigation exposes the catalogue and enquiry paths", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/en");

  await page.locator("summary").click();
  await expect(
    page.getByRole("navigation", { name: "Mobile navigation" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "Mobile navigation" })
      .getByRole("link", { name: "Products" }),
  ).toBeVisible();
});
