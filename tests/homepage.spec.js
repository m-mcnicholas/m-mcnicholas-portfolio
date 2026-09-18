import { expect, test } from "@playwright/test";

const CIPHER_URL = "https://m-mcnicholas.github.io/cipher-twins-game/";
const GITHUB_URL = "https://github.com/m-mcnicholas";

const viewports = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 820, height: 1180 },
  phone: { width: 390, height: 844 },
  "small phone": { width: 320, height: 640 },
  "short landscape": { width: 844, height: 390 },
  "tall tablet": { width: 1024, height: 1700 }
};

test.describe("content and structure", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("leads with the name and one-line introduction", async ({ page }) => {
    await expect(page).toHaveTitle("Michael McNicholas — Software Engineering Projects");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Michael McNicholas");
    await expect(page.locator(".identity p")).toHaveText(
      "Software engineering student building interactive systems, games, and experiments."
    );
  });

  test("presents Cipher Twins first, then the Extra Projects folder", async ({ page }) => {
    const sections = await page.locator("main > section").evaluateAll((nodes) => nodes.map((node) => node.id));
    expect(sections).toEqual(["cipher-twins", "extra-projects"]);

    const cipher = page.locator("#cipher-twins");
    await expect(cipher.getByRole("heading", { level: 2 })).toHaveText("Cipher Twins");
    await expect(cipher.locator(".meta")).toContainText("School project · Multiplayer puzzle");
    await expect(cipher.locator("time")).toHaveAttribute("datetime", "2026-08-26");
    await expect(cipher.locator(".tags li")).toHaveText(["WebRTC", "PeerJS", "JavaScript"]);
    await expect(cipher.getByRole("link", { name: /Play Cipher Twins/ })).toHaveAttribute("href", CIPHER_URL);
  });

  test("groups the two experiments inside an already-open folder", async ({ page }) => {
    const extra = page.locator("#extra-projects");
    await expect(extra.getByRole("heading", { level: 2 })).toHaveText("Extra Projects");
    await expect(extra.locator(".folder-note")).toContainText("rough");
    // An open folder, not a disclosure control.
    await expect(page.locator("details, summary, [aria-expanded]")).toHaveCount(0);

    const entries = extra.locator(".extra");
    await expect(entries).toHaveCount(2);
    await expect(entries.locator("h3")).toHaveText(["Boolean Logic Playground", "Procedural L-System Forest"]);
    await expect(entries.nth(0).getByRole("link", { name: "Boolean Logic Playground" })).toHaveAttribute("href", "projects/boolean-logic/index.html");
    await expect(entries.nth(1).getByRole("link", { name: "Procedural L-System Forest" })).toHaveAttribute("href", "projects/generative-tree/index.html");
    await expect(entries.nth(0).locator("time")).toHaveAttribute("datetime", "2026-08-24");
    await expect(entries.nth(1).locator("time")).toHaveAttribute("datetime", "2026-08-20");
    await expect(entries.nth(0).locator(".tags li")).toHaveText(["JavaScript", "SVG", "Logic simulation"]);
    await expect(entries.nth(1).locator(".tags li")).toHaveText(["Three.js", "WebGL", "L-systems"]);

    // Cipher Twins is not part of the collection.
    await expect(extra.getByText("Cipher Twins")).toHaveCount(0);
  });

  test("offers one global action beyond projects: the GitHub profile", async ({ page }) => {
    await expect(page.locator("header a")).toHaveCount(1);
    await expect(page.locator("header a")).toHaveAttribute("href", GITHUB_URL);
    await expect(page.locator("header").getByRole("link", { name: /GitHub/ })).toBeVisible();

    const hrefs = await page.locator("a").evaluateAll((links) => links.map((link) => link.getAttribute("href")));
    expect(hrefs).toEqual([
      "#cipher-twins",
      GITHUB_URL,
      CIPHER_URL,
      "projects/boolean-logic/index.html",
      "projects/generative-tree/index.html"
    ]);
  });

  test("keeps a logical heading order and drops the old archive material", async ({ page }) => {
    const levels = await page.locator("h1, h2, h3, h4, h5, h6").evaluateAll((nodes) => nodes.map((node) => Number(node.tagName[1])));
    expect(levels).toEqual([1, 2, 2, 3, 3]);

    const text = (await page.locator("body").innerText()).toLowerCase();
    for (const banned of ["résumé", "resume", "contact", "email", "skills", "about", "archive"]) {
      expect(text).not.toContain(banned);
    }
  });

  test("treats screenshots as decorative because the text carries the meaning", async ({ page }) => {
    const images = page.locator("img");
    await expect(images).toHaveCount(3);
    for (const image of await images.all()) {
      await expect(image).toHaveAttribute("alt", "");
      await expect(image).toHaveAttribute("width", /\d+/);
      await expect(image).toHaveAttribute("height", /\d+/);
    }
    await expect(page.locator("figure[aria-hidden='true']")).toHaveCount(3);
  });
});

test.describe("responsive composition", () => {
  for (const [name, viewport] of Object.entries(viewports)) {
    test(`${name} (${viewport.width}×${viewport.height}) has no overflow, clipping or overlap`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/");

      const widths = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
      expect(widths.document).toBe(widths.viewport);

      const box = async (selector) => page.locator(selector).first().boundingBox();
      const header = await box("header");
      const cipher = await box("#cipher-twins");
      expect(cipher.y).toBeGreaterThanOrEqual(header.y + header.height - 1);

      // Nothing is wider than the viewport, and text is not cut off by a fixed-size box.
      const clipped = await page.evaluate(() =>
        [...document.querySelectorAll("main *")]
          .filter((el) => el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== "visible" && !el.closest(".frame"))
          .map((el) => el.className || el.tagName)
      );
      expect(clipped).toEqual([]);

      const folder = await box(".folder-body");
      const entries = await page.locator(".extra").evaluateAll((nodes) =>
        nodes.map((node) => {
          const { x, y, width, height } = node.getBoundingClientRect();
          return { x, y: y + scrollY, width, height };
        })
      );
      const folderBox = await page.locator(".folder-body").evaluate((node) => {
        const { x, y, width, height } = node.getBoundingClientRect();
        return { x, y: y + scrollY, width, height };
      });
      expect(folder).not.toBeNull();
      for (const entry of entries) {
        expect(entry.x).toBeGreaterThanOrEqual(folderBox.x - 1);
        expect(entry.x + entry.width).toBeLessThanOrEqual(folderBox.x + folderBox.width + 1);
        expect(entry.y + entry.height).toBeLessThanOrEqual(folderBox.y + folderBox.height + 1);
      }
      const [first, second] = entries;
      const separated =
        first.x + first.width <= second.x + 0.5 || second.x + second.width <= first.x + 0.5 ||
        first.y + first.height <= second.y + 0.5 || second.y + second.height <= first.y + 0.5;
      expect(separated).toBe(true);

      // Every direct link is reachable and visible once scrolled to.
      for (const link of [
        page.getByRole("link", { name: /Play Cipher Twins/ }),
        page.getByRole("link", { name: "Boolean Logic Playground" }),
        page.getByRole("link", { name: "Procedural L-System Forest" })
      ]) {
        await link.scrollIntoViewIfNeeded();
        await expect(link).toBeVisible();
      }
    });
  }

  test("Cipher Twins fills the first viewport with its direct link on desktop and phone", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const name of ["desktop", "phone"]) {
      const viewport = viewports[name];
      await page.setViewportSize(viewport);
      await page.goto("/");
      const cipher = await page.locator("#cipher-twins").boundingBox();
      const link = await page.getByRole("link", { name: /Play Cipher Twins/ }).boundingBox();
      expect(cipher.y, `${name}: section starts near the top`).toBeLessThan(viewport.height * 0.3);
      expect(link.y + link.height, `${name}: link is inside the first viewport`).toBeLessThanOrEqual(viewport.height);
      const heading = await page.locator("#cipher-twins h2").boundingBox();
      expect(heading.height, `${name}: title is large`).toBeGreaterThan(viewport.width < 500 ? 90 : 180);
    }
  });

  test("Cipher Twins has the largest heading and screenshot", async ({ page }) => {
    await page.setViewportSize(viewports.desktop);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const size = async (selector) => page.locator(selector).first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(await size("#cipher-twins h2")).toBeGreaterThan(await size(".extra h3") * 2);
    const width = async (selector) => (await page.locator(selector).first().boundingBox()).width;
    expect(await width(".cipher-shot")).toBeGreaterThan(await width(".extra .frame"));
  });
});

test.describe("accessibility", () => {
  test("keyboard order reaches every link and each shows a focus indicator", async ({ page }) => {
    await page.goto("/");
    const stops = [];
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("Tab");
      stops.push(
        await page.evaluate(() => {
          const el = document.activeElement;
          const own = getComputedStyle(el);
          const after = getComputedStyle(el, "::after");
          const drawn = (style) => style.outlineStyle !== "none" && parseFloat(style.outlineWidth) >= 2;
          return { name: el.textContent.trim().replace(/\s+/g, " "), indicator: drawn(own) || drawn(after) };
        })
      );
    }
    expect(stops.map((stop) => stop.name)).toEqual([
      "Skip to projects",
      "GitHub profile for m-mcnicholas",
      "Play Cipher Twins →",
      "Boolean Logic Playground",
      "Procedural L-System Forest"
    ]);
    for (const stop of stops) expect(stop.indicator, `${stop.name} shows focus`).toBe(true);
  });

  test("the skip link moves focus to the projects", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to projects" })).toBeInViewport();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#cipher-twins$/);
  });

  test("text meets WCAG AA contrast against its background", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const checks = [
      [".identity h1", 4.5], [".identity p", 4.5], [".github-link span", 4.5],
      ["#cipher-twins .meta", 4.5], ["#cipher-twins h2", 3], ["#cipher-twins .lede", 4.5],
      ["#cipher-twins .tags li", 4.5], [".button-cipher", 4.5],
      [".folder-tab", 3], [".folder-note", 4.5],
      [".extra-logic .meta", 4.5], [".extra-logic h3 a", 3], [".extra-logic p:not(.meta)", 4.5],
      [".extra-logic .tags li", 4.5], [".extra-logic .open-cue", 4.5],
      [".extra-forest .meta", 4.5], [".extra-forest h3 a", 3], [".extra-forest p:not(.meta)", 4.5],
      [".extra-forest .tags li", 4.5], [".extra-forest .open-cue", 4.5]
    ];
    const results = await page.evaluate((list) => {
      const parse = (value) => value.match(/[\d.]+/g).map(Number);
      const luminance = ([r, g, b]) => {
        const [R, G, B] = [r, g, b].map((c) => {
          const s = c / 255;
          return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * R + 0.7152 * G + 0.0722 * B;
      };
      const background = (el) => {
        for (let node = el; node; node = node.parentElement) {
          const color = parse(getComputedStyle(node).backgroundColor);
          if ((color[3] ?? 1) > 0.99) return color;
        }
        return [255, 255, 255];
      };
      return list.map(([selector, min]) => {
        const el = document.querySelector(selector);
        const fg = parse(getComputedStyle(el).color);
        const a = luminance(fg);
        const b = luminance(background(el));
        return { selector, min, ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) };
      });
    }, checks);
    for (const { selector, min, ratio } of results) expect(ratio, `${selector} contrast`).toBeGreaterThanOrEqual(min);
  });
});

test.describe("motion", () => {
  test("reveals content on scroll when motion is allowed", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/");
    const folder = page.locator(".folder");
    await expect(folder).not.toHaveClass(/is-visible/);
    await expect(folder).toHaveCSS("opacity", "0");
    await folder.scrollIntoViewIfNeeded();
    await expect(folder).toHaveClass(/is-visible/);
    await expect(folder).toHaveCSS("opacity", "1");
    // The first screen is never hidden waiting for an animation.
    await expect(page.locator("#cipher-twins")).toHaveCSS("opacity", "1");
  });

  test("shows everything at once and removes nonessential motion under prefers-reduced-motion", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    for (const element of await page.locator(".reveal").all()) {
      await expect(element).toHaveCSS("opacity", "1");
      await expect(element).toHaveCSS("transform", "none");
      await expect(element).toHaveCSS("transition-duration", "0s");
    }
    await expect(page.locator(".folder-body")).toHaveCSS("transition-duration", "0s");
    await expect(page.locator("html")).toHaveCSS("scroll-behavior", "auto");
  });

  test("never hijacks scrolling or autoplays media", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("video, audio, iframe, canvas")).toHaveCount(0);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollSnapType)).toBe("none");
  });
});

test("the page is fully usable without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  await page.goto("/");
  for (const element of await page.locator(".reveal").all()) await expect(element).toHaveCSS("opacity", "1");
  await expect(page.getByRole("link", { name: /Play Cipher Twins/ })).toBeVisible();
  await page.getByRole("link", { name: "Boolean Logic Playground" }).scrollIntoViewIfNeeded();
  await expect(page.getByRole("link", { name: "Boolean Logic Playground" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Procedural L-System Forest" })).toBeVisible();
  await context.close();
});

test.describe("restored demos link back to the homepage folder", () => {
  for (const [name, path] of [["Boolean Logic Playground", "/projects/boolean-logic/index.html"], ["Procedural L-System Forest", "/projects/generative-tree/index.html"]]) {
    test(`${name} returns to #extra-projects`, async ({ page }) => {
      await page.goto("/");
      await page.getByRole("link", { name }).click();
      await expect(page).toHaveURL(new RegExp(`${path.replaceAll("/", "\\/")}$`));
      const back = page.locator(".back-link");
      await expect(back).toHaveAttribute("href", "../../index.html#extra-projects");
      await back.click();
      await expect(page).toHaveURL(/\/index\.html#extra-projects$|\/#extra-projects$/);
      await expect(page.locator("#extra-projects")).toBeInViewport();
    });
  }
});
