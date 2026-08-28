import { expect, test } from "@playwright/test";

const pages = ["/index.html", "/projects/extra-projects/index.html", "/projects/generative-tree/index.html", "/projects/boolean-logic/index.html", "/projects/cipher-twins/index.html"];

for (const path of pages) {
  test(`accessibility essentials hold for ${path}`, async ({ page }) => {
    await page.goto(path);
    const audit = await page.evaluate(() => {
      const ids = [...document.querySelectorAll("[id]")].map(({ id }) => id);
      const controls = [...document.querySelectorAll("a[href], button, input, select, textarea")];
      const unnamed = controls.filter((element) => {
        if (element.getAttribute("aria-label")?.trim()) return false;
        const labelledBy = element.getAttribute("aria-labelledby");
        if (labelledBy && labelledBy.split(/\s+/).every((id) => document.getElementById(id)?.textContent.trim())) return false;
        if (element.id && document.querySelector(`label[for="${CSS.escape(element.id)}"]`)?.textContent.trim()) return false;
        return !(element.textContent?.trim() || element.getAttribute("title")?.trim() || element.getAttribute("placeholder")?.trim());
      });
      return {
        lang: document.documentElement.lang,
        h1Count: document.querySelectorAll("h1").length,
        duplicateIds: ids.filter((id, index) => ids.indexOf(id) !== index),
        unnamed: unnamed.map((element) => `${element.tagName.toLowerCase()}#${element.id}`),
        imagesWithoutAlt: [...document.images].filter((image) => !image.hasAttribute("alt")).length,
      };
    });
    expect(audit.lang).toBe("en");
    expect(audit.h1Count).toBeGreaterThanOrEqual(1);
    expect(audit.duplicateIds).toEqual([]);
    expect(audit.unnamed).toEqual([]);
    expect(audit.imagesWithoutAlt).toBe(0);
  });
}
