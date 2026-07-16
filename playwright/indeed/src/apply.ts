import type { Page } from "playwright";
import type { Profile } from "@jobs-buddy/profile";
import { autofillForm, buildFieldMap, safeAction, takeScreenshot } from "@jobs-buddy/browser";

export async function applyIndeed(
  page: Page,
  profile: Profile,
  resumeBuffer: Buffer,
  coverLetterBuffer: Buffer,
  screenshotDir: string
) {
  const applyBtn = page.locator(
    "#indeedApplyButton, button:has-text('Apply now'), a:has-text('Apply now'), button:has-text('Easily apply')"
  ).first();

  await safeAction(page, () => applyBtn.click(), screenshotDir, "indeed-apply-click");
  await page.waitForTimeout(3000);

  // Prefer Indeed's saved resume when offered
  const useIndeedResume = page.locator(
    "button:has-text('Use this resume'), button:has-text('Indeed Resume'), input[id*='indeed-resume']"
  ).first();
  if (await useIndeedResume.isVisible({ timeout: 5000 }).catch(() => false)) {
    await useIndeedResume.click().catch(() => {});
    await page.waitForTimeout(1500);
  } else {
    const uploadInput = page.locator("input[type='file']").first();
    if (await uploadInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      const { writeFile, unlink } = await import("node:fs/promises");
      const { join } = await import("node:path");
      const { tmpdir } = await import("node:os");
      const tmp = join(tmpdir(), `resume-${Date.now()}.pdf`);
      await writeFile(tmp, resumeBuffer);
      await uploadInput.setInputFiles(tmp).catch(() => {});
      await unlink(tmp).catch(() => {});
    }
  }

  const fieldMap = buildFieldMap(profile, resumeBuffer, coverLetterBuffer);
  const result = await autofillForm(page, fieldMap);

  // Walk through Indeed multi-step apply wizard
  for (let step = 0; step < 8; step++) {
    const continueBtn = page.locator(
      "button:has-text('Continue'), button:has-text('Next'), button:has-text('Review your application')"
    ).first();
    const reviewBtn = page.locator("button:has-text('Review'), button:has-text('Review your application')").first();

    if (await reviewBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await takeScreenshot(page, screenshotDir, `indeed-review-${Date.now()}`);
      break;
    }
    if (await continueBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await continueBtn.click().catch(() => {});
      await page.waitForTimeout(1500);
      continue;
    }
    break;
  }

  const screenshot = await takeScreenshot(page, screenshotDir, `indeed-ready-${Date.now()}`);
  return { ...result, screenshot };
}

export async function submitApplication(page: Page, screenshotDir: string) {
  const submitBtn = page.locator(
    "button:has-text('Submit your application'), button:has-text('Submit application'), button:has-text('Submit'), button[type='submit']"
  ).first();
  await safeAction(page, () => submitBtn.click(), screenshotDir, "indeed-submit");
  await page.waitForTimeout(2000);
}
