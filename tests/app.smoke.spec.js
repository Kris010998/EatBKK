import { expect, test } from "@playwright/test";

test("mobile restaurant finder loads verified data", async ({ page, request }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Good food, close by" })).toBeVisible();
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
});
