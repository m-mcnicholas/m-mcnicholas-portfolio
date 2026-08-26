import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/projects/boolean-logic/index.html");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("starter circuit toggles live values and saves edited labels", async ({ page }) => {
  await expect(page.locator(".logic-node")).toHaveCount(4);
  await expect(page.locator(".logic-node[data-node-id='output-light']")).toHaveAttribute("data-value", "0");
  await page.locator(".logic-node[data-node-id='input-a'] .toggle-value").click();
  await page.locator(".logic-node[data-node-id='input-b'] .toggle-value").click();
  await expect(page.locator(".logic-node[data-node-id='output-light']")).toHaveAttribute("data-value", "1");

  const label = page.locator(".logic-node[data-node-id='output-light'] .node-label");
  await label.fill("Ready lamp");
  await page.reload();
  await expect(page.locator(".logic-node[data-node-id='output-light'] .node-label")).toHaveValue("Ready lamp");
});

test("loads the half adder and shows its expected sum and carry", async ({ page }) => {
  await page.locator("#example-select").selectOption("half-adder");
  await page.locator("#load-example").click();
  await expect(page.locator("#circuit-title")).toHaveText("Half adder");
  await expect(page.locator(".logic-node[data-node-id='sum']")).toHaveAttribute("data-value", "0");
  await expect(page.locator(".logic-node[data-node-id='carry']")).toHaveAttribute("data-value", "1");
});

test("clock stepping updates edge-triggered memory", async ({ page }) => {
  await page.locator("#example-select").selectOption("clocked-memory");
  await page.locator("#load-example").click();
  await expect(page.locator(".logic-node[data-node-id='dff']")).toHaveAttribute("data-value", "0");
  await page.locator("#step-clock").click();
  await expect(page.locator(".logic-node[data-node-id='dff']")).toHaveAttribute("data-value", "1");
  await expect(page.locator(".logic-node[data-node-id='tff']")).toHaveAttribute("data-value", "1");
  await expect(page.locator(".logic-node[data-node-id='clock']")).toHaveAttribute("data-value", "1");
});

test("corrupt local data falls back safely and the phone layout does not overflow", async ({ page }) => {
  await page.evaluate(() => localStorage.setItem("boolean-logic-playground:v1", "{broken"));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.locator("#circuit-title")).toHaveText("My first circuit");
  const widths = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
  expect(widths.document).toBe(widths.viewport);
});
