import puppeteer from "puppeteer";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { Profile } from "@jobs-buddy/profile";
import { generateTailoredResume } from "@jobs-buddy/ai";
import { timestamp } from "@jobs-buddy/utils";
import { renderResumeHtml } from "./template.js";

export async function generateResumePdf(
  jobDescription: string,
  profile: Profile,
  outputDir: string
): Promise<{ path: string; buffer: Buffer }> {
  const tailored = await generateTailoredResume(jobDescription, profile);
  const html = renderResumeHtml(profile, tailored);
  await mkdir(outputDir, { recursive: true });

  const filename = `resume-v${timestamp()}.pdf`;
  const pdfPath = join(outputDir, filename);

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });
  const buffer = Buffer.from(await page.pdf({ format: "A4", printBackground: true }));
  await browser.close();

  await writeFile(pdfPath, buffer);
  return { path: pdfPath, buffer };
}
