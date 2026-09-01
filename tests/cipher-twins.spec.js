import { expect, test } from "@playwright/test";

// Drives two browser pages through the same-machine BroadcastChannel bridge
// (?local=CODE) so the cooperative flow is exercised end to end without the
// PeerJS broker.

const ROOM = "E2EROOM";

async function openPair(context) {
  const host = await context.newPage();
  const joiner = await context.newPage();
  await host.goto(`/projects/cipher-twins/index.html?local=${ROOM}&as=host`);
  await joiner.goto(`/projects/cipher-twins/index.html?local=${ROOM}&as=join`);
  await expect(host.locator("#screen-game")).toHaveAttribute("data-active", "", { timeout: 15000 });
  await expect(joiner.locator("#screen-game")).toHaveAttribute("data-active", "");
  return { host, joiner };
}

async function sendCard(page, iconLabels) {
  if ((await page.locator("#composer-palette-toggle").getAttribute("aria-expanded")) !== "true") {
    await page.locator("#composer-palette-toggle").click();
  }
  for (const label of iconLabels) {
    await page.locator(`#palette-drawer button[aria-label="Add ${label}"]`).first().click();
  }
  await page.locator("#composer-send").click();
}

test("two pages pair locally, talk, save a sigil, and solve a tutorial", async ({ context }) => {
  const { host, joiner } = await openPair(context);

  // Both start in Tutorial 1.
  await expect(host.locator("#round-label")).toHaveText("Tutorial");

  await sendCard(host, ["Straight line", "Count 1"]);
  await expect(joiner.locator(".message-card")).toHaveCount(1);
  await expect(joiner.locator(".message-card .author-badge")).toHaveText(/Player A/);

  // Joiner replies.
  await joiner.locator(".message-card .micro-button", { hasText: "Reply" }).first().click();
  await expect(joiner.locator("#reply-chip")).toBeVisible();
  await sendCard(joiner, ["Confirm"]);
  await expect(host.locator(".message-card")).toHaveCount(2);

  // Host saves its 2-token card as a sigil; joiner approves it.
  await host.locator(".message-card", { hasText: "Player A" }).first()
    .locator(".micro-button", { hasText: "Save as sigil" }).click();
  await joiner.locator("#composer-lexicon-toggle").click();
  await joiner.locator("#lexicon-pending .micro-button", { hasText: "Approve" }).click();
  await expect(host.locator("#lexicon-confirmed .sigil-row")).toHaveCount(1);

  // Both commit the same (correct) tutorial word: FISH.
  for (const page of [host, joiner]) {
    for (const letter of "FISH") {
      await page.locator(`#letter-picker button:has-text("${letter}")`).first().click();
    }
    await page.locator("#answer-commit").click();
  }
  await expect(host.locator("#answer-status")).toContainText(/answer|both/i, { timeout: 10000 });
  // A tutorial solve stays in the tutorial and never leaks the partner's letters.
  await expect(host.locator("#screen-game")).toHaveAttribute("data-active", "");
  const hostHtml = await host.content();
  expect(hostHtml).not.toMatch(/partnerGuess|"letters"/);
});

test("filters scope the conversation to each author", async ({ context }) => {
  const { host, joiner } = await openPair(context);
  await sendCard(host, ["Straight line"]);
  await sendCard(joiner, ["Curve"]);
  await expect(host.locator(".message-card")).toHaveCount(2);

  await host.locator('.filter-btn[data-filter="mine"]').click();
  await expect(host.locator(".message-card")).toHaveCount(1);
  await expect(host.locator(".message-card .author-badge")).toHaveText(/Player A/);

  await host.locator('.filter-btn[data-filter="partner"]').click();
  await expect(host.locator(".message-card .author-badge")).toHaveText(/Player B/);
});
