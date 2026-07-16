import type { Profile } from "@jobs-buddy/profile";
import type { TailoredResume } from "@jobs-buddy/ai";

export function renderResumeHtml(profile: Profile, tailored: TailoredResume): string {
  const { personal, education, skills } = profile;
  const experienceHtml = tailored.experience
    .map(
      (exp) => `
      <div class="experience-item">
        <div class="experience-header">
          <h3>${escapeHtml(exp.title)}</h3>
          <span class="dates">${escapeHtml(exp.startDate)} – ${escapeHtml(exp.endDate ?? "Present")}</span>
        </div>
        <div class="company">${escapeHtml(exp.company)}</div>
        <ul>
          ${exp.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}
        </ul>
        <div class="tech">${exp.techStack.map(escapeHtml).join(" · ")}</div>
      </div>`
    )
    .join("");

  const educationHtml = education
    .map(
      (edu) =>
        `<div class="education-item"><strong>${escapeHtml(edu.degree)}</strong> in ${escapeHtml(edu.field)}, ${escapeHtml(edu.institution)} (${edu.graduationYear})</div>`
    )
    .join("");

  const skillsHtml = (tailored.highlightedSkills.length ? tailored.highlightedSkills : skills)
    .map(escapeHtml)
    .join(" · ");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; line-height: 1.5; color: #1a1a1a; padding: 40px 48px; max-width: 800px; margin: 0 auto; }
    h1 { font-size: 22pt; font-weight: 700; margin-bottom: 4px; }
    .contact { color: #555; font-size: 10pt; margin-bottom: 16px; }
    .contact a { color: #2563eb; text-decoration: none; }
    h2 { font-size: 11pt; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin: 20px 0 10px; color: #333; }
    .summary { margin-bottom: 8px; color: #444; }
    .experience-item { margin-bottom: 14px; }
    .experience-header { display: flex; justify-content: space-between; align-items: baseline; }
    .experience-header h3 { font-size: 11pt; font-weight: 600; }
    .dates { font-size: 10pt; color: #666; }
    .company { font-size: 10pt; color: #555; margin-bottom: 4px; }
    ul { padding-left: 18px; }
    li { margin-bottom: 3px; }
    .tech { font-size: 9pt; color: #777; margin-top: 4px; }
    .skills { color: #444; }
    .education-item { margin-bottom: 6px; font-size: 10pt; }
  </style>
</head>
<body>
  <h1>${escapeHtml(personal.firstName)} ${escapeHtml(personal.lastName)}</h1>
  <div class="contact">
    ${escapeHtml(personal.email)} · ${escapeHtml(personal.phone)} · ${escapeHtml(personal.location)}
    ${personal.linkedIn ? ` · <a href="${escapeHtml(personal.linkedIn)}">LinkedIn</a>` : ""}
    ${personal.gitHub ? ` · <a href="${escapeHtml(personal.gitHub)}">GitHub</a>` : ""}
    ${personal.portfolio ? ` · <a href="${escapeHtml(personal.portfolio)}">Portfolio</a>` : ""}
  </div>

  <h2>Summary</h2>
  <p class="summary">${escapeHtml(tailored.summary)}</p>

  <h2>Experience</h2>
  ${experienceHtml}

  <h2>Skills</h2>
  <p class="skills">${skillsHtml}</p>

  <h2>Education</h2>
  ${educationHtml}
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
