import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/webgl-ready/);
});

test("every spine selects the matching project immediately", async ({ page }) => {
  const controls = page.locator(".spine-control");
  const sourceRecords = page.locator(".project-record");

  for (let index = 0; index < 7; index += 1) {
    const expectedTitle = (await sourceRecords.nth(index).locator("h2").textContent()).trim();
    const expectedDate = (await sourceRecords.nth(index).locator("time").textContent()).trim();
    await controls.nth(index).click();
    await expect(controls.nth(index)).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#selected-title")).toHaveText(expectedTitle);
    await expect(page.locator("#selected-date")).toHaveText(expectedDate);
    await expect(page.locator("#selection-status")).toContainText(`Now reading ${expectedTitle}`);
    if (index > 0) await expect(page.locator("#selected-link")).toHaveAttribute("href", /examples\/index\.html#/);
  }
});

test("the newest rapid selection wins without a queue", async ({ page }) => {
  await page.locator(".spine-control").nth(2).click();
  await page.locator(".spine-control").nth(5).click();
  await page.locator(".spine-control").nth(1).click();
  await page.locator(".spine-control").nth(6).click();
  await page.locator(".spine-control").nth(3).click();

  await expect(page.locator("#selected-title")).toHaveText("Climate Data Portrait");
  await expect(page.locator(".spine-control[aria-pressed='true']")).toHaveCount(1);
  await expect(page.locator(".spine-control").nth(3)).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#selected-link")).toBeVisible();
  await page.waitForTimeout(220);
  await expect(page.locator("#selected-title")).toHaveText("Climate Data Portrait");
});

test("arrow, Home, End, Enter, and Space use semantic controls", async ({ page }) => {
  const controls = page.locator(".spine-control");
  await controls.first().focus();
  await page.keyboard.press("End");
  await expect(controls.last()).toBeFocused();
  await expect(page.locator("#selected-title")).toHaveText("Personal Landing Page");
  await page.keyboard.press("Home");
  await expect(controls.first()).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(controls.nth(1)).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#selected-title")).toHaveText("Algorithmic Garden");
  await page.keyboard.press("Space");
  await expect(page.locator("#selected-title")).toHaveText("Algorithmic Garden");
});

test("the diegetic catalogue card switches to the archive and back", async ({ page }) => {
  await page.locator("#show-archive").click();
  await expect(page.locator("#archive")).toBeVisible();
  await expect(page.locator("#study")).toBeHidden();
  await page.locator("#return-to-study").click();
  await expect(page.locator("#study")).toBeVisible();
  await expect(page.locator("#archive")).toBeHidden();
});

test("the selected destination is a real navigable link", async ({ page }) => {
  await page.locator(".spine-control").nth(1).click();
  await page.locator("#selected-link").click();
  await expect(page).toHaveURL(/examples\/index\.html#algorithmic-garden$/);
  await expect(page.locator("#algorithmic-garden h1")).toHaveText("Algorithmic Garden");
});

test("keyboard focus has a visible non-color outline", async ({ page }) => {
  const control = page.locator(".spine-control").nth(2);
  await control.focus();
  const outline = await control.evaluate((element) => {
    const style = getComputedStyle(element);
    return { style: style.outlineStyle, width: Number.parseFloat(style.outlineWidth) };
  });
  expect(outline.style).not.toBe("none");
  expect(outline.width).toBeGreaterThanOrEqual(3);
});

test("reduced motion keeps selection immediate and animation-free", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/webgl-ready/);
  await page.locator(".spine-control").nth(4).click();
  await expect(page.locator("#selected-title")).toHaveText("Interactive Story");
  const activeAnimations = await page.locator("#reading-book").evaluate((element) => element.getAnimations().length);
  expect(activeAnimations).toBe(0);
});
