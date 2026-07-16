import type { BrowserContext } from "playwright";
import type { JobListing, SearchOptions } from "@jobs-buddy/utils";
import { ensureIndeedLoggedIn } from "./login.js";
import { searchJobs } from "./search.js";
import { collectJobListings } from "./collect.js";

export async function searchIndeed(
  context: BrowserContext,
  options: SearchOptions,
  screenshotDir: string,
  sessionDir?: string
): Promise<JobListing[]> {
  const loggedIn = await ensureIndeedLoggedIn(context, screenshotDir, sessionDir);
  if (!loggedIn) {
    throw new Error("Indeed login required. Click 'Connect Indeed' in the dashboard first.");
  }

  const page = await context.newPage();
  try {
    await searchJobs(page, options, screenshotDir);
    return await collectJobListings(page, options.maxPages ?? 3, screenshotDir);
  } finally {
    await page.close();
  }
}

export {
  ensureIndeedLoggedIn,
  isIndeedLoggedIn,
  verifyIndeedLoggedIn,
  openIndeedForManualLogin,
  INDEED_BASE,
  INDEED_PROFILE_BASE,
  INDEED_LOGIN_URL,
} from "./login.js";
export { loginIndeed } from "./login.js";
export { searchJobs } from "./search.js";
export { collectJobListings } from "./collect.js";
export { fetchJobDetail, fetchJobDetailFromSerp } from "./job-detail.js";
export { applyIndeed, submitApplication } from "./apply.js";
export { fetchIndeedProfile, mergeIndeedIntoProfile } from "./profile.js";
export type { IndeedProfileData } from "./profile.js";
