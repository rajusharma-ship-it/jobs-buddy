import type { BrowserContext } from "playwright";
import type { JobListing, SearchOptions } from "@jobs-buddy/utils";
import { searchJobs } from "./search.js";
import { collectJobListings } from "./collect.js";

export async function searchLinkedIn(
  context: BrowserContext,
  options: SearchOptions,
  screenshotDir: string,
  _sessionDir?: string
): Promise<JobListing[]> {
  const page = await context.newPage();
  try {
    await searchJobs(page, options, screenshotDir);
    return await collectJobListings(page, options.maxPages ?? 3, screenshotDir);
  } finally {
    await page.close();
  }
}

export { loginLinkedIn, openLinkedInForManualLogin } from "./login.js";
export { searchJobs } from "./search.js";
export { collectJobListings } from "./collect.js";
export { fetchJobDetail } from "./job-detail.js";
export { applyEasyApply, submitApplication } from "./apply.js";
