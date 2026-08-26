import { expect, test } from "@playwright/test";

test("Extra Projects provides a quality note and working table of contents", async ({ page }) => {
  await page.goto("/projects/extra-projects/index.html");

  await expect(page).toHaveTitle("Extra Projects — Michael McNicholas");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Extra Projects");
  await expect(page.getByText("Quality warning", { exact: true })).toBeVisible();

  const contents = page.locator(".contents a");
  await expect(contents).toHaveCount(2);
  await expect(contents.first()).toHaveAttribute("href", "../boolean-logic/index.html");
  await expect(contents.last()).toHaveAttribute("href", "../generative-tree/index.html");

  await page.setViewportSize({ width: 390, height: 844 });
  const dimensions = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));
  expect(dimensions.scrollWidth).toBe(dimensions.innerWidth);
  await page.screenshot({ path: "test-results/extra-projects-home-mobile.png", fullPage: true });
});

test("the archive collection heading links to the Extra Projects homepage", async ({ page }) => {
  await page.goto("/#archive");
  await expect(page.locator(".collection-record > h2 a")).toHaveAttribute("href", "projects/extra-projects/index.html");
});
