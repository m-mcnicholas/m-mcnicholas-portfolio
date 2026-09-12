import { expect, test } from "@playwright/test";

test.describe("semantic archive", () => {
  test.use({ javaScriptEnabled: false });

  test("shows the project archive without JavaScript", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("#study")).toBeHidden();
    await expect(page.locator("#archive")).toBeVisible();
    await expect(page.locator(".project-record")).toHaveCount(3);
    await expect(page.locator(".project-record:not(.information-record)")).toHaveCount(2);
    const collection = page.locator(".collection-record");
    await expect(collection.locator(":scope > h2")).toHaveText("Extra Projects");
    await expect(collection.locator(".project-page")).toHaveCount(3);
    await expect(collection.locator(".project-page").first().locator(":scope > a")).toHaveAttribute("href", "projects/extra-projects/index.html");
    await expect(collection.locator(".project-page").nth(1).locator(":scope > a")).toHaveAttribute("href", "projects/boolean-logic/index.html");
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

  test("fits narrow-desktop and tablet widths without horizontal overflow", async ({ page }) => {
    // Below 1100px the desktop study scene never activates (see script.js's
    // desktopQuery), so these widths always render the semantic archive. The
    // archive's own mobile stacking only used to kick in at 760px, leaving a
    // 761-1099px gap where .project-record's desktop grid floors (13rem +
    // 9rem + 18rem, plus gaps/padding) overflowed the viewport.
    for (const width of [800, 900, 1024, 1099]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto("/");
      const dimensions = await page.evaluate(() => ({
        innerWidth: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth
      }));
      expect(dimensions.scrollWidth, `width ${width}`).toBe(dimensions.innerWidth);
      await expect(page.locator(".project-record").last()).toBeVisible();
    }
  });
});

test("the JavaScript-enabled phone experience remains the complete archive", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium", "Phone-specific responsive check");
  await page.goto("/");
  await expect(page.locator("#archive")).toBeVisible();
  await expect(page.locator("#study")).toBeHidden();
  await expect(page.locator(".project-record:not(.information-record)")).toHaveCount(2);
  await expect(page.locator(".collection-record .project-page")).toHaveCount(3);
  const dimensions = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));
  expect(dimensions.scrollWidth).toBe(dimensions.innerWidth);
});
