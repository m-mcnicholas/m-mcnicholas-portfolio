import { expect, test } from "@playwright/test";

test.describe("semantic archive", () => {
  test.use({ javaScriptEnabled: false });

  test("shows the project archive without JavaScript", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("#study")).toBeHidden();
    await expect(page.locator("#archive")).toBeVisible();
    await expect(page.locator(".project-record")).toHaveCount(2);
    await expect(page.locator(".project-record:not(.information-record)")).toHaveCount(1);
    const collection = page.locator(".collection-record");
    await expect(collection.locator(":scope > h2")).toHaveText("Extra Projects");
    await expect(collection.locator(".project-page")).toHaveCount(2);
    await expect(collection.locator(".project-page").first().locator("a")).toHaveAttribute("href", "projects/boolean-logic/index.html");
    await expect(collection.locator(".project-page").last().locator("a")).toHaveAttribute("href", "projects/generative-tree/index.html");
  });

  test("fits a phone viewport without horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const dimensions = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth
    }));
    expect(dimensions.scrollWidth).toBe(dimensions.innerWidth);
    await expect(page.locator(".project-record").last()).toBeVisible();
    await page.screenshot({ path: "test-results/archive-mobile-no-js.png", fullPage: true });
  });
});

test("the JavaScript-enabled phone experience remains the complete archive", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium", "Phone-specific responsive check");
  await page.goto("/");
  await expect(page.locator("#archive")).toBeVisible();
  await expect(page.locator("#study")).toBeHidden();
  await expect(page.locator(".project-record:not(.information-record)")).toHaveCount(1);
  await expect(page.locator(".collection-record .project-page")).toHaveCount(2);
  const dimensions = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));
  expect(dimensions.scrollWidth).toBe(dimensions.innerWidth);
});
