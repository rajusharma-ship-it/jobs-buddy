import type { Page } from "playwright";
import type { Profile } from "@jobs-buddy/profile";
import { autofillForm, buildFieldMap, safeAction, takeScreenshot } from "@jobs-buddy/browser";
import { ASHBY_SELECTORS } from "./mapper.js";

export async function applyAshby(page: Page, applyUrl: string, profile: Profile, resumeBuffer: Buffer, coverLetterBuffer: Buffer, screenshotDir: string) {
  await safeAction(page, () => page.goto(applyUrl, { waitUntil: "domcontentloaded" }), screenshotDir, "ashby-open");
  await page.waitForSelector("form", { timeout: 20000 });
  const fieldMap = buildFieldMap(profile, resumeBuffer, coverLetterBuffer);
  const result = await autofillForm(page, fieldMap, ASHBY_SELECTORS);
  const screenshot = await takeScreenshot(page, screenshotDir, `ashby-${Date.now()}`);
  return { ...result, screenshot };
}

export async function submitAshby(page: Page, screenshotDir: string) {
  await safeAction(page, () => page.locator("button[type='submit']").first().click(), screenshotDir, "ashby-submit");
}
