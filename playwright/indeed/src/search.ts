import type { Page } from "playwright";
import type { SearchOptions } from "@jobs-buddy/utils";
import { safeAction } from "@jobs-buddy/browser";
import { INDEED_BASE } from "./login.js";

export async function searchJobs(page: Page, options: SearchOptions, screenshotDir: string): Promise<void> {
  const q = encodeURIComponent(options.query);
  const l = encodeURIComponent(options.location ?? "Remote");
  const remote = options.remote ? "&remotejob=1" : "";
  const url = `${INDEED_BASE}/jobs?q=${q}&l=${l}${remote}`;

  await safeAction(
    page,
    () => page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 }),
    screenshotDir,
    "indeed-search"
  );

  await page.waitForSelector("a[data-jk], .tapItem, #mosaic-jobResults", { timeout: 45000 }).catch(() => {});

  await page.locator('button:has-text("Accept"), button:has-text("I agree"), #onetrust-accept-btn-handler').first().click({ timeout: 3000 }).catch(() => {});

  await page.waitForTimeout(5000);
}
