import { expect, test } from "@playwright/test";
import { installProjectFixtures } from "./project-fixtures.js";

test("a forced WebGL initialization failure leaves only the archive", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function patchedContext(type, ...args) {
      if (String(type).startsWith("webgl")) return null;
      return original.call(this, type, ...args);
    };
  });
  await page.goto("/");
  await expect(page.locator("#archive")).toBeVisible();
  await expect(page.locator("#study")).toBeHidden();
  await expect(page.locator("html")).not.toHaveClass(/webgl-ready/);
  await expect(page.locator(".project-record")).toHaveCount(3);
});

test("a narrow desktop receives the complete archive instead of a squeezed room", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 720 });
  await page.goto("/");
  await expect(page.locator("#archive")).toBeVisible();
  await expect(page.locator("#study")).toBeHidden();
  await expect(page.locator(".project-record:not(.information-record)")).toHaveCount(2);
});

test("a lost WebGL context switches back to the semantic archive", async ({ page }) => {
  await installProjectFixtures(page);
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/webgl-ready/);
  await page.locator("#scene-canvas canvas").dispatchEvent("webglcontextlost");
  await expect(page.locator("#archive")).toBeVisible();
  await expect(page.locator("#study")).toBeHidden();
  await expect(page.locator(".project-record")).toHaveCount(9);
});

test("one added semantic record automatically reaches every presentation", async ({ page }) => {
  await page.route((url) => url.pathname === "/", async (route) => {
    const response = await route.fetch();
    let html = await response.text();
    const fixture = `
      <article class="project-record" data-kind="project" data-color="#4b6152" data-accent="#ead595">
        <p class="record-type">Temporary maintainability fixture</p>
        <h2>Temporary Project</h2>
        <time datetime="2026-06-01">June 1, 2026</time>
        <p class="record-summary">Confirm every portfolio presentation derives from one semantic record.</p>
        <p class="record-details">This record exists only inside the automated response fixture.</p>
        <a href="test-project.html#temporary">Open temporary project</a>
      </article>`;
    html = html.replace("<!-- automated-fixtures-insert -->", fixture);
    await route.fulfill({ response, body: html });
  });

  await page.goto("/");
  await expect(page.locator(".project-record")).toHaveCount(4);
  await expect(page.locator(".spine-control")).toHaveCount(4);
  await expect(page.locator(".spine-control").nth(3)).toContainText("Temporary Project");
  await page.locator(".spine-control").nth(3).click();
  await expect(page.locator("#selected-title")).toHaveText("Temporary Project");
  await expect(page.locator("#selected-link")).toHaveAttribute("href", "test-project.html#temporary");
});

test("ten volumes remain simultaneously visible without manual coordinates", async ({ page }) => {
  await page.route((url) => url.pathname === "/", async (route) => {
    const response = await route.fetch();
    let html = await response.text();
    // The archive already holds the information record and one real collection;
    // eight more fixtures reach the documented ten-volume stack capacity.
    const fixtures = Array.from({ length: 7 }, (_, index) => `
      <article class="project-record" data-kind="project" data-color="#4b6152" data-accent="#ead595">
        <p class="record-type">Maximum stack fixture</p>
        <h2>Stack Project ${index + 1}</h2>
        <time datetime="2026-01-${String(index + 1).padStart(2, "0")}">January ${index + 1}, 2026</time>
        <p class="record-summary">A temporary record used to verify the supported ten-volume stack.</p>
        <p class="record-details">This content exists only in the automated browser response.</p>
        <a href="test-project.html#stack-${index + 1}">Open fixture</a>
      </article>`).join("");
    html = html.replace("<!-- automated-fixtures-insert -->", fixtures);
    await route.fulfill({ response, body: html });
  });

  await page.goto("/");
  const spines = page.locator(".spine-control");
  await expect(spines).toHaveCount(10);
  const bounds = await spines.evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().toJSON()));
  for (const rect of bounds) {
    expect(rect.top).toBeGreaterThanOrEqual(0);
    expect(rect.right).toBeLessThanOrEqual(1290);
    expect(rect.bottom).toBeLessThanOrEqual(720);
    expect(rect.height).toBeGreaterThanOrEqual(38);
  }
});
