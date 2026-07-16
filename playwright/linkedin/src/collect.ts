import type { Page } from "playwright";
import type { JobListing } from "@jobs-buddy/utils";
import { safeAction } from "@jobs-buddy/browser";

export async function collectJobListings(
  page: Page,
  maxPages = 3,
  screenshotDir = "screenshots"
): Promise<JobListing[]> {
  const listings: JobListing[] = [];
  const seen = new Set<string>();

  for (let pageNum = 0; pageNum < maxPages; pageNum++) {
    await page.waitForTimeout(2500);

    const cards = page.locator(
      ".job-card-container, .jobs-search-results__list-item, li[data-occludable-job-id], .scaffold-layout__list-item"
    );
    const count = await cards.count();
    console.log(`LinkedIn page ${pageNum + 1}: ${count} cards found`);

    for (let i = 0; i < count; i++) {
      const card = cards.nth(i);
      try {
        const titleEl = card.locator(
          ".job-card-list__title, a[data-control-name], .job-card-list__title-link, .base-search-card__title"
        ).first();
        const title = (await titleEl.textContent())?.trim() ?? "";
        const company = (
          await card.locator(
            ".job-card-container__company-name, .artdeco-entity-lockup__subtitle, .base-search-card__subtitle"
          ).first().textContent()
        )?.trim() ?? "";
        const linkEl = card.locator("a[href*='/jobs/view/'], a[href*='currentJobId']").first();
        const href = await linkEl.getAttribute("href");
        if (!href || !title) continue;

        const url = href.startsWith("http") ? href.split("?")[0]! : `https://www.linkedin.com${href.split("?")[0]}`;
        if (seen.has(url)) continue;
        seen.add(url);

        listings.push({
          title,
          company,
          url,
          platform: "linkedin",
        });
      } catch {
        continue;
      }
    }

    const nextBtn = page.locator(
      "button[aria-label='View next page'], button[aria-label='Next'], li[data-test-pagination-page-btn]"
    ).last();
    if (!(await nextBtn.isVisible({ timeout: 2000 }).catch(() => false))) break;
    await safeAction(page, () => nextBtn.click(), screenshotDir, "linkedin-pagination");
    await page.waitForTimeout(2000);
  }

  return listings;
}
