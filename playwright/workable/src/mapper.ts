import type { FieldSelector } from "@jobs-buddy/browser";

export const WORKABLE_SELECTORS: FieldSelector[] = [
  { key: "firstName", selectors: ['input[name="firstname"]', "#firstname"] },
  { key: "lastName", selectors: ['input[name="lastname"]', "#lastname"] },
  { key: "email", selectors: ['input[name="email"]', "#email"] },
  { key: "phone", selectors: ['input[name="phone"]', "#phone"] },
  { key: "resumeFile", selectors: ['input[type="file"]#cv', 'input[type="file"]'], type: "file" },
  { key: "coverLetterFile", selectors: ['textarea[name="cover_letter"]'] },
];
