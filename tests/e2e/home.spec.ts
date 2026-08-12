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
    page.getByText("Find a strong starting point for your next brief."),
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

test("company, contact and legal pages provide a consistent enquiry route", async ({
  page,
}) => {
  for (const path of ["about", "contact", "privacy", "cookies", "terms"]) {
    await page.goto(`/en/${path}`);
    await expect(
      page.getByRole("link", { name: "Start an enquiry" }).first(),
    ).toBeVisible();
  }

  await page.goto("/en/contact");
  await expect(
    page.getByRole("link", { name: "hello@logopress.example" }).first(),
  ).toBeVisible();
});

test("public pages expose language-aware SEO metadata and crawler endpoints", async ({
  page,
}) => {
  await page.goto("/zh");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "/zh",
  );
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute(
    "content",
    "zh",
  );

  const robots = await page.request.get("/robots.txt");
  await expect(robots).toBeOK();
  await expect(await robots.text()).toContain(
    "Sitemap: https://logopress.example/sitemap.xml",
  );

  const sitemap = await page.request.get("/sitemap.xml");
  await expect(sitemap).toBeOK();
  await expect(await sitemap.text()).toContain(
    "https://logopress.example/zh/services",
  );
});

test("public navigation is keyboard reachable and unknown public pages give a recovery route", async ({
  page,
}) => {
  await page.goto("/en");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "LogoPress" }).first(),
  ).toBeFocused();

  await page.goto("/en/unknown-page");
  await expect(
    page.getByRole("heading", { name: "This page is not available." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Return to home" }),
  ).toBeVisible();
});
