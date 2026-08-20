import { expect, test } from "@playwright/test";

test("desktop WebGL composition exposes the book and every spine", async ({ page }) => {
  const consoleErrors = [];
  const failedRequests = [];
  const badResponses = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("requestfailed", (request) => failedRequests.push(`${request.method()} ${request.url()}`));
  page.on("response", (response) => {
    if (response.status() >= 400) badResponses.push(`${response.status()} ${response.url()}`);
  });

  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/webgl-ready/);
  await expect(page.locator("#study")).toBeVisible();
  await expect(page.locator("#archive")).toBeHidden();
  await expect(page.locator("#scene-canvas canvas")).toBeVisible();
  await expect(page.locator(".spine-control")).toHaveCount(7);

  const metrics = await page.evaluate(() => {
    const book = document.querySelector("#reading-book").getBoundingClientRect();
    const spines = Array.from(document.querySelectorAll(".spine-control"), (element) => element.getBoundingClientRect());
    return {
      bookWidthRatio: book.width / window.innerWidth,
      book,
      spines,
      viewport: { width: window.innerWidth, height: window.innerHeight }
    };
  });

  expect(metrics.bookWidthRatio).toBeGreaterThanOrEqual(0.55);
  expect(metrics.bookWidthRatio).toBeLessThanOrEqual(0.65);
  for (const spine of metrics.spines) {
    expect(spine.top).toBeGreaterThanOrEqual(0);
    expect(spine.right).toBeLessThanOrEqual(metrics.viewport.width);
    expect(spine.bottom).toBeLessThanOrEqual(metrics.viewport.height);
    expect(spine.height).toBeGreaterThanOrEqual(38);
  }
  expect(consoleErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
  expect(badResponses).toEqual([]);
  await page.screenshot({ path: "test-results/composition-1280x720.png" });

  await page.locator(".spine-control").nth(2).click();
  await page.waitForTimeout(320);
  await expect(page.locator("#selected-title")).toHaveText("Pathfinding Visualizer");
  await expect(page.locator("#selected-date")).toHaveText("April 16, 2026");
  await expect(page.locator("#selected-link")).toBeVisible();
  await page.screenshot({ path: "test-results/selected-project-1280x720.png" });
});

test("integrated-graphics safeguards avoid idle rendering", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/webgl-ready/);
  const before = await page.evaluate(() => window.__portfolioScene.getDiagnostics());
  await page.waitForTimeout(350);
  const after = await page.evaluate(() => window.__portfolioScene.getDiagnostics());
  expect(after.renderCount).toBe(before.renderCount);
  expect(after.selectionAnimating).toBe(false);
  expect(after.pixelRatio).toBeLessThanOrEqual(1.75);
  expect(after.textures).toBeLessThanOrEqual(64);
});

test("responsive laptop framing keeps selected spines clear of the open book", async ({ page }) => {
  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 1440, height: 900 },
    { width: 1512, height: 900 }
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(page.locator("html")).toHaveClass(/webgl-ready/);
    const layout = await page.evaluate(() => {
      const book = document.querySelector("#reading-book").getBoundingClientRect();
      const spines = Array.from(
        document.querySelectorAll(".spine-control"),
        (element) => element.getBoundingClientRect().left
      );
      const spineRects = Array.from(document.querySelectorAll(".spine-control"), (element) => element.getBoundingClientRect());
      return {
        gap: Math.min(...spines) - book.right,
        bookLeft: book.left,
        rightmostSpine: Math.max(...spineRects.map((rect) => rect.right))
      };
    });
    expect(layout.gap).toBeGreaterThanOrEqual(30);
    expect(layout.bookLeft).toBeGreaterThanOrEqual(18);
    expect(layout.rightmostSpine).toBeLessThanOrEqual(viewport.width);
    if (viewport.width === 1512) {
      await page.screenshot({ path: "test-results/composition-1512x900.png" });
    }
  }
});
