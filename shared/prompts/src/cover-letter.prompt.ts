export function buildCoverLetterPrompt(
  firstName: string,
  company: string,
  title: string,
  profileSummary: string,
  jobDescription: string
): string {
  return `Write a concise, genuine cover letter for ${firstName} applying to ${company} for the role of ${title}.
Tone: confident, direct, human — not generic.
Opening: one specific reason why this company/product is interesting.
Body: two specific achievements from the candidate's experience that directly match the job.
Close: clear call to action.
Max 280 words. Return plain text.

Candidate experience:
${profileSummary}

Job description:
${jobDescription}`;
}
