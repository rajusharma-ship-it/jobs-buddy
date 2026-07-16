import type { Page } from "playwright";
import type { JobListing } from "@jobs-buddy/utils";
import { INDEED_BASE } from "./login.js";

function cleanTitle(raw: string): string {
  return raw.replace(/^full details of\s+/i, "").replace(/\s+/g, " ").trim();
}

export async function collectJobListings(page: Page, maxPages = 3, screenshotDir = "screenshots"): Promise<JobListing[]> {
  const listings: JobListing[] = [];
  const seen = new Set<string>();

  for (let p = 0; p < maxPages; p++) {
    await page.waitForTimeout(2000);

    const jkLinks = page.locator("a[data-jk]");
    const count = await jkLinks.count();
    console.log(`Indeed page ${p + 1}: ${count} job links found`);

    if (count === 0 && p === 0) {
      const { mkdir } = await import("node:fs/promises");
      const { join } = await import("node:path");
      await mkdir(screenshotDir, { recursive: true });
      await page.screenshot({ path: join(screenshotDir, `indeed-no-results-${Date.now()}.png`), fullPage: true });
      console.warn("Indeed: 0 results — screenshot saved to screenshots/");
    }

    for (let i = 0; i < count; i++) {
      const link = jkLinks.nth(i);
      try {
        const jk = await link.getAttribute("data-jk");
        if (!jk || seen.has(jk)) continue;

        const rawTitle =
          (await link.locator("span[title]").first().getAttribute("title"))?.trim() ||
          (await link.locator("h2 span, .jobTitle span").first().textContent())?.trim() ||
          (await link.getAttribute("aria-label"))?.trim() ||
          (await link.textContent())?.trim() ||
          "";

        const title = cleanTitle(rawTitle);

        if (!title || title.length < 3) continue;
        seen.add(jk);

        const card = link.locator("xpath=ancestor::div[contains(@class,'tapItem') or contains(@class,'job_seen_beacon')]").first();
        const company = (
          await card.locator("[data-testid='company-name'], .companyName").first().textContent().catch(() => null)
        )?.trim() || "Unknown";

        const location = (
          await card
            .locator("[data-testid='text-location'], .companyLocation, [data-testid='attribute_snippet_testid']")
            .first()
            .textContent()
            .catch(() => null)
        )?.trim();

        const snippet = (
          await card
            .locator(".job-snippet, [data-testid='job-snippet'], .underShelfFooter, ul.css-shcbig")
            .first()
            .textContent()
            .catch(() => null)
        )?.trim();

        const salary = (
          await card.locator("[data-testid='attribute_snippet_testid'], .salary-snippet").first().textContent().catch(() => null)
        )?.trim();

        const url = `${INDEED_BASE}/viewjob?jk=${jk}`;
        listings.push({
          title,
          company,
          url,
          platform: "indeed",
          jobKey: jk,
          location: location ?? undefined,
          description: snippet ?? undefined,
          salary: salary ?? undefined,
        });
      } catch {
        continue;
      }
    }

    const next = page.locator('a[aria-label="Next Page"], a[aria-label="Next"]').first();
    if (!(await next.isVisible({ timeout: 2000 }).catch(() => false))) break;
    await next.click().catch(() => {});
    await page.waitForTimeout(3000);
  }

  return listings;
}
