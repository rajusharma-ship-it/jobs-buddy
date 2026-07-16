import type { Page } from "playwright";
import type { BrowserContext } from "playwright";
import type { Profile } from "@jobs-buddy/profile";
import { INDEED_PROFILE_BASE } from "./login.js";
import { isIndeedLoggedIn } from "./login.js";

export interface IndeedProfileData {
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  headline?: string;
  skills: string[];
  resumeText?: string;
  resumePath?: string;
  jobTitles: string[];
}

async function readOptionalText(page: Page, selector: string): Promise<string | undefined> {
  const el = page.locator(selector).first();
  if (!(await el.isVisible({ timeout: 2500 }).catch(() => false))) return undefined;
  return (await el.textContent({ timeout: 2500 }).catch(() => null))?.trim() || undefined;
}

async function gotoProfileSection(page: Page, path: string): Promise<boolean> {
  const url = `${INDEED_PROFILE_BASE}${path}`;
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(2000);
    const current = page.url();
    if (current.includes("secure.indeed.com") || current.includes("Sign+In")) return false;
    return true;
  } catch {
    return false;
  }
}

export async function fetchIndeedProfile(
  context: BrowserContext,
  _outputDir: string
): Promise<IndeedProfileData> {
  const page = await context.newPage();
  const data: IndeedProfileData = { skills: [], jobTitles: [] };

  try {
    await page.goto(INDEED_PROFILE_BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(2000);

    if (!(await isIndeedLoggedIn(page))) {
      throw new Error("Not logged in — sign in at profile.indeed.com first");
    }

    data.fullName = await readOptionalText(page, "h1, [data-testid='profile-name']");
    data.headline = await readOptionalText(
      page,
      "[data-testid='profile-headline'], [data-testid='headline'], .headline"
    );
    data.location = await readOptionalText(
      page,
      "[data-testid='profile-location'], [data-testid='location'], .location"
    );

    const skillEls = page.locator("[data-testid='skill'], [data-testid='skills'] li, .skill-tag");
    const skillCount = Math.min(await skillEls.count(), 30);
    for (let i = 0; i < skillCount; i++) {
      const s = (await skillEls.nth(i).textContent({ timeout: 1000 }).catch(() => null))?.trim();
      if (s && s.length > 1 && !/^skills?$/i.test(s)) data.skills.push(s);
    }

    if (await gotoProfileSection(page, "/resume")) {
      data.resumeText = (await page.locator("main, [role='main']").first().textContent({ timeout: 5000 }).catch(() => null))?.slice(0, 8000);
    }

    if (await gotoProfileSection(page, "/preferences")) {
      const prefText = await page.locator("main, [role='main']").first().textContent({ timeout: 5000 }).catch(() => null);
      if (prefText) {
        const titleMatch = prefText.match(/job titles?[:\s]+([^\n]+)/i);
        if (titleMatch?.[1]) {
          data.jobTitles = titleMatch[1].split(",").map((t) => t.trim()).filter(Boolean);
        }
      }
    }

    console.log(
      `Indeed profile synced from ${INDEED_PROFILE_BASE}: ${data.skills.length} skills, headline: ${data.headline ?? "—"}`
    );
    return data;
  } finally {
    await page.close();
  }
}

export function mergeIndeedIntoProfile(base: Profile, indeed: IndeedProfileData): Profile {
  const merged = { ...base };
  if (indeed.fullName) {
    const parts = indeed.fullName.split(" ");
    merged.personal = {
      ...merged.personal,
      firstName: parts[0] ?? merged.personal.firstName,
      lastName: parts.slice(1).join(" ") || merged.personal.lastName,
    };
  }
  if (indeed.location) merged.personal.location = indeed.location;
  if (indeed.skills.length > 0) {
    merged.skills = [...new Set([...merged.skills, ...indeed.skills])];
  }
  if (indeed.jobTitles.length > 0) {
    merged.preferences = {
      ...merged.preferences,
      targetRoles: [...new Set([...merged.preferences.targetRoles, ...indeed.jobTitles])],
    };
  }
  if (indeed.headline && merged.experience.length > 0 && merged.experience[0]) {
    merged.experience[0] = { ...merged.experience[0], title: indeed.headline };
  }
  return merged;
}
