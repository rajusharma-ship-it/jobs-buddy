import type { Page } from "playwright";
import type { Profile } from "@jobs-buddy/profile";
import { autofillForm, buildFieldMap, safeAction } from "@jobs-buddy/browser";

export async function applyEasyApply(
  page: Page,
  profile: Profile,
  resumeBuffer: Buffer,
  coverLetterBuffer: Buffer,
  screenshotDir: string
) {
  const easyApplyBtn = page.locator("button:has-text('Easy Apply')").first();
  await safeAction(page, () => easyApplyBtn.click(), screenshotDir, "linkedin-easy-apply");

  await page.waitForSelector(".jobs-easy-apply-modal", { timeout: 15000 }).catch(() =>
    page.waitForSelector("[data-test-modal]", { timeout: 10000 })
  );

  const fieldMap = buildFieldMap(profile, resumeBuffer, coverLetterBuffer);
  return autofillForm(page, fieldMap);
}

export async function submitApplication(page: Page, screenshotDir: string) {
  const submitBtn = page.locator("button:has-text('Submit application'), button[aria-label='Submit application']").first();
  await safeAction(page, () => submitBtn.click(), screenshotDir, "linkedin-submit");
}
