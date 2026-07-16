import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { config } from "dotenv";
import { mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { runMigrations, saveProfile } from "@jobs-buddy/db";
import { profileSchema } from "@jobs-buddy/profile";
import { openLinkedInForManualLogin } from "@jobs-buddy/playwright-linkedin";
import { saveSession } from "@jobs-buddy/browser";
import {
  loadNotificationConfig,
  sendTelegramTest,
  sendDiscordTest,
  sendEmailTest,
} from "@jobs-buddy/notifications";
import { runPipeline } from "../apps/worker/src/pipeline.js";

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: resolve(PROJECT_ROOT, ".env") });

const SESSION_DIR = resolve(PROJECT_ROOT, "sessions");
mkdirSync(SESSION_DIR, { recursive: true });

const rl = createInterface({ input, output });

async function prompt(question: string): Promise<string> {
  const answer = await rl.question(question);
  return answer.trim();
}

async function collectProfile() {
  console.log("\n=== Profile Setup ===\n");

  const firstName = await prompt("First name: ");
  const lastName = await prompt("Last name: ");
  const email = await prompt("Email: ");
  const phone = await prompt("Phone: ");
  const location = await prompt("Location (e.g. Berlin, Germany): ");
  const linkedIn = await prompt("LinkedIn URL (optional): ");
  const gitHub = await prompt("GitHub URL (optional): ");
  const portfolio = await prompt("Portfolio URL (optional): ");
  const targetRoles = await prompt("Target roles (comma-separated): ");
  const targetTech = await prompt("Target tech (comma-separated, e.g. React, Next.js, TypeScript): ");
  const skills = await prompt("Skills (comma-separated): ");
  const minScore = await prompt("Min match score (default 80): ");
  const noticePeriod = await prompt("Notice period (e.g. 1 month): ");
  const workAuth = await prompt("Work authorization: ");

  const company = await prompt("Current/most recent company: ");
  const title = await prompt("Current/most recent title: ");
  const description = await prompt("Brief role description: ");

  const profile = profileSchema.parse({
    personal: {
      firstName,
      lastName,
      email,
      phone,
      location,
      linkedIn: linkedIn || "",
      gitHub: gitHub || "",
      portfolio: portfolio || "",
    },
    experience: [
      {
        company,
        title,
        startDate: "2020-01",
        endDate: null,
        description,
        techStack: targetTech.split(",").map((s) => s.trim()).filter(Boolean),
      },
    ],
    education: [],
    skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
    preferences: {
      targetRoles: targetRoles.split(",").map((s) => s.trim()).filter(Boolean),
      targetLocations: ["Remote", "Europe"],
      targetTech: targetTech.split(",").map((s) => s.trim()).filter(Boolean),
      minMatchScore: parseInt(minScore || "80", 10),
      expectedSalary: { currency: "EUR", min: 80000, max: 120000 },
      noticePeriod: noticePeriod || "1 month",
      workAuthorization: workAuth || "EU citizen",
    },
  });

  return profile;
}

async function linkedInLogin() {
  console.log("\n=== LinkedIn Login ===\n");
  console.log("A browser window will open. Log in to LinkedIn manually.");
  console.log("Press Enter here once you see your LinkedIn feed...\n");

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await openLinkedInForManualLogin(context);

  await prompt("Press Enter after logging in...");

  await saveSession(context, "linkedin", SESSION_DIR);
  console.log(`LinkedIn session saved to ${SESSION_DIR}\\linkedin-storage.json`);

  await browser.close();
}

async function testNotifications() {
  console.log("\n=== Notification Test ===\n");
  const config = loadNotificationConfig();

  const results: string[] = [];
  if (await sendTelegramTest(config)) results.push("Telegram: OK");
  else results.push("Telegram: skipped or failed");

  if (await sendDiscordTest(config)) results.push("Discord: OK");
  else results.push("Discord: skipped or failed");

  if (await sendEmailTest(config)) results.push("Email: OK");
  else results.push("Email: skipped or failed");

  console.log(results.join("\n"));
}

async function dryRun(db: Awaited<ReturnType<typeof runMigrations>>) {
  console.log("\n=== Dry Run (scoring only, no applying) ===\n");
  process.env.DRY_RUN = "true";
  process.env.HEADLESS = "true";
  await runPipeline(db);
  console.log("\nDry run complete. Check the dashboard for scored jobs.");
}

async function main() {
  console.log("Jobs Buddy — Setup\n");

  const dbPath = process.env.DATABASE_URL ?? `file:${resolve(PROJECT_ROOT, "data", "jobs-buddy.db")}`;
  const db = await runMigrations(dbPath);
  console.log(`Database initialized at ${dbPath}`);

  const profile = await collectProfile();
  await saveProfile(db, profile);
  console.log("Profile saved.");

  const doLogin = await prompt("\nSet up LinkedIn login now? (y/n): ");
  if (doLogin.toLowerCase() === "y") {
    await linkedInLogin();
  }

  const doNotif = await prompt("Test notifications? (y/n): ");
  if (doNotif.toLowerCase() === "y") {
    await testNotifications();
  }

  const doDryRun = await prompt("Run dry-run crawler? (y/n): ");
  if (doDryRun.toLowerCase() === "y") {
    await dryRun(db);
  }

  console.log("\nSetup complete!");
  console.log("Next steps:");
  console.log("  1. Copy .env.example to .env and add your API keys");
  console.log("  2. pnpm dev:worker   — start the worker + API");
  console.log("  3. pnpm dev:dashboard — start the review UI");
  console.log("  4. Open http://localhost:3000");

  rl.close();
}

main().catch((err) => {
  console.error(err);
  rl.close();
  process.exit(1);
});
