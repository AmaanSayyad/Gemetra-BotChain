import { test, expect } from "@playwright/test";

const FORBIDDEN = [
  /\bSolana\b/i,
  /\bSolscan\b/i,
  /\bPUSD\b/,
  /\bPalm USD\b/i,
  /\bPhantom\b/i,
  /\bSolflare\b/i,
  /\bSPL Token\b/i,
];

function visibleTextViolations(body: string): string[] {
  return FORBIDDEN.filter((re) => re.test(body)).map((re) => String(re));
}

test.describe("Gemetra frontend", () => {
  test("landing loads and has no Solana leftover copy", async ({ page }) => {
    const res = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(res?.ok()).toBeTruthy();
    await expect(page).toHaveTitle(/Gemetra/i);

    const body = await page.locator("body").innerText();
    const hits = visibleTextViolations(body);
    expect(hits, `Forbidden leftover copy: ${hits.join(", ")}`).toEqual([]);

    await expect(page.getByRole("button", { name: /connect wallet/i }).first()).toBeVisible();
    await expect(page.getByText(/BOT Chain/i).first()).toBeVisible();
    await expect(page.getByText(/USDT/i).first()).toBeVisible();
  });

  test("connect wallet opens AppKit adapter modal", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /connect wallet/i }).first().click();

    const modal = page.locator("w3m-modal, wui-card, [data-testid='w3m-modal']").first();
    await expect(modal).toBeVisible({ timeout: 20_000 });
  });

  test("landing sections are reachable", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    for (const label of ["VAT", "Payroll", "BOT"]) {
      await expect(page.getByText(new RegExp(label, "i")).first()).toBeVisible();
    }
  });

  test("footer points at BOT Chain, not Palm USD", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const footer = page.locator("footer").first();
    if (await footer.count()) {
      const text = await footer.innerText();
      expect(text).not.toMatch(/Palm USD/i);
      expect(text).not.toMatch(/\bSolana\b/i);
      expect(text).toMatch(/BOT Chain/i);
    }
  });
});
