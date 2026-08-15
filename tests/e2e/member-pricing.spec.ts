import { expect, test } from "@playwright/test";

const email = process.env.E2E_MEMBER_EMAIL;
const password = process.env.E2E_MEMBER_PASSWORD;

test.skip(!email || !password, "Member test credentials are required.");

test("an approved member receives the member price through enquiry submission", async ({
  page,
}) => {
  await page.goto("/en/account");
  await page.getByLabel("Email address").fill(email!);
  await page.getByLabel("Password").fill(password!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByLabel("Password").fill("");
  await expect(page.getByText(`Signed in as: ${email!}`)).toBeVisible({
    timeout: 30_000,
  });

  await page.goto("/en/products/multi-band-wireless-vintage-radio");
  await expect(
    page.locator("#enquiry-configurator").getByText("$12.57", { exact: true }),
  ).toBeVisible();
  const favoriteResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response.url().includes("/api/favorites"),
  );
  await page.getByRole("button", { name: "Save product" }).click();
  expect((await favoriteResponse).status()).toBe(201);
  await expect(
    page.getByRole("button", { name: "Remove saved product" }),
  ).toBeVisible();
  await page.goto("/en/account/favorites");
  await expect(
    page.getByRole("heading", {
      name: "Multi Band Wireless Vintage Radio with Flashlight",
    }),
  ).toBeVisible();
  await page.goto("/en/products/multi-band-wireless-vintage-radio");
  await expect(
    page.getByRole("button", { name: "Remove saved product" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Full Color" }).click();
  await expect(
    page.locator("#enquiry-configurator").getByText("$13.22", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add to enquiry list" }).click();
  await expect(
    page.getByText(
      "Product added to your draft enquiry. Upload the required file to continue.",
    ),
  ).toBeVisible();

  const attachmentResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response.url().includes("/attachments"),
  );
  await page.locator('input[type="file"]').setInputFiles({
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL7JwAAAABJRU5ErkJggg==",
      "base64",
    ),
    mimeType: "image/png",
    name: "member-artwork.png",
  });
  expect((await attachmentResponse).status()).toBe(201);
  await expect(page.getByText("Attachment added to enquiry.")).toBeVisible();

  await page.goto("/en/account/enquiries");
  await expect(page.getByText("$13.22", { exact: true }).first()).toBeVisible();
  await page.getByLabel("Contact name").fill("Member Test");
  await page.getByLabel("Contact email").fill(email!);
  await page.getByRole("button", { name: "Submit enquiry" }).click();
  await expect(
    page.getByText(/^Your enquiry has been submitted\./),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Submitted enquiries" }),
  ).toBeVisible();
});
