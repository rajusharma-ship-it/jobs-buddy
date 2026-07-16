import type { FieldSelector } from "@jobs-buddy/browser";

export const GREENHOUSE_SELECTORS: FieldSelector[] = [
  { key: "firstName", selectors: ["#first_name", 'input[name="job_application[first_name]"]'] },
  { key: "lastName", selectors: ["#last_name", 'input[name="job_application[last_name]"]'] },
  { key: "email", selectors: ["#email", 'input[name="job_application[email]"]'] },
  { key: "phone", selectors: ["#phone", 'input[name="job_application[phone]"]'] },
  { key: "linkedIn", selectors: ['input[name*="linkedin" i]', "#job_application_answers_attributes_0_text_value"] },
  { key: "resumeFile", selectors: ['input[type="file"]#resume', 'input[type="file"][name*="resume" i]'], type: "file" },
  { key: "coverLetterFile", selectors: ['input[type="file"][name*="cover" i]'], type: "file" },
];
