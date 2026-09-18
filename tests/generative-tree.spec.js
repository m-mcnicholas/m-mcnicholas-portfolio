import { expect, test } from "@playwright/test";

test("L-System Forest renders a seeded forest and regrows it on demand", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/projects/generative-tree/index.html");
  await expect(page).toHaveTitle("Procedural L-System Forest — Michael McNicholas");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Procedural L-System Forest");
  await expect(page.locator("#tree-canvas canvas")).toBeVisible();
  await expect(page.locator("#tree-fallback")).toBeHidden();

  const seed = page.locator("#tree-seed");
  await expect(seed).toContainText(/Seed \d+/);
  const before = await seed.textContent();

  await page.getByRole("button", { name: "Regenerate" }).click();
  await expect(seed).not.toHaveText(before);
  await expect(seed).toContainText(/Seed \d+/);

  await expect(page.locator(".back-link")).toHaveAttribute("href", "../../index.html#extra-projects");
  expect(errors).toEqual([]);
});
