import type { Page } from "playwright";
import type { SearchOptions } from "@jobs-buddy/utils";
import { safeAction } from "@jobs-buddy/browser";

export async function searchJobs(page: Page, options: SearchOptions, screenshotDir: string): Promise<void> {
  const keywords = encodeURIComponent(options.query);
  const location = encodeURIComponent(options.location ?? "Remote");
  const url = `https://www.linkedin.com/jobs/search/?keywords=${keywords}&location=${location}&f_WT=2&f_TPR=r604800`;

  await safeAction(page, () => page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 }), screenshotDir, "linkedin-search");

  await page.waitForSelector(
    ".jobs-search-results-list, [class*='jobs-search-results'], .scaffold-layout__list",
    { timeout: 30000 }
  ).catch(async () => {
    await page.waitForTimeout(3000);
  });
}
