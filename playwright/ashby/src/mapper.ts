import type { FieldSelector } from "@jobs-buddy/browser";

export const ASHBY_SELECTORS: FieldSelector[] = [
  { key: "firstName", selectors: ['input[name="_systemfield_name"]', 'input[autocomplete="given-name"]'] },
  { key: "email", selectors: ['input[name="_systemfield_email"]', 'input[type="email"]'] },
  { key: "phone", selectors: ['input[name*="phone" i]'] },
  { key: "linkedIn", selectors: ['input[name*="linkedin" i]'] },
  { key: "resumeFile", selectors: ['input[type="file"]'], type: "file" },
];
