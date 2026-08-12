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

test("published blog content is listed and rendered from Supabase", async ({
  page,
}) => {
  await page.goto("/en/insights");
  await expect(
    page.getByText("Preparing a B2B custom-product enquiry"),
  ).toBeVisible();

  await page
    .locator('[data-slot="card"]')
    .filter({ hasText: "Preparing a B2B custom-product enquiry" })
    .getByRole("link", { name: "Read article" })
    .click();
  await expect(
    page.getByText("A stronger enquiry begins with a clear product direction"),
  ).toBeVisible();
});

test("catalogue uses preview products, images and quantity-tier pricing", async ({
  page,
}) => {
  await page.goto("/en/products");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Find a strong starting point for your next brief.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", {
      name: "Multi Band Wireless Vintage Radio with Flashlight",
    }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Shopping Bags" }).click();
  await expect(page.getByText("Reinforced Handle Bag")).toBeVisible();
  await expect(
    page.getByText("Multi Band Wireless Vintage Radio with Flashlight"),
  ).not.toBeVisible();
  await page.getByRole("button", { name: "All products" }).click();
  await page
    .getByRole("searchbox", { name: "Search products or product numbers" })
    .fill("LP0690");
  await expect(
    page.getByText("Multifunctional Mini USB Fan with Light"),
  ).toBeVisible();
  await page
    .getByRole("searchbox", { name: "Search products or product numbers" })
    .fill("");

  await page
    .locator('[data-slot="card"]')
    .filter({ hasText: "Multi Band Wireless Vintage Radio with Flashlight" })
    .getByRole("link", { name: "View product" })
    .click();
  await expect(page.getByText("Quantity-tier pricing")).toBeVisible();
  await expect(page.getByText("50–99 Quantity")).toBeVisible();
  await expect(page.getByText("Radios")).toBeVisible();
  await expect(page.getByText("Specifications")).toBeVisible();
  await expect(page.getByText("Length")).toBeVisible();
  await expect(page.getByText("Available services")).toBeVisible();
  await page.getByRole("button", { name: "Add to enquiry list" }).click();
  await expect(
    page.getByText(
      "Complete the required configuration before adding this item.",
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Full Color" }).click();
  await page.getByRole("button", { name: "Add to enquiry list" }).click();
  await expect(
    page.getByText(
      "Complete the required configuration before adding this item.",
    ),
  ).not.toBeVisible();

  await page.goto("/zh/products");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "为下一次采购发现合适的商品。",
    }),
  ).toBeVisible();
});

test("account entry provides sign-in and registration controls", async ({
  page,
}) => {
  await page.goto("/en/account");
  await expect(
    page.getByRole("heading", { level: 1, name: "Account and enquiries" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  await page
    .getByRole("button", { name: "New here? Create an account" })
    .click();
  await expect(
    page.getByRole("button", { name: "Create account" }),
  ).toBeVisible();
});
