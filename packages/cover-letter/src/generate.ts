import puppeteer from "puppeteer";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { Profile } from "@jobs-buddy/profile";
import { generateCoverLetter } from "@jobs-buddy/ai";
import { timestamp } from "@jobs-buddy/utils";

function renderCoverLetterHtml(text: string, profile: Profile, company: string, title: string): string {
  const paragraphs = text.split("\n\n").filter(Boolean);
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; line-height: 1.6; color: #1a1a1a; padding: 48px; max-width: 700px; margin: 0 auto; }
    .header { margin-bottom: 24px; }
    .date { color: #666; margin-bottom: 16px; }
    p { margin-bottom: 14px; }
    .signature { margin-top: 24px; }
  </style>
</head>
<body>
  <div class="header">
    <strong>${profile.personal.firstName} ${profile.personal.lastName}</strong><br/>
    ${profile.personal.email} · ${profile.personal.phone}
  </div>
  <div class="date">${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
  <p>Re: ${title} at ${company}</p>
  ${paragraphs.map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`).join("")}
  <div class="signature">
    <p>Sincerely,</p>
    <p><strong>${profile.personal.firstName} ${profile.personal.lastName}</strong></p>
  </div>
</body>
</html>`;
}

export async function generateCoverLetterPdf(
  jobDescription: string,
  profile: Profile,
  company: string,
  title: string,
  outputDir: string
): Promise<{ path: string; buffer: Buffer; text: string }> {
  const text = await generateCoverLetter(jobDescription, profile, company, title);
  const html = renderCoverLetterHtml(text, profile, company, title);
  await mkdir(outputDir, { recursive: true });

  const filename = `cover-letter-v${timestamp()}.pdf`;
  const pdfPath = join(outputDir, filename);

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });
  const buffer = Buffer.from(await page.pdf({ format: "A4", printBackground: true }));
  await browser.close();

  await writeFile(pdfPath, buffer);
  return { path: pdfPath, buffer, text };
}
