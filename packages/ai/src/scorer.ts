import OpenAI from "openai";
import { z } from "zod";
import type { Profile } from "@jobs-buddy/profile";
import { getExperienceSummary } from "@jobs-buddy/profile";
import {
  SCORER_SYSTEM_PROMPT,
  buildScorerUserPrompt,
  RESUME_SYSTEM_PROMPT,
  buildResumeUserPrompt,
  buildCoverLetterPrompt,
  buildQuestionPrompt,
} from "@jobs-buddy/prompts";
import { scoreJobLocal } from "./local-scorer.js";

export const matchResultSchema = z.object({
  score: z.number().min(0).max(100),
  salaryEstimate: z.string(),
  companyRating: z.number().min(1).max(5),
  recommendation: z.enum(["Apply", "Skip", "Review"]),
  matchedSkills: z.array(z.string()),
  missingSkills: z.array(z.string()),
  reasoning: z.string(),
});

export type MatchResult = z.infer<typeof matchResultSchema>;

export const tailoredResumeSchema = z.object({
  summary: z.string(),
  experience: z.array(
    z.object({
      company: z.string(),
      title: z.string(),
      startDate: z.string(),
      endDate: z.string().nullable(),
      bullets: z.array(z.string()),
      techStack: z.array(z.string()),
    })
  ),
  highlightedSkills: z.array(z.string()),
});

export type TailoredResume = z.infer<typeof tailoredResumeSchema>;

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  return new OpenAI({ apiKey });
}

async function callJson<T>(system: string, user: string, schema: z.ZodType<T>): Promise<T> {
  const client = getClient();
  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Empty AI response");
  return schema.parse(JSON.parse(content));
}

async function callText(system: string, user: string): Promise<string> {
  const client = getClient();
  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.5,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Empty AI response");
  return content.trim();
}

export async function scoreJob(jobDescription: string, profile: Profile): Promise<MatchResult> {
  const useLocalOnly = process.env.SCORING_MODE === "local" || process.env.OPENAI_API_KEY === "";

  if (useLocalOnly) {
    console.log("Using local skill-based scoring");
    return scoreJobLocal(jobDescription, profile);
  }

  try {
    const result = await callJson(
      SCORER_SYSTEM_PROMPT,
      buildScorerUserPrompt(jobDescription, JSON.stringify(profile, null, 2)),
      matchResultSchema
    );

    if (result.score < profile.preferences.minMatchScore) {
      return { ...result, recommendation: "Skip" };
    }
    return result;
  } catch (err) {
    console.warn("OpenAI scoring failed, using local fallback:", (err as Error).message?.slice(0, 80));
    return scoreJobLocal(jobDescription, profile);
  }
}

function buildLocalTailoredResume(profile: Profile): TailoredResume {
  return {
    summary: `${profile.personal.firstName} ${profile.personal.lastName} — ${profile.experience[0]?.title ?? "Software Engineer"} with expertise in ${profile.skills.slice(0, 6).join(", ")}.`,
    experience: profile.experience.map((e) => ({
      company: e.company,
      title: e.title,
      startDate: e.startDate,
      endDate: e.endDate,
      bullets: e.description
        ? e.description.split("\n").filter(Boolean)
        : [`Delivered results at ${e.company} using ${e.techStack.slice(0, 3).join(", ")}`],
      techStack: e.techStack,
    })),
    highlightedSkills: profile.skills.slice(0, 10),
  };
}

function buildLocalCoverLetter(profile: Profile, company: string, title: string): string {
  const exp = getExperienceSummary(profile);
  return `Dear Hiring Manager,

I am writing to express my interest in the ${title} position at ${company}. With experience in ${profile.skills.slice(0, 5).join(", ")}, I believe I would be a strong fit for your team.

${exp}

I am excited about the opportunity to contribute to ${company} and would welcome the chance to discuss how my background aligns with your needs.

Thank you for your consideration.`;
}

export async function generateTailoredResume(
  jobDescription: string,
  profile: Profile
): Promise<TailoredResume> {
  try {
    return await callJson(
      RESUME_SYSTEM_PROMPT,
      buildResumeUserPrompt(jobDescription, JSON.stringify(profile, null, 2)),
      tailoredResumeSchema
    );
  } catch (err) {
    console.warn("AI resume tailoring failed, using profile template:", (err as Error).message?.slice(0, 80));
    return buildLocalTailoredResume(profile);
  }
}

export async function generateCoverLetter(
  jobDescription: string,
  profile: Profile,
  company: string,
  title: string
): Promise<string> {
  try {
    const prompt = buildCoverLetterPrompt(
      profile.personal.firstName,
      company,
      title,
      getExperienceSummary(profile),
      jobDescription
    );
    return await callText(
      "You are a professional cover letter writer. Return only the cover letter text.",
      prompt
    );
  } catch (err) {
    console.warn("AI cover letter failed, using template:", (err as Error).message?.slice(0, 80));
    return buildLocalCoverLetter(profile, company, title);
  }
}

export async function answerApplicationQuestion(
  questionText: string,
  profile: Profile,
  company: string,
  title: string
): Promise<string> {
  try {
    const prompt = buildQuestionPrompt(
      profile.personal.firstName,
      title,
      company,
      questionText,
      getExperienceSummary(profile)
    );
    return await callText(
      "You are helping fill out a job application. Return only the answer text.",
      prompt
    );
  } catch {
    const q = questionText.toLowerCase();
    if (q.includes("salary") || q.includes("compensation")) {
      const s = profile.preferences.expectedSalary;
      return `${s.currency} ${s.min} - ${s.max}`;
    }
    if (q.includes("experience") || q.includes("years")) {
      return `${profile.experience.length}+ years in ${profile.preferences.targetTech.slice(0, 3).join(", ")}`;
    }
    if (q.includes("authorized") || q.includes("visa") || q.includes("work permit")) {
      return "Yes";
    }
    return `Yes, I am interested in the ${title} role at ${company} and my background in ${profile.skills.slice(0, 3).join(", ")} is a strong match.`;
  }
}
