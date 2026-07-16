import type { Page } from "playwright";
import type { Profile } from "@jobs-buddy/profile";
import { autofillForm, buildFieldMap, safeAction, takeScreenshot } from "@jobs-buddy/browser";
import { GREENHOUSE_SELECTORS } from "./mapper.js";

export async function applyGreenhouse(
  page: Page,
  applyUrl: string,
  profile: Profile,
  resumeBuffer: Buffer,
  coverLetterBuffer: Buffer,
  screenshotDir: string
) {
  await safeAction(page, () => page.goto(applyUrl, { waitUntil: "domcontentloaded" }), screenshotDir, "greenhouse-open");
  await page.waitForSelector("#application_form, form[action*='greenhouse']", { timeout: 20000 }).catch(() => {});

  const fieldMap = buildFieldMap(profile, resumeBuffer, coverLetterBuffer);
  const result = await autofillForm(page, fieldMap, GREENHOUSE_SELECTORS);
  const screenshot = await takeScreenshot(page, screenshotDir, `greenhouse-${Date.now()}`);
  return { ...result, screenshot };
}

export async function submitGreenhouse(page: Page, screenshotDir: string) {
  const submit = page.locator("#submit_app, button:has-text('Submit Application')").first();
  await safeAction(page, () => submit.click(), screenshotDir, "greenhouse-submit");
}
