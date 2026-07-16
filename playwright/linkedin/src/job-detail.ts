import type { Page } from "playwright";
import type { JobDetail } from "@jobs-buddy/utils";
import { safeAction } from "@jobs-buddy/browser";
import { detectAtsPlatform } from "@jobs-buddy/utils";

export async function fetchJobDetail(page: Page, url: string, screenshotDir: string): Promise<JobDetail> {
  await safeAction(page, () => page.goto(url, { waitUntil: "domcontentloaded" }), screenshotDir, "linkedin-detail");

  const title = (await page.locator("h1, .job-details-jobs-unified-top-card__job-title").first().textContent())?.trim() ?? "";
  const company = (await page.locator(".job-details-jobs-unified-top-card__company-name a, a[data-control-name='company_link']").first().textContent())?.trim() ?? "";
  const description = (await page.locator("#job-details, .jobs-description__content").first().textContent())?.trim() ?? "";

  let applyUrl = url;
  let applyType: JobDetail["applyType"] = "easy_apply";

  const easyApply = page.locator("button:has-text('Easy Apply')").first();
  const externalApply = page.locator("a:has-text('Apply'), button:has-text('Apply')").first();

  if (await easyApply.isVisible({ timeout: 3000 }).catch(() => false)) {
    applyType = "easy_apply";
  } else if (await externalApply.isVisible({ timeout: 3000 }).catch(() => false)) {
    const href = await externalApply.getAttribute("href");
    if (href) {
      applyUrl = href.startsWith("http") ? href : `https://www.linkedin.com${href}`;
      applyType = detectAtsPlatform(applyUrl) ? "ats" : "external";
    } else {
      applyType = "external";
    }
  }

  return {
    title,
    company,
    url,
    description,
    applyUrl,
    applyType,
    platform: "linkedin",
  };
}
