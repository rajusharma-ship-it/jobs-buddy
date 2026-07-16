export function buildQuestionPrompt(
  firstName: string,
  title: string,
  company: string,
  questionText: string,
  experienceSummary: string
): string {
  return `You are helping ${firstName} fill out a job application for ${title} at ${company}.

Question: "${questionText}"

Answer in first person using the candidate's actual experience below.
Be specific, concise (2-4 sentences max), and authentic.
Do not start with "I am" or "As a".

Candidate experience:
${experienceSummary}`;
}
