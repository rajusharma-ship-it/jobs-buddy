import type { BrowserContext, Page } from "playwright";
import { safeAction, saveSession } from "@jobs-buddy/browser";

export const INDEED_BASE = process.env.INDEED_DOMAIN ?? "https://in.indeed.com";
/** Indeed account/profile lives on a separate domain — not in.indeed.com/profile */
export const INDEED_PROFILE_BASE = "https://profile.indeed.com";
export const INDEED_LOGIN_URL =
  process.env.INDEED_LOGIN_URL ??
  `https://secure.indeed.com/account/login?hl=en_IN&co=IN&continue=${encodeURIComponent(INDEED_PROFILE_BASE + "/")}`;

async function isSignInFormVisible(page: Page): Promise<boolean> {
  const signInMarkers = page.locator(
    [
      'input[type="email"]',
      'button:has-text("Continue with Google")',
      'button:has-text("Continue with Apple")',
      'h1:has-text("Sign in")',
      'h1:has-text("Sign In")',
      'text="Create an account or sign in"',
    ].join(", ")
  );
  return signInMarkers.first().isVisible({ timeout: 2000 }).catch(() => false);
}

function isAuthUrl(url: string): boolean {
  return (
    url.includes("secure.indeed.com/auth") ||
    url.includes("secure.indeed.com/account/login") ||
    url.includes("/account/login") ||
    url.includes("Sign+In") ||
    url.includes("signin")
  );
}

/** Quick check on the current page (job site nav, etc.) */
export async function isIndeedLoggedIn(page: Page): Promise<boolean> {
  const url = page.url();

  if (isAuthUrl(url)) return false;
  if (await isSignInFormVisible(page)) return false;

  // Logged-in profile dashboard (profile.indeed.com, not the sign-in page)
  if (url.startsWith(INDEED_PROFILE_BASE) && !isAuthUrl(url)) {
    const onProfile = page.locator(
      '[data-testid="profile-name"], h1, nav a:has-text("Resume"), a:has-text("Resume"), a:has-text("Preferences")'
    );
    if (await onProfile.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      return true;
    }
  }

  const accountSelectors = [
    '[data-gnav-element-name="AccountMenu"]',
    '[data-testid="gnav-account-menu"]',
    "#AccountMenu",
    'a[aria-label*="Account"]',
    'button[aria-label*="Account"]',
    'a[href*="profile.indeed.com"]',
    '[data-tn-element="account-menu"]',
  ];
  for (const sel of accountSelectors) {
    if (await page.locator(sel).first().isVisible({ timeout: 1000 }).catch(() => false)) {
      return true;
    }
  }

  const signIn = page.locator(
    'a:has-text("Sign in"), button:has-text("Sign in"), a:has-text("Log in"), button:has-text("Log in")'
  );
  if (await signIn.first().isVisible({ timeout: 1500 }).catch(() => false)) return false;

  return false;
}

/** Definitive check — opens profile.indeed.com and verifies we are not on the sign-in page */
export async function verifyIndeedLoggedIn(page: Page): Promise<boolean> {
  await page.goto(INDEED_PROFILE_BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2500);

  const url = page.url();
  if (isAuthUrl(url)) return false;
  if (await isSignInFormVisible(page)) return false;

  // 404 on wrong domain — in.indeed.com/profile is NOT a valid profile page
  if (url.includes("in.indeed.com/profile") || url.includes("indeed.com/profile")) {
    const notFound = page.locator('text="Page not found", text="404", h1:has-text("not found")');
    if (await notFound.first().isVisible({ timeout: 1500 }).catch(() => false)) return false;
  }

  const profileContent = page.locator(
    '[data-testid="profile-name"], h1, a:has-text("Resume"), a:has-text("Preferences"), nav'
  );
  return profileContent.first().isVisible({ timeout: 5000 }).catch(() => false);
}

async function tryCredentialLogin(page: Page, screenshotDir: string): Promise<boolean> {
  const email = process.env.INDEED_EMAIL;
  const password = process.env.INDEED_PASSWORD;
  if (!email || !password) return false;

  await safeAction(
    page,
    () => page.goto(INDEED_LOGIN_URL, { waitUntil: "domcontentloaded", timeout: 60000 }),
    screenshotDir,
    "indeed-login"
  );

  await page.fill('input[type="email"], input[name="__email"], #ifl-InputFormField-3', email).catch(() => {});
  await page.click('button[type="submit"], button:has-text("Continue"), button:has-text("Sign in")').catch(() => {});
  await page.waitForTimeout(2000);
  await page.fill('input[type="password"], #ifl-InputFormField-4', password).catch(() => {});
  await page.click('button[type="submit"], button:has-text("Sign in")').catch(() => {});
  await page.waitForTimeout(4000);

  return await verifyIndeedLoggedIn(page);
}

export async function ensureIndeedLoggedIn(
  context: BrowserContext,
  screenshotDir: string,
  sessionDir?: string
): Promise<boolean> {
  const page = await context.newPage();
  try {
    if (await verifyIndeedLoggedIn(page)) {
      if (sessionDir) await saveSession(context, "indeed", sessionDir);
      return true;
    }

    if (await tryCredentialLogin(page, screenshotDir)) {
      if (sessionDir) await saveSession(context, "indeed", sessionDir);
      return true;
    }

    console.log("\n========================================");
    console.log("  LOG IN TO INDEED in the Chrome window");
    console.log(`  URL: ${INDEED_PROFILE_BASE}`);
    console.log("  Waiting up to 3 minutes...");
    console.log("========================================\n");

    await page.goto(INDEED_PROFILE_BASE, { waitUntil: "domcontentloaded" });

    const deadline = Date.now() + 180_000;
    while (Date.now() < deadline) {
      await page.waitForTimeout(2000);
      // Don't navigate during manual login — only check current page
      if (await isIndeedLoggedIn(page)) {
        const confirmed = await verifyIndeedLoggedIn(page);
        if (confirmed) {
          console.log("Indeed: login detected on profile.indeed.com!");
          if (sessionDir) await saveSession(context, "indeed", sessionDir);
          return true;
        }
      }
    }

    return false;
  } finally {
    await page.close();
  }
}

export async function openIndeedForManualLogin(context: BrowserContext): Promise<Page> {
  const page = await context.newPage();
  await page.goto(INDEED_PROFILE_BASE, { waitUntil: "domcontentloaded" });
  return page;
}

export async function loginIndeed(
  context: BrowserContext,
  screenshotDir: string,
  sessionDir?: string
): Promise<Page> {
  await ensureIndeedLoggedIn(context, screenshotDir, sessionDir);
  return context.newPage();
}
