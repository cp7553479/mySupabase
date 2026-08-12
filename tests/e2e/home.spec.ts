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

test("cookie consent records the visitor choice", async ({ page }) => {
  await page.goto("/en");
  const consent = page.getByRole("complementary", { name: "Cookie consent" });
  await expect(consent).toBeVisible();
  await consent
    .getByRole("button", { name: "Use necessary cookies only" })
    .click();
  await expect(consent).not.toBeVisible();
  await expect
    .poll(
      async () =>
        (await page.context().cookies()).find(
          (cookie) => cookie.name === "logopress_cookie_consent",
        )?.value,
    )
    .toBe("necessary");
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
  await expect(
    page.getByRole("heading", { name: "Related products" }),
  ).toBeVisible();
  await expect(page.getByText("Reinforced Handle Bag")).toBeVisible();
});

test("Chinese blog translations retain the original article content", async ({
  page,
}) => {
  await page.goto("/zh/insights");
  await expect(page.getByText("如何准备一份企业定制商品询单")).toBeVisible();
});

test("blog topics filter the published article list", async ({ page }) => {
  await page.goto("/en/insights?topic=pricing-guidance");
  await expect(
    page.getByText("Understanding quantity-tier pricing"),
  ).toBeVisible();
  await expect(
    page.getByText("Preparing a B2B custom-product enquiry"),
  ).not.toBeVisible();
});

test("published cases, FAQ and resources are available from Supabase", async ({
  page,
}) => {
  await page.goto("/en/resources");

  await expect(
    page.getByRole("link", { name: "Sign in for member resources" }),
  ).toHaveAttribute("href", "/en/account");
  await expect(page.getByText("Event-ready brand kits")).toBeVisible();
  await expect(page.getByText("How does quantity pricing work?")).toBeVisible();
  await expect(
    page.getByText("Custom product enquiry checklist"),
  ).toBeVisible();
  await page.getByRole("link", { name: "View details" }).first().click();
  await expect(
    page.getByRole("heading", { name: "Event-ready brand kits" }),
  ).toBeVisible();

  await page.goto("/en/resources");
  await page.getByText("How does quantity pricing work?").click();
  await expect(
    page.getByText(
      "Select a quantity on the product page to see the applicable tier.",
    ),
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
  await expect(page.getByText("Production lead time: 8 days")).toHaveCount(4);

  await page.getByRole("button", { name: "Shopping Bags" }).click();
  await expect(page.getByText("Reinforced Handle Bag")).toBeVisible();
  await expect(page.getByText("BPA-Free Plastic Cup")).not.toBeVisible();
  await page.getByRole("button", { name: "All products" }).click();
  await page.getByRole("button", { name: "Plastic Cups" }).click();
  await page
    .getByRole("combobox", { name: "Filter by attribute" })
    .selectOption({ label: "Volume: 16" });
  await expect(page.getByText("BPA-Free Plastic Cup")).toBeVisible();
  await expect(page.getByText("Showing 1–1 of 1 products")).toBeVisible();
  await page
    .getByRole("combobox", { name: "Filter by attribute" })
    .selectOption("");
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
    .getByRole("combobox", { name: "Sort products" })
    .selectOption("price-desc");
  await expect(
    page
      .locator('[data-slot="card"]')
      .first()
      .getByText("Multi Band Wireless Vintage Radio with Flashlight"),
  ).toBeVisible();
  await expect(page.getByText("Showing 1–4 of 4 products")).toBeVisible();

  await page
    .locator('[data-slot="card"]')
    .filter({ hasText: "Multi Band Wireless Vintage Radio with Flashlight" })
    .getByRole("link", { name: "View product" })
    .click();
  await expect(page.getByText("Quantity-tier pricing")).toBeVisible();
  await expect(
    page.locator('section[aria-label="Product images"] img'),
  ).toHaveCount(4);
  await expect(page.getByText("Production lead time")).toBeVisible();
  await expect(page.getByText("8 days")).toBeVisible();
  await expect(page.getByText("50–99 Quantity")).toBeVisible();
  await expect(page.getByText("Radios")).toBeVisible();
  await expect(page.getByText("Specifications")).toBeVisible();
  await expect(page.getByText("Length")).toBeVisible();
  await expect(page.getByText("Available services")).toBeVisible();
  await expect(
    page.getByText("Rush Production", { exact: true }),
  ).toBeVisible();
  const rushProduction = page.getByRole("button", {
    name: "Rush Production (5 days)",
  });
  await rushProduction.click();
  await expect(rushProduction).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("Requested delivery date").fill("2026-10-01");
  await page
    .getByLabel("Customisation notes")
    .fill("Include our event artwork.");
  await page.getByRole("button", { name: "Add to enquiry list" }).click();
  await expect(
    page.getByText(
      "Complete the required configuration before adding this item.",
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Full Color" }).click();
  await page.getByRole("button", { name: "Add to enquiry list" }).click();
  await expect(
    page.getByText("Sign in before adding this product to your enquiry list."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save product" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Save product" }).click();
  await expect(page.getByText("Sign in to save products.")).toBeVisible();
  await page.getByRole("button", { name: "Add to compare" }).click();
  await expect(
    page.getByRole("button", { name: "Remove from compare" }),
  ).toBeVisible();
  await page.goto("/en/products/compare");
  await expect(
    page.getByText(
      "Add two or more products from their detail pages to compare specifications, minimum order quantities, pricing and services.",
    ),
  ).toBeVisible();

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

test("account confirmation returns to the selected locale", async ({
  page,
}) => {
  await page.goto("/auth/confirm?locale=zh");

  await expect(page).toHaveURL(/\/zh\/account$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "账户与询单" }),
  ).toBeVisible();
});

test("anonymous visitors are sent to account sign-in before viewing enquiries", async ({
  page,
}) => {
  await page.goto("/en/account/enquiries");

  await expect(page).toHaveURL(/\/en\/account$/);
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
});

test("the enquiry API requires an authenticated account", async ({ page }) => {
  const response = await page.request.post("/api/inquiry-items", {
    data: {
      productId: "00000000-0000-0000-0000-000000000000",
      quantity: 50,
      selections: [],
    },
  });

  expect(response.status()).toBe(401);
  await expect(response.json()).resolves.toEqual({
    error: "Authentication required.",
  });
});

test("draft enquiry items cannot be changed without an authenticated account", async ({
  page,
}) => {
  const response = await page.request.delete(
    "/api/inquiry-items/00000000-0000-0000-0000-000000000000",
  );

  expect(response.status()).toBe(401);
  await expect(response.json()).resolves.toEqual({
    error: "Authentication required.",
  });

  const updateResponse = await page.request.patch(
    "/api/inquiry-items/00000000-0000-0000-0000-000000000000",
    { data: { quantity: 100 } },
  );

  expect(updateResponse.status()).toBe(401);
  await expect(updateResponse.json()).resolves.toEqual({
    error: "Authentication required.",
  });
});

test("submitting an enquiry requires an authenticated account", async ({
  page,
}) => {
  const response = await page.request.post(
    "/api/inquiries/00000000-0000-0000-0000-000000000000/submit",
    { data: { contactEmail: "buyer@example.test", contactName: "Buyer" } },
  );

  expect(response.status()).toBe(401);
});

test("submitted enquiry history remains protected", async ({ page }) => {
  await page.goto("/en/account/enquiries");
  await expect(page).toHaveURL(/\/en\/account$/);
});

test("attaching files to an enquiry requires an authenticated account", async ({
  page,
}) => {
  const response = await page.request.post(
    "/api/inquiries/00000000-0000-0000-0000-000000000000/attachments",
    {
      data: {
        byteSize: 10,
        filename: "reference.pdf",
        objectPath: "x/reference.pdf",
      },
    },
  );
  expect(response.status()).toBe(401);
});

test("updating a profile requires an authenticated account", async ({
  page,
}) => {
  const response = await page.request.put("/api/account/profile", {
    data: { fullName: "Buyer" },
  });
  expect(response.status()).toBe(401);
});

test("creating a company profile requires an authenticated account", async ({
  page,
}) => {
  const response = await page.request.post("/api/account/organization", {
    data: { name: "Example Company" },
  });

  expect(response.status()).toBe(401);
});

test("saving a company delivery address requires an authenticated account", async ({
  page,
}) => {
  const response = await page.request.put("/api/account/organization-address", {
    data: { city: "London", countryCode: "GB", line1: "1 Example Street" },
  });

  expect(response.status()).toBe(401);
});

test("saved products require an authenticated account", async ({ page }) => {
  const response = await page.request.get("/api/favorites");
  expect(response.status()).toBe(401);
  await page.goto("/en/account/favorites");
  await expect(page).toHaveURL(/\/en\/account$/);
});
