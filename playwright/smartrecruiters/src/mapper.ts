import type { FieldSelector } from "@jobs-buddy/browser";

export const SMARTRECRUITERS_SELECTORS: FieldSelector[] = [
  { key: "firstName", selectors: ['input[name="firstName"]', "#first-name"] },
  { key: "lastName", selectors: ['input[name="lastName"]', "#last-name"] },
  { key: "email", selectors: ['input[name="email"]', 'input[type="email"]'] },
  { key: "phone", selectors: ['input[name="phone"]'] },
  { key: "linkedIn", selectors: ['input[name*="linkedin" i]'] },
  { key: "resumeFile", selectors: ['input[type="file"]'], type: "file" },
];
