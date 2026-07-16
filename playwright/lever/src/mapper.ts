import type { FieldSelector } from "@jobs-buddy/browser";

export const LEVER_SELECTORS: FieldSelector[] = [
  { key: "firstName", selectors: ['input[name="name"]', ".application-name input"] },
  { key: "email", selectors: ['input[name="email"]', 'input[type="email"]'] },
  { key: "phone", selectors: ['input[name="phone"]'] },
  { key: "linkedIn", selectors: ['input[name*="urls[LinkedIn]"]', 'input[name*="linkedin" i]'] },
  { key: "gitHub", selectors: ['input[name*="urls[GitHub]"]', 'input[name*="github" i]'] },
  { key: "portfolio", selectors: ['input[name*="urls[Portfolio]"]', 'input[name*="portfolio" i]'] },
  { key: "resumeFile", selectors: ['input[type="file"][name="resume"]', 'input[type="file"]'], type: "file" },
  { key: "coverLetterFile", selectors: ['input[type="file"][name="coverLetter"]'], type: "file" },
];
