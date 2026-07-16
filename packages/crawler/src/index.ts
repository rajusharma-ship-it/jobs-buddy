import type { Browser } from "playwright";
import type { BrowserContext } from "playwright";
import type { JobListing, SearchOptions } from "@jobs-buddy/utils";
import { createContextWithSession } from "@jobs-buddy/browser";
import { searchLinkedIn } from "@jobs-buddy/playwright-linkedin";
import { searchIndeed } from "@jobs-buddy/playwright-indeed";

export interface CrawlerConfig {
  headless: boolean;
  sessionDir: string;
  screenshotDir: string;
}

export interface CrawlResult {
  jobs: JobListing[];
  errors: string[];
}

export async function crawlLinkedIn(
  browser: Browser,
  options: SearchOptions,
  config: CrawlerConfig
): Promise<JobListing[]> {
  const context = await createContextWithSession(browser, "linkedin", config.sessionDir);
  try {
    return await searchLinkedIn(context, options, config.screenshotDir, config.sessionDir);
  } finally {
    await context.close();
  }
}

export async function crawlIndeed(
  indeedContext: BrowserContext,
  options: SearchOptions,
  config: CrawlerConfig
): Promise<JobListing[]> {
  return searchIndeed(indeedContext, options, config.screenshotDir, config.sessionDir);
}

export async function crawlAll(
  browser: Browser,
  indeedContext: BrowserContext,
  options: SearchOptions,
  config: CrawlerConfig
): Promise<CrawlResult> {
  const errors: string[] = [];

  const [linkedInJobs, indeedJobs] = await Promise.allSettled([
    crawlLinkedIn(browser, options, config),
    crawlIndeed(indeedContext, options, config),
  ]);

  const jobs: JobListing[] = [];

  if (linkedInJobs.status === "fulfilled") {
    console.log(`LinkedIn: ${linkedInJobs.value.length} jobs`);
    jobs.push(...linkedInJobs.value);
  } else {
    const msg = `LinkedIn failed: ${linkedInJobs.reason}`;
    console.error(msg);
    errors.push(msg);
  }

  if (indeedJobs.status === "fulfilled") {
    console.log(`Indeed: ${indeedJobs.value.length} jobs`);
    jobs.push(...indeedJobs.value);
  } else {
    const msg = `Indeed failed: ${indeedJobs.reason}`;
    console.error(msg);
    errors.push(msg);
  }

  return { jobs, errors };
}

export type { JobListing, JobDetail, SearchOptions } from "@jobs-buddy/utils";
