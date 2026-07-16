import type { BrowserContext, Page } from "playwright";
import { saveSession, safeAction, saveCookiesFromEnv } from "@jobs-buddy/browser";

const LINKEDIN_URL = "https://www.linkedin.com";

export async function loginLinkedIn(
  context: BrowserContext,
  sessionDir: string,
  screenshotDir: string
): Promise<Page> {
  const page = await context.newPage();
  const cookieHeader = process.env.LINKEDIN_SESSION_COOKIE ?? "";
  if (cookieHeader) {
    await saveCookiesFromEnv(context, cookieHeader, ".linkedin.com");
  }

  await safeAction(page, () => page.goto(`${LINKEDIN_URL}/feed/`, { waitUntil: "domcontentloaded" }), screenshotDir, "linkedin-login");

  const url = page.url();
  if (url.includes("/login") || url.includes("/checkpoint")) {
    throw new Error("LinkedIn session expired. Run setup to re-authenticate.");
  }

  await saveSession(context, "linkedin", sessionDir);
  return page;
}

export async function openLinkedInForManualLogin(context: BrowserContext): Promise<Page> {
  const page = await context.newPage();
  await page.goto(`${LINKEDIN_URL}/login`, { waitUntil: "domcontentloaded" });
  return page;
}
