import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { launchBrowser } from "@jobs-buddy/browser";
import { crawlAll } from "@jobs-buddy/crawler";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: resolve(root, ".env") });

async function main() {
  const browser = await launchBrowser({
    headless: process.env.HEADLESS !== "false",
    sessionDir: resolve(root, "sessions"),
  });

  const result = await crawlAll(
    browser,
    { query: "React Next.js TypeScript Remote", location: "Remote", remote: true, maxPages: 1 },
    {
      headless: true,
      sessionDir: resolve(root, "sessions"),
      screenshotDir: resolve(root, "screenshots"),
    }
  );

  console.log("Jobs found:", result.jobs.length);
  console.log("Errors:", result.errors);
  if (result.jobs.length > 0) {
    console.log("Sample:", result.jobs.slice(0, 3));
  }

  await browser.close();
}

main().catch(console.error);
