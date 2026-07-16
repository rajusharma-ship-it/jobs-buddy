import type { Page } from "playwright";
import type { Profile } from "@jobs-buddy/profile";
import { autofillForm, buildFieldMap, safeAction, takeScreenshot } from "@jobs-buddy/browser";
import { LEVER_SELECTORS } from "./mapper.js";

export async function applyLever(
  page: Page,
  applyUrl: string,
  profile: Profile,
  resumeBuffer: Buffer,
  coverLetterBuffer: Buffer,
  screenshotDir: string
) {
  await safeAction(page, () => page.goto(applyUrl, { waitUntil: "domcontentloaded" }), screenshotDir, "lever-open");
  await page.waitForSelector(".application-form, form.postings-btn", { timeout: 20000 }).catch(() => {});

  const fieldMap = buildFieldMap(profile, resumeBuffer, coverLetterBuffer);
  const result = await autofillForm(page, fieldMap, LEVER_SELECTORS);
  const screenshot = await takeScreenshot(page, screenshotDir, `lever-${Date.now()}`);
  return { ...result, screenshot };
}

export async function submitLever(page: Page, screenshotDir: string) {
  const submit = page.locator("button.template-btn-submit, button:has-text('Submit application')").first();
  await safeAction(page, () => submit.click(), screenshotDir, "lever-submit");
}
