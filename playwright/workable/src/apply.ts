import type { Page } from "playwright";
import type { Profile } from "@jobs-buddy/profile";
import { autofillForm, buildFieldMap, safeAction, takeScreenshot } from "@jobs-buddy/browser";
import { WORKABLE_SELECTORS } from "./mapper.js";

export async function applyWorkable(page: Page, applyUrl: string, profile: Profile, resumeBuffer: Buffer, coverLetterBuffer: Buffer, screenshotDir: string) {
  await safeAction(page, () => page.goto(applyUrl, { waitUntil: "domcontentloaded" }), screenshotDir, "workable-open");
  await page.waitForSelector("form#application-form, .application-form", { timeout: 20000 }).catch(() => {});
  const fieldMap = buildFieldMap(profile, resumeBuffer, coverLetterBuffer);
  const result = await autofillForm(page, fieldMap, WORKABLE_SELECTORS);
  const screenshot = await takeScreenshot(page, screenshotDir, `workable-${Date.now()}`);
  return { ...result, screenshot };
}

export async function submitWorkable(page: Page, screenshotDir: string) {
  await safeAction(page, () => page.locator("button:has-text('Submit'), input[type='submit']").first().click(), screenshotDir, "workable-submit");
}
