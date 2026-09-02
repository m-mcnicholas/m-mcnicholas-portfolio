import { expect, test } from "@playwright/test";
import { installProjectFixtures } from "./project-fixtures.js";

test.beforeEach(async ({ page }) => {
  await installProjectFixtures(page);
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/webgl-ready/);
});

test("every spine selects the matching project immediately", async ({ page }) => {
  const controls = page.locator(".spine-control");
  const sourceRecords = page.locator(".project-record");

  for (let index = 0; index < 9; index += 1) {
    const expectedTitle = index === 2
      ? "Extra Projects"
      : (await sourceRecords.nth(index).locator(":scope > h2").textContent()).trim();
    const expectedDate = (await sourceRecords.nth(index).locator("time").first().textContent()).trim();
    await controls.nth(index).click();
    await expect(controls.nth(index)).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator("#selected-title")).toHaveText(expectedTitle);
    await expect(page.locator("#selected-date")).toHaveText(expectedDate);
    await expect(page.locator("#selection-status")).toContainText(`Now reading ${expectedTitle}`);
    if (index === 2) await expect(page.locator("#selected-link")).toHaveAttribute("href", "projects/extra-projects/index.html");
    else if (index > 2) await expect(page.locator("#selected-link")).toHaveAttribute("href", /test-project\.html#/);
  }
});

test("the newest rapid selection wins without a queue", async ({ page }) => {
  await page.locator(".spine-control").nth(4).click();
  await page.locator(".spine-control").nth(7).click();
  await page.locator(".spine-control").nth(3).click();
  await page.locator(".spine-control").nth(8).click();
  await page.locator(".spine-control").nth(5).click();

  await expect(page.locator("#selected-title")).toHaveText("Test Project Three");
  await expect(page.locator(".spine-control[aria-pressed='true']")).toHaveCount(1);
  await expect(page.locator(".spine-control").nth(5)).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#selected-link")).toBeVisible();
  await page.waitForTimeout(320);
  await expect(page.locator("#selected-title")).toHaveText("Test Project Three");
});

test("arrow, Home, End, Enter, and Space use semantic controls", async ({ page }) => {
  const controls = page.locator(".spine-control");
  await controls.first().focus();
  await page.keyboard.press("End");
  await expect(controls.last()).toBeFocused();
  await expect(page.locator("#selected-title")).toHaveText("Test Project Six");
  await page.keyboard.press("Home");
  await expect(controls.first()).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await expect(controls.nth(2)).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#selected-title")).toHaveText("Extra Projects");
  await page.keyboard.press("Space");
  await expect(page.locator("#selected-title")).toHaveText("Extra Projects");
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
  await page.locator(".spine-control").nth(3).click();
  await page.locator("#selected-link").click();
  await expect(page).toHaveURL(/test-project\.html#project-1$/);
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

test("Tab reaches the archive drawer and physical volume controls", async ({ page }) => {
  await page.keyboard.press("Tab");
  await expect(page.locator(".skip-link")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.locator("#show-archive")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.locator(".spine-control").first()).toBeFocused();
});

test("reduced motion keeps selection immediate and animation-free", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/webgl-ready/);
  await page.locator(".spine-control").nth(6).click();
  await expect(page.locator("#selected-title")).toHaveText("Test Project Four");
  const activeAnimations = await page.locator("#reading-book").evaluate((element) => element.getAnimations({ subtree: true }).length);
  expect(activeAnimations).toBe(0);
});

test("semantic spines share deterministic physical binding profiles", async ({ page }) => {
  const profiles = await page.locator(".spine-control").evaluateAll((controls) => controls.map((control) => ({
    binding: control.dataset.binding,
    foil: control.dataset.foil,
    background: getComputedStyle(control).backgroundColor
  })));
  expect(new Set(profiles.map(({ binding }) => binding)).size).toBeGreaterThanOrEqual(3);
  expect(profiles.every(({ binding, foil }) => binding && foil)).toBe(true);
  expect(profiles.every(({ background }) => background === "rgba(0, 0, 0, 0)" || background === "transparent")).toBe(true);
  const pageBackgrounds = await page.locator(".reading-page").evaluateAll((pages) => pages.map((page) => getComputedStyle(page).backgroundColor));
  expect(pageBackgrounds.every((background) => background === "rgba(0, 0, 0, 0)" || background === "transparent")).toBe(true);
});

test("Extra Projects turns between named pages with correct folios and destinations", async ({ page }) => {
  await page.locator(".spine-control").nth(2).click();
  await expect(page).toHaveURL(/#extra-projects\/contents$/);
  await expect(page.locator("#selected-title")).toHaveText("Extra Projects");
  await expect(page.locator("#selected-summary")).toContainText("1. Boolean Logic Playground");
  await expect(page.locator("#selected-details")).toContainText("Quality warning:");
  await expect(page.locator("#selected-link")).toHaveAttribute("href", "projects/extra-projects/index.html");
  await expect(page.locator("#collection-folio")).toHaveText("Extra Projects · 1 of 3");
  await expect(page.locator("#page-previous")).toBeHidden();
  await expect(page.locator("#page-next")).toBeVisible();
  await expect(page.locator("#page-next")).toHaveText("Next page →");
  await expect(page).toHaveTitle("Extra Projects — Michael McNicholas");
  await page.screenshot({ path: "test-results/extra-projects-page-tabs.png" });

  await page.locator("#page-next").click();
  await expect(page.locator("#selected-title")).toHaveText("Boolean Logic Playground");
  await expect(page.locator("#selected-link")).toHaveAttribute("href", "projects/boolean-logic/index.html");
  await expect(page.locator("#collection-folio")).toHaveText("Extra Projects · 2 of 3");
  await expect(page.locator("#page-previous")).toHaveText("← Previous page");

  await page.locator("#page-next").click();
  await expect(page.locator("#selected-title")).toHaveText("Procedural L-System Forest");
  await expect(page.locator("#selected-link")).toHaveAttribute("href", "projects/generative-tree/index.html");
  await expect(page.locator("#collection-folio")).toHaveText("Extra Projects · 3 of 3");
  await expect(page.locator("#page-next")).toBeHidden();
  await expect(page.locator("#page-previous")).toBeVisible();
  await expect(page).toHaveURL(/#extra-projects\/l-system-forest$/);
  await expect(page.locator("#selection-status")).toContainText("in Extra Projects, page 3 of 3");
});

test("a named collection hash opens its matching project page", async ({ page }) => {
  await page.goto("/#extra-projects/l-system-forest");
  await expect(page.locator("html")).toHaveClass(/webgl-ready/);
  await expect(page.locator(".spine-control").nth(2)).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#selected-title")).toHaveText("Procedural L-System Forest");
  await expect(page.locator("#collection-folio")).toHaveText("Extra Projects · 3 of 3");
});

test("page memory, arrow keys, and browser history restore collection pages", async ({ page }) => {
  await page.locator(".spine-control").nth(2).click();
  await page.locator("#page-next").click();
  await expect(page.locator("#selected-title")).toHaveText("Boolean Logic Playground");
  await page.locator(".spine-control").nth(3).click();
  await page.locator(".spine-control").nth(2).click();
  await expect(page.locator("#selected-title")).toHaveText("Boolean Logic Playground");

  await page.locator("#page-previous").focus();
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator("#selected-title")).toHaveText("Extra Projects");
  await expect(page).toHaveURL(/#extra-projects\/contents$/);
  await page.goBack();
  await expect(page.locator("#selected-title")).toHaveText("Boolean Logic Playground");
  await page.goForward();
  await expect(page.locator("#selected-title")).toHaveText("Extra Projects");
});

test("touch swipes qualify horizontally and ignore vertical or interactive starts", async ({ page }) => {
  await page.locator(".spine-control").nth(2).click();
  const book = page.locator("#reading-book");
  await book.dispatchEvent("pointerdown", { pointerId: 7, pointerType: "touch", clientX: 700, clientY: 350, bubbles: true });
  await book.dispatchEvent("pointerup", { pointerId: 7, pointerType: "touch", clientX: 620, clientY: 356, bubbles: true });
  await expect(page.locator("#selected-title")).toHaveText("Boolean Logic Playground");

  await book.dispatchEvent("pointerdown", { pointerId: 8, pointerType: "touch", clientX: 620, clientY: 330, bubbles: true });
  await book.dispatchEvent("pointerup", { pointerId: 8, pointerType: "touch", clientX: 630, clientY: 410, bubbles: true });
  await expect(page.locator("#selected-title")).toHaveText("Boolean Logic Playground");
  await page.locator("#selected-link").dispatchEvent("pointerdown", { pointerId: 9, pointerType: "touch", clientX: 620, clientY: 350, bubbles: true });
  await book.dispatchEvent("pointerup", { pointerId: 9, pointerType: "touch", clientX: 720, clientY: 350, bubbles: true });
  await expect(page.locator("#selected-title")).toHaveText("Boolean Logic Playground");
});

test("rapid page input is suppressed and volume switching cancels stale turns", async ({ page }) => {
  await page.locator(".spine-control").nth(2).click();
  await page.locator("#page-next").click({ noWaitAfter: true });
  expect(await page.evaluate(() => window.__portfolioScene.getDiagnostics().pageTurning)).toBe(true);
  await page.locator("#page-next").click({ force: true, noWaitAfter: true });
  await page.locator(".spine-control").nth(3).click();
  await expect(page.locator("#selected-title")).toHaveText("Test Project One");
  await page.waitForTimeout(520);
  await expect(page.locator("#selected-title")).toHaveText("Test Project One");
  expect(await page.evaluate(() => window.__portfolioScene.getDiagnostics().pageTurning)).toBe(false);
});

test("reduced motion page turns exchange synchronously without a physical leaf", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/webgl-ready/);
  await page.locator(".spine-control").nth(2).click();
  await page.locator("#page-next").click();
  await expect(page.locator("#selected-title")).toHaveText("Boolean Logic Playground");
  const diagnostics = await page.evaluate(() => window.__portfolioScene.getDiagnostics());
  expect(diagnostics.pageTurning).toBe(false);
  expect(await page.locator("#reading-book").evaluate((element) => element.getAnimations({ subtree: true }).length)).toBe(0);
});
