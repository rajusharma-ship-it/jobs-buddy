import type { BrowserContext, Page } from "playwright";
import type { JobDetail } from "@jobs-buddy/utils";
import { safeAction, takeScreenshot } from "@jobs-buddy/browser";
import { detectAtsPlatform } from "@jobs-buddy/utils";
import { INDEED_BASE } from "./login.js";

function jobKeyFromUrl(url: string): string | null {
  const match = url.match(/[?&]jk=([a-f0-9]+)/i);
  return match?.[1] ?? null;
}

async function dismissPopups(page: Page) {
  await page
    .locator(
      '#onetrust-accept-btn-handler, button:has-text("Accept"), button:has-text("I agree"), button:has-text("Got it")'
    )
    .first()
    .click({ timeout: 3000 })
    .catch(() => {});
}

async function readVisibleText(page: Page, selector: string, timeout = 5000): Promise<string> {
  const el = page.locator(selector).first();
  if (!(await el.isVisible({ timeout }).catch(() => false))) return "";
  return (await el.innerText({ timeout }).catch(() => "")).trim();
}

async function extractDescriptionFromDom(page: Page): Promise<string> {
  const selectors = [
    "#jobDescriptionText",
    ".jobsearch-JobComponent-description",
    ".jobsearch-jobDescriptionText",
    '[data-testid="jobsearch-JobComponent-description"]',
    "#job-details",
    '[id*="jobDescription"]',
  ];

  for (const selector of selectors) {
    const text = await readVisibleText(page, selector, 8000);
    if (text.length > 40) return text;
  }
  return "";
}

async function extractDescriptionFromJson(page: Page): Promise<string> {
  return page.evaluate(() => {
    const w = globalThis as unknown as {
      _initialData?: {
        autoOpenTwoPaneViewjobResponse?: { body?: Record<string, unknown> };
      };
      mosaic?: { providerData?: Record<string, { body?: Record<string, unknown> }> };
    };

    const candidates: unknown[] = [];
    const body = w._initialData?.autoOpenTwoPaneViewjobResponse?.body;
    if (body) {
      candidates.push(
        (body as { jobDescription?: { text?: string } }).jobDescription?.text,
        (body as { jobInfoModel?: { sanitizedJobDescription?: string } }).jobInfoModel?.sanitizedJobDescription,
        (body as { description?: string }).description,
        (body as { jobDescriptionText?: string }).jobDescriptionText
      );
    }

    for (const provider of Object.values(w.mosaic?.providerData ?? {})) {
      const pBody = provider?.body as Record<string, unknown> | undefined;
      if (!pBody) continue;
      candidates.push(
        (pBody.jobDescription as { text?: string } | undefined)?.text,
        pBody.sanitizedJobDescription,
        pBody.description
      );
    }

    for (const c of candidates) {
      if (typeof c === "string" && c.trim().length > 40) return c.trim();
    }
    return "";
  });
}

async function readApplyInfo(page: Page, fallbackUrl: string) {
  let applyUrl = fallbackUrl;
  let applyType: JobDetail["applyType"] = "external";
  const applyBtn = page
    .locator(
      "#indeedApplyButton, [data-testid='indeedApplyButton-test'], button:has-text('Apply now'), button:has-text('Apply with Indeed'), button:has-text('Easily apply')"
    )
    .first();

  if (await applyBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    const href = await applyBtn.getAttribute("href");
    if (href) {
      applyUrl = href.startsWith("http") ? href : `${INDEED_BASE}${href}`;
      applyType = detectAtsPlatform(applyUrl) ? "ats" : "external";
    } else {
      applyType = "easy_apply";
    }
  }

  return { applyUrl, applyType };
}

async function buildJobDetail(page: Page, url: string, screenshotDir: string): Promise<JobDetail> {
  const title =
    (await readVisibleText(
      page,
      "h1.jobsearch-JobInfoHeader-title, h2[data-testid='jobsearch-JobInfoHeader-title'], [data-testid='jobsearch-JobInfoHeader-title'], h1"
    )) || "";

  const company =
    (await readVisibleText(
      page,
      "[data-testid='inlineHeader-companyName'], [data-testid='jobsearch-CompanyInfoContainer'], .jobsearch-InlineCompanyRating a"
    )) || "";

  let description = await extractDescriptionFromDom(page);
  if (!description) description = await extractDescriptionFromJson(page);

  if (!description) {
    await takeScreenshot(page, screenshotDir, `indeed-no-desc-${Date.now()}`);
  }

  const { applyUrl, applyType } = await readApplyInfo(page, url);

  return {
    title: title.replace(/\s*-\s*job post$/i, "").trim(),
    company: company || "Unknown",
    url,
    description,
    applyUrl,
    applyType,
    platform: "indeed",
  };
}

export async function fetchJobDetail(page: Page, url: string, screenshotDir: string): Promise<JobDetail> {
  const jk = jobKeyFromUrl(url);
  const targetUrl = jk ? `${INDEED_BASE}/viewjob?jk=${jk}&from=serp&vjs=3` : url;

  await safeAction(
    page,
    () => page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 90000 }),
    screenshotDir,
    "indeed-detail"
  );

  await dismissPopups(page);
  await page.waitForTimeout(2500);
  await page
    .waitForSelector("#jobDescriptionText, .jobsearch-JobComponent-description", { timeout: 20000 })
    .catch(() => {});

  return buildJobDetail(page, targetUrl, screenshotDir);
}

/** Fallback: open SERP and click job card — description loads in the two-pane panel */
export async function fetchJobDetailFromSerp(
  context: BrowserContext,
  jobKey: string,
  searchUrl: string,
  screenshotDir: string
): Promise<JobDetail> {
  const page = await context.newPage();
  try {
    await safeAction(
      page,
      () => page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 90000 }),
      screenshotDir,
      "indeed-serp-detail"
    );
    await dismissPopups(page);
    await page.waitForTimeout(2000);

    const card = page.locator(`a[data-jk="${jobKey}"]`).first();
    if (!(await card.isVisible({ timeout: 10000 }).catch(() => false))) {
      return {
        title: "",
        company: "Unknown",
        url: `${INDEED_BASE}/viewjob?jk=${jobKey}`,
        description: "",
        applyUrl: `${INDEED_BASE}/viewjob?jk=${jobKey}`,
        applyType: "easy_apply",
        platform: "indeed",
      };
    }

    await card.click();
    await page.waitForTimeout(3500);
    await page
      .waitForSelector("#jobDescriptionText, .jobsearch-JobComponent-description", { timeout: 15000 })
      .catch(() => {});

    return buildJobDetail(page, `${INDEED_BASE}/viewjob?jk=${jobKey}`, screenshotDir);
  } finally {
    await page.close();
  }
}
