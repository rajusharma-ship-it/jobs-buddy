import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileSync, mkdirSync } from "node:fs";
import { chromium } from "playwright";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: resolve(root, ".env") });

async function main() {
  mkdirSync(resolve(root, "screenshots"), { recursive: true });
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const page = await browser.newPage();

  const url = "https://in.indeed.com/jobs?q=React+Developer&l=Remote&remotejob=1";
  console.log("Opening:", url);
  await page.goto(url, { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(5000);

  const html = await page.content();
  writeFileSync(resolve(root, "screenshots", "indeed-debug.html"), html);
  await page.screenshot({ path: resolve(root, "screenshots", "indeed-debug.png"), fullPage: true });

  const selectors = [
    ".job_seen_beacon",
    ".jobsearch-ResultsList > li",
    "[data-testid='slider_item']",
    ".tapItem",
    "div.job_seen_beacon",
    "a[data-jk]",
    "h2.jobTitle",
    "#mosaic-jobResults",
  ];

  for (const sel of selectors) {
    const count = await page.locator(sel).count();
    console.log(`${sel}: ${count}`);
  }

  console.log("Title:", await page.title());
  console.log("URL:", page.url());
  await page.waitForTimeout(10000);
  await browser.close();
}

main().catch(console.error);
