import { launchIndeedProfile, hasIndeedProfile } from "@jobs-buddy/browser";
import {
  ensureIndeedLoggedIn,
  verifyIndeedLoggedIn,
  isIndeedLoggedIn,
  fetchIndeedProfile,
  mergeIndeedIntoProfile,
  INDEED_PROFILE_BASE,
} from "@jobs-buddy/playwright-indeed";
import { env } from "./config.js";
import { acquireIndeedLock } from "./indeed-lock.js";

let loginInProgress = false;
let lastIndeedSync: { at: string; skills: number; headline?: string } | null = null;

export function isIndeedLoginInProgress(): boolean {
  return loginInProgress;
}

export function getSessionStatus() {
  return {
    indeed: {
      profileExists: hasIndeedProfile(env.sessionDir),
      loginInProgress,
      lastSync: lastIndeedSync,
      profileUrl: INDEED_PROFILE_BASE,
    },
    linkedin: {
      profileExists: false,
    },
  };
}

export async function syncIndeedProfileToDb(
  existingContext?: Awaited<ReturnType<typeof launchIndeedProfile>>
): Promise<{ ok: boolean; message: string }> {
  const ownsContext = !existingContext;
  const release = ownsContext ? await acquireIndeedLock("sync") : () => {};
  const context = existingContext ?? (await launchIndeedProfile(env.sessionDir, false));

  try {
    const page = await context.newPage();
    try {
      if (!(await verifyIndeedLoggedIn(page))) {
        return {
          ok: false,
          message: `Not logged in — open ${INDEED_PROFILE_BASE} and sign in via Connect Indeed`,
        };
      }
    } finally {
      await page.close();
    }

    const indeedData = await fetchIndeedProfile(context, env.outputDir);
    const { getProfile, saveProfile, runMigrations } = await import("@jobs-buddy/db");
    const db = await runMigrations(env.databaseUrl);
    const base = await getProfile(db);
    if (!base) return { ok: false, message: "No local profile — run pnpm setup first" };

    const merged = mergeIndeedIntoProfile(base, indeedData);
    await saveProfile(db, merged);
    lastIndeedSync = {
      at: new Date().toISOString(),
      skills: indeedData.skills.length,
      headline: indeedData.headline,
    };
    return {
      ok: true,
      message: `Indeed profile synced — ${indeedData.skills.length} skills, roles: ${indeedData.jobTitles.join(", ") || "from local profile"}`,
    };
  } finally {
    if (ownsContext) {
      await context.close().catch(() => {});
      release();
    }
  }
}

export async function startIndeedLogin(): Promise<{ ok: boolean; message: string }> {
  if (loginInProgress) {
    return { ok: false, message: "Indeed login already in progress — check the Chrome window" };
  }

  loginInProgress = true;
  const release = await acquireIndeedLock("login");

  try {
    const context = await launchIndeedProfile(env.sessionDir, false);
    try {
      const page = await context.newPage();
      await page.goto(INDEED_PROFILE_BASE, { waitUntil: "domcontentloaded", timeout: 60000 });

      const deadline = Date.now() + 180_000;
      while (Date.now() < deadline) {
        await page.waitForTimeout(2000);
        if (await isIndeedLoggedIn(page)) {
          const confirmed = await verifyIndeedLoggedIn(page);
          if (confirmed) {
            await page.close();
            const sync = await syncIndeedProfileToDb(context).catch(() => ({
              ok: false,
              message: "Logged in but profile sync failed — click Sync Indeed Profile",
            }));
            return {
              ok: true,
              message: sync.ok
                ? `Indeed connected! ${sync.message}`
                : "Indeed login successful! Click Sync Indeed Profile to pull your data.",
            };
          }
        }
      }

      await page.close();
      return { ok: false, message: `Login timed out — sign in at ${INDEED_PROFILE_BASE}` };
    } finally {
      await context.close();
    }
  } finally {
    loginInProgress = false;
    release();
  }
}

export async function verifyIndeedSession(): Promise<boolean> {
  const context = await launchIndeedProfile(env.sessionDir, false);
  try {
    const page = await context.newPage();
    try {
      return await verifyIndeedLoggedIn(page);
    } finally {
      await page.close();
    }
  } finally {
    await context.close();
  }
}
