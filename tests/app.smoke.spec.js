import { expect, test } from "@playwright/test";

test("mobile restaurant finder loads verified data", async ({ page, request, context }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Good food, close by" })).toBeVisible();
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    "https://eat-in-bkk.vercel.app/assets/eat-bkk-social-card.png"
  );
  await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute("content", "1200");
  await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute("content", "630");
  await expect(page.locator(".summary-location-context [data-location-context-text]")).toHaveText(
    "Starting from central Bangkok · Locate me or drag the cat"
  );
  await expect(page.locator("#compactResultCount")).toContainText("near central Bangkok");
  await expect(page.locator(".restaurant-card")).toHaveCount(5);
  await expect(page.getByRole("link", { name: "Report incorrect information" })).toHaveAttribute(
    "href",
    "https://forms.gle/uHMsEYj7UphzyWRW6"
  );

  const reportResponse = await request.get("/data/quality-report.json");
  expect(reportResponse.ok()).toBeTruthy();
  const report = await reportResponse.json();
  await expect(page.locator("#dataUpdatedTime")).toHaveAttribute(
    "datetime",
    report.source_modified_date
  );

  const firstCard = page.locator(".restaurant-card").first();
  const restaurantUrl = await firstCard.getAttribute("data-url");
  const response = await request.get("/restaurants.json");
  expect(response.ok()).toBeTruthy();
  const restaurants = await response.json();
  const restaurant = restaurants.find((item) => item.url === restaurantUrl);

  expect(restaurant).toBeTruthy();
  await expect(firstCard).toContainText(restaurant.rating.toFixed(1));

  const socialCardResponse = await request.get("/assets/eat-bkk-social-card.png");
  expect(socialCardResponse.ok()).toBeTruthy();
  expect(socialCardResponse.headers()["content-type"]).toContain("image/png");

  await context.grantPermissions(["geolocation"], { origin: "http://127.0.0.1:8000" });
  await context.setGeolocation({ latitude: 13.7704175, longitude: 100.6078385 });
  await page.getByRole("button", { name: "Use my current location" }).click();
  await expect(page.locator(".summary-location-context [data-location-context-text]")).toHaveText(
    "Using your current location"
  );
  await expect(page.locator("#compactResultCount")).toContainText("near you");
});
