import type { Page } from "playwright";
import type { Profile } from "@jobs-buddy/profile";
import { getCurrentRole, getYearsOfExperience } from "@jobs-buddy/profile";
import { formatSalary } from "@jobs-buddy/utils";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

export interface FieldMap {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  linkedIn: string;
  gitHub: string;
  portfolio: string;
  currentCompany: string;
  currentTitle: string;
  yearsOfExperience: number;
  expectedSalary: string;
  noticePeriod: string;
  workAuthorization: string;
  resumeFile: Buffer;
  coverLetterFile: Buffer;
}

export interface FieldSelector {
  key: keyof FieldMap;
  selectors: string[];
  type?: "text" | "file" | "select";
}

export interface AutofillResult {
  filled: string[];
  missing: string[];
  unansweredQuestions: { selector: string; label: string }[];
}

export function buildFieldMap(
  profile: Profile,
  resumeFile: Buffer,
  coverLetterFile: Buffer
): FieldMap {
  const current = getCurrentRole(profile);
  const salary = formatSalary(
    profile.preferences.expectedSalary.currency,
    profile.preferences.expectedSalary.min,
    profile.preferences.expectedSalary.max
  );

  return {
    firstName: profile.personal.firstName,
    lastName: profile.personal.lastName,
    email: profile.personal.email,
    phone: profile.personal.phone,
    location: profile.personal.location,
    linkedIn: profile.personal.linkedIn ?? "",
    gitHub: profile.personal.gitHub ?? "",
    portfolio: profile.personal.portfolio ?? "",
    currentCompany: current.company,
    currentTitle: current.title,
    yearsOfExperience: getYearsOfExperience(profile),
    expectedSalary: salary,
    noticePeriod: profile.preferences.noticePeriod,
    workAuthorization: profile.preferences.workAuthorization,
    resumeFile,
    coverLetterFile,
  };
}

const GENERIC_SELECTORS: FieldSelector[] = [
  { key: "firstName", selectors: ['input[name*="first" i]', '#first_name', '[data-qa="first-name"]', 'input[autocomplete="given-name"]'] },
  { key: "lastName", selectors: ['input[name*="last" i]', '#last_name', '[data-qa="last-name"]', 'input[autocomplete="family-name"]'] },
  { key: "email", selectors: ['input[type="email"]', 'input[name*="email" i]', '#email', '[data-qa="email"]'] },
  { key: "phone", selectors: ['input[type="tel"]', 'input[name*="phone" i]', '#phone', '[data-qa="phone"]'] },
  { key: "location", selectors: ['input[name*="location" i]', '#location', '[data-qa="location"]', 'input[autocomplete="address-level2"]'] },
  { key: "linkedIn", selectors: ['input[name*="linkedin" i]', '#linkedin', '[data-qa="linkedin"]'] },
  { key: "gitHub", selectors: ['input[name*="github" i]', '#github', '[data-qa="github"]'] },
  { key: "portfolio", selectors: ['input[name*="portfolio" i]', 'input[name*="website" i]', '#website'] },
  { key: "currentCompany", selectors: ['input[name*="company" i]', '#company', '[data-qa="company"]'] },
  { key: "currentTitle", selectors: ['input[name*="title" i]', '#title', '[data-qa="title"]'] },
  { key: "expectedSalary", selectors: ['input[name*="salary" i]', '#salary', '[data-qa="salary"]'] },
  { key: "noticePeriod", selectors: ['input[name*="notice" i]', 'select[name*="notice" i]', '[data-qa="notice"]'] },
  { key: "workAuthorization", selectors: ['select[name*="authorization" i]', 'select[name*="visa" i]', '[data-qa="work-authorization"]'] },
  { key: "resumeFile", selectors: ['input[type="file"][name*="resume" i]', 'input[type="file"][id*="resume" i]', '[data-qa="resume"]'] },
  { key: "coverLetterFile", selectors: ['input[type="file"][name*="cover" i]', 'input[type="file"][id*="cover" i]', '[data-qa="cover-letter"]'] },
];

async function findVisibleSelector(page: Page, selectors: string[]): Promise<string | null> {
  for (const selector of selectors) {
    const el = page.locator(selector).first();
    if (await el.isVisible({ timeout: 500 }).catch(() => false)) {
      return selector;
    }
  }
  return null;
}

async function fillField(
  page: Page,
  selector: string,
  value: string | number | Buffer,
  type?: "text" | "file" | "select"
): Promise<void> {
  if (type === "file" && Buffer.isBuffer(value)) {
    const tmpPath = join(tmpdir(), `upload-${Date.now()}.pdf`);
    await writeFile(tmpPath, value);
    await page.setInputFiles(selector, tmpPath);
    return;
  }
  const str = String(value);
  const tag = await page.locator(selector).evaluate((el) => el.tagName.toLowerCase());
  if (tag === "select") {
    await page.selectOption(selector, { label: str }).catch(() =>
      page.selectOption(selector, str)
    );
  } else {
    await page.fill(selector, str);
  }
}

export async function autofillForm(
  page: Page,
  fieldMap: FieldMap,
  platformSelectors: FieldSelector[] = []
): Promise<AutofillResult> {
  const selectors = [...platformSelectors, ...GENERIC_SELECTORS];
  const filled: string[] = [];
  const missing: string[] = [];
  const usedKeys = new Set<string>();

  for (const field of selectors) {
    if (usedKeys.has(field.key)) continue;
    const selector = await findVisibleSelector(page, field.selectors);
    if (!selector) {
      if (!usedKeys.has(field.key)) missing.push(field.key);
      continue;
    }
    const value = fieldMap[field.key];
    if (value === undefined || value === "") continue;
    await fillField(page, selector, value, field.type);
    filled.push(field.key);
    usedKeys.add(field.key);
  }

  const unansweredQuestions: { selector: string; label: string }[] = [];
  const textareas = page.locator("textarea");
  const count = await textareas.count();
  for (let i = 0; i < count; i++) {
    const ta = textareas.nth(i);
    if (!(await ta.isVisible())) continue;
    const name = (await ta.getAttribute("name")) ?? `textarea-${i}`;
    const id = await ta.getAttribute("id");
    const labelEl = id ? page.locator(`label[for="${id}"]`) : ta.locator("xpath=preceding::label[1]");
    const label = (await labelEl.textContent().catch(() => null)) ?? name;
    const current = await ta.inputValue().catch(() => "");
    if (!current.trim()) {
      unansweredQuestions.push({ selector: id ? `#${id}` : `textarea:nth-of-type(${i + 1})`, label: label.trim() });
    }
  }

  return { filled, missing: missing.filter((k) => !usedKeys.has(k)), unansweredQuestions };
}
