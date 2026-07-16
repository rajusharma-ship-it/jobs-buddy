export const RESUME_SYSTEM_PROMPT = `You are a professional resume writer. Given the candidate's experience and this job description, rewrite the experience section to highlight the most relevant skills and achievements. Keep bullets concise and impactful. Return JSON.

JSON schema:
{
  "summary": string,
  "experience": [
    {
      "company": string,
      "title": string,
      "startDate": string,
      "endDate": string | null,
      "bullets": string[],
      "techStack": string[]
    }
  ],
  "highlightedSkills": string[]
}`;

export function buildResumeUserPrompt(jobDescription: string, profileJson: string): string {
  return `Job Description:\n${jobDescription}\n\nCandidate Profile:\n${profileJson}`;
}
