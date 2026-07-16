import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { launchIndeedProfile } from "@jobs-buddy/browser";
import { verifyIndeedLoggedIn, INDEED_PROFILE_BASE } from "@jobs-buddy/playwright-indeed";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: resolve(root, ".env") });

async function main() {
  console.log(`Opening Chrome — log in at ${INDEED_PROFILE_BASE}`);
  console.log("Your session will be saved to sessions/indeed-chrome-profile/\n");

  const context = await launchIndeedProfile(resolve(root, "sessions"), false);
  const page = await context.newPage();
  await page.goto(INDEED_PROFILE_BASE, { waitUntil: "domcontentloaded" });

  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    await page.waitForTimeout(2000);
    if (await verifyIndeedLoggedIn(page)) {
      console.log("\nIndeed login successful!");
      await context.close();
      process.exit(0);
    }
  }

  console.error("Timed out — try again");
  await context.close();
  process.exit(1);
}

main().catch(console.error);
