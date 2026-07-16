import type { Page } from "playwright";
import type { Profile } from "@jobs-buddy/profile";
import { autofillForm, buildFieldMap, safeAction, takeScreenshot } from "@jobs-buddy/browser";
import { SMARTRECRUITERS_SELECTORS } from "./mapper.js";

export async function applySmartRecruiters(page: Page, applyUrl: string, profile: Profile, resumeBuffer: Buffer, coverLetterBuffer: Buffer, screenshotDir: string) {
  await safeAction(page, () => page.goto(applyUrl, { waitUntil: "domcontentloaded" }), screenshotDir, "smartrecruiters-open");
  await page.waitForSelector("form, .application-form", { timeout: 20000 }).catch(() => {});
  const fieldMap = buildFieldMap(profile, resumeBuffer, coverLetterBuffer);
  const result = await autofillForm(page, fieldMap, SMARTRECRUITERS_SELECTORS);
  const screenshot = await takeScreenshot(page, screenshotDir, `smartrecruiters-${Date.now()}`);
  return { ...result, screenshot };
}

export async function submitSmartRecruiters(page: Page, screenshotDir: string) {
  await safeAction(page, () => page.locator("button:has-text('Send'), button[type='submit']").first().click(), screenshotDir, "smartrecruiters-submit");
}
