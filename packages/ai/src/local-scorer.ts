import type { Profile } from "@jobs-buddy/profile";
import type { MatchResult } from "./scorer.js";

function normalizeSkill(skill: string): string {
  return skill
    .toLowerCase()
    .replace(/reactjs/g, "react")
    .replace(/nextjs/g, "next")
    .replace(/nodejs/g, "node")
    .replace(/expressjs/g, "express")
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function skillMatchesDescription(skill: string, desc: string): boolean {
  const s = normalizeSkill(skill);
  if (!s) return false;
  if (desc.includes(s)) return true;
  const tokens = s.split(/[\s/]+/).filter((t) => t.length > 2);
  return tokens.some((t) => desc.includes(t));
}

export function scoreJobLocal(jobDescription: string, profile: Profile): MatchResult {
  const desc = jobDescription.toLowerCase();
  const allSkills = [
    ...profile.skills,
    ...profile.preferences.targetTech,
    ...profile.experience.flatMap((e) => e.techStack),
  ];
  const uniqueSkills = [...new Set(allSkills.map((s) => normalizeSkill(s)).filter(Boolean))];

  const matchedSkills = uniqueSkills.filter((skill) => skillMatchesDescription(skill, desc));

  const roleMatches = profile.preferences.targetRoles.filter((role) => {
    const r = role.toLowerCase().replace(/\./g, "").replace(/\s+/g, " ");
    const d = desc.replace(/\./g, "");
    if (d.includes(r)) return true;
    const key = r.replace(/senior |lead |principal |staff /g, "").trim();
    return key.length > 4 && d.includes(key);
  });

  const roleKeywords = profile.preferences.targetRoles.flatMap((r) =>
    r.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
  );
  const roleHits = roleKeywords.filter((k) => desc.includes(k)).length;

  const remoteOk =
    profile.preferences.targetLocations.some((l) => /remote/i.test(l)) &&
    (/remote|work from home|wfh|anywhere/i.test(desc) || desc.includes("remote"));

  let score = Math.round(
    (matchedSkills.length / Math.max(uniqueSkills.length, 1)) * 50 +
      roleHits * 3 +
      roleMatches.length * 20 +
      (remoteOk ? 10 : 0)
  );
  score = Math.min(100, Math.max(0, score));

  const missingSkills = uniqueSkills
    .filter((s) => !matchedSkills.includes(s))
    .slice(0, 6)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1));

  const minScore = profile.preferences.minMatchScore;
  let recommendation: MatchResult["recommendation"] = "Skip";
  if (score >= 90) recommendation = "Apply";
  else if (score >= minScore) recommendation = "Review";
  else if (score >= minScore - 10) recommendation = "Review";

  const salary = profile.preferences.expectedSalary;
  const salaryEstimate = `${salary.currency} ${Math.round(salary.min / 1000)}k–${Math.round(salary.max / 1000)}k`;

  return {
    score,
    salaryEstimate,
    companyRating: 3,
    recommendation: score < minScore ? "Skip" : recommendation,
    matchedSkills: matchedSkills.map((s) => s.charAt(0).toUpperCase() + s.slice(1)),
    missingSkills,
    reasoning: `Local match: ${matchedSkills.length} skills, ${roleMatches.length} role(s) matched${remoteOk ? ", remote-friendly" : ""}.`,
  };
}
