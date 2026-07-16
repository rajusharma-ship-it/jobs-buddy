import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

export interface BrowserConfig {
  headless: boolean;
  sessionDir: string;
}

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export async function launchBrowser(config: BrowserConfig): Promise<Browser> {
  await mkdir(config.sessionDir, { recursive: true });
  return chromium.launch({
    headless: config.headless,
    args: ["--disable-blink-features=AutomationControlled", "--no-sandbox"],
  });
}

/** Persistent Chrome profile — log in once, session survives across runs */
export async function launchIndeedProfile(
  sessionDir: string,
  headless: boolean
): Promise<BrowserContext> {
  const profileDir = join(sessionDir, "indeed-chrome-profile");
  await mkdir(profileDir, { recursive: true });
  return chromium.launchPersistentContext(profileDir, {
    headless,
    viewport: { width: 1366, height: 900 },
    locale: "en-IN",
    userAgent: USER_AGENT,
    args: ["--disable-blink-features=AutomationControlled"],
  });
}

export function hasIndeedProfile(sessionDir: string): boolean {
  return existsSync(join(sessionDir, "indeed-chrome-profile"));
}

export async function createContextWithSession(
  browser: Browser,
  sessionName: string,
  sessionDir: string
): Promise<BrowserContext> {
  const storagePath = join(sessionDir, `${sessionName}-storage.json`);
  const base = {
    userAgent: USER_AGENT,
    viewport: { width: 1366, height: 900 },
    locale: "en-IN",
  };
  if (existsSync(storagePath)) {
    return browser.newContext({ ...base, storageState: storagePath });
  }
  return browser.newContext(base);
}

export async function createContext(
  browser: Browser,
  sessionName: string,
  sessionDir: string
): Promise<BrowserContext> {
  return createContextWithSession(browser, sessionName, sessionDir);
}

export async function saveSession(context: BrowserContext, sessionName: string, sessionDir: string) {
  const storagePath = join(sessionDir, `${sessionName}-storage.json`);
  await mkdir(sessionDir, { recursive: true });
  await context.storageState({ path: storagePath });
}

export async function safeAction<T>(
  page: Page,
  action: () => Promise<T>,
  screenshotDir: string,
  label: string
): Promise<T> {
  try {
    return await action();
  } catch (error) {
    await mkdir(screenshotDir, { recursive: true });
    const path = join(screenshotDir, `error-${label}-${Date.now()}.png`);
    await page.screenshot({ path, fullPage: true }).catch(() => {});
    throw error;
  }
}

export async function waitAndClick(page: Page, selector: string, timeout = 15000) {
  await page.waitForSelector(selector, { timeout });
  await page.click(selector);
}

export async function waitAndFill(page: Page, selector: string, value: string, timeout = 15000) {
  await page.waitForSelector(selector, { timeout });
  await page.fill(selector, value);
}

export async function takeScreenshot(page: Page, dir: string, name: string): Promise<string> {
  await mkdir(dir, { recursive: true });
  const path = join(dir, `${name}.png`);
  await page.screenshot({ path, fullPage: true });
  return path;
}

export async function saveCookiesFromEnv(
  context: BrowserContext,
  cookieHeader: string,
  domain: string
) {
  if (!cookieHeader) return;
  const cookies = cookieHeader.split(";").map((pair) => {
    const [name, ...rest] = pair.trim().split("=");
    return {
      name: name ?? "",
      value: rest.join("="),
      domain,
      path: "/",
    };
  });
  await context.addCookies(cookies.filter((c) => c.name));
}
