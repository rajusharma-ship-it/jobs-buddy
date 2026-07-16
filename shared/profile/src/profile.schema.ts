import { z } from "zod";

export const experienceSchema = z.object({
  company: z.string(),
  title: z.string(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  description: z.string(),
  techStack: z.array(z.string()),
});

export const educationSchema = z.object({
  institution: z.string(),
  degree: z.string(),
  field: z.string(),
  graduationYear: z.number(),
});

export const salarySchema = z.object({
  currency: z.string(),
  min: z.number(),
  max: z.number(),
});

export const preferencesSchema = z.object({
  targetRoles: z.array(z.string()),
  targetLocations: z.array(z.string()),
  targetTech: z.array(z.string()),
  minMatchScore: z.number().min(0).max(100).default(80),
  expectedSalary: salarySchema,
  noticePeriod: z.string(),
  workAuthorization: z.string(),
});

export const personalSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  phone: z.string(),
  location: z.string(),
  linkedIn: z.string().url().optional().or(z.literal("")),
  gitHub: z.string().url().optional().or(z.literal("")),
  portfolio: z.string().url().optional().or(z.literal("")),
});

export const profileSchema = z.object({
  personal: personalSchema,
  experience: z.array(experienceSchema),
  education: z.array(educationSchema),
  skills: z.array(z.string()),
  preferences: preferencesSchema,
});

export type Experience = z.infer<typeof experienceSchema>;
export type Education = z.infer<typeof educationSchema>;
export type Preferences = z.infer<typeof preferencesSchema>;
export type Personal = z.infer<typeof personalSchema>;
export type Profile = z.infer<typeof profileSchema>;

export function getExperienceSummary(profile: Profile): string {
  return profile.experience
    .map(
      (exp) =>
        `${exp.title} at ${exp.company} (${exp.startDate}–${exp.endDate ?? "Present"}): ${exp.description}. Tech: ${exp.techStack.join(", ")}`
    )
    .join("\n");
}

export function getYearsOfExperience(profile: Profile): number {
  if (profile.experience.length === 0) return 0;
  const earliest = profile.experience.reduce((min, exp) => {
    const year = parseInt(exp.startDate.split("-")[0] ?? "0", 10);
    return year < min ? year : min;
  }, new Date().getFullYear());
  return new Date().getFullYear() - earliest;
}

export function getCurrentRole(profile: Profile): { company: string; title: string } {
  const current = profile.experience.find((e) => !e.endDate) ?? profile.experience[0];
  return {
    company: current?.company ?? "",
    title: current?.title ?? "",
  };
}
