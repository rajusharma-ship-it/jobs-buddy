import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runMigrations, getProfile, saveProfile, clearAllJobData } from "./index.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

const TARGET_ROLES = [
  "Frontend Developer",
  "Front End Developer",
  "Frontend Engineer",
  "Front End Engineer",
  "Senior Frontend Developer",
  "Senior Front End Developer",
  "Senior Frontend Engineer",
  "Senior Front End Engineer",
  "Lead Frontend Developer",
  "Lead Front End Developer",
  "React Developer",
  "React.js Developer",
  "Senior React Developer",
  "Senior React.js Developer",
  "React Frontend Developer",
  "React Frontend Engineer",
  "Next.js Developer",
  "Next JS Developer",
  "Senior Next.js Developer",
  "Senior Next JS Developer",
  "React Engineer",
  "Frontend React Developer",
  "JavaScript Developer",
  "TypeScript Developer",
  "UI Developer",
  "Web Developer",
  "Senior Web Developer",
  "Full Stack Developer",
  "Full Stack Engineer",
  "Senior Full Stack Developer",
  "Senior Full Stack Engineer",
  "Lead Full Stack Developer",
  "Principal Full Stack Engineer",
  "Software Engineer",
  "Senior Software Engineer",
  "Staff Software Engineer",
  "Principal Software Engineer",
  "Application Developer",
  "Software Developer",
  "Senior Software Developer",
  "Backend Developer",
  "Back End Developer",
  "Backend Engineer",
  "Back End Engineer",
  "Senior Backend Developer",
  "Senior Back End Developer",
  "Senior Backend Engineer",
  "Senior Back End Engineer",
  "Lead Backend Developer",
  "Node.js Developer",
  "Node JS Developer",
  "Senior Node.js Developer",
  "Senior Node JS Developer",
  "Node.js Engineer",
  "Node JS Engineer",
  "Senior Node.js Engineer",
  "Senior Node JS Engineer",
  "Express.js Developer",
  "NestJS Developer",
  "Nest.js Developer",
  "Senior NestJS Developer",
  "Senior Nest.js Developer",
  "API Developer",
  "API Engineer",
  "Server-side Developer",
  "Platform Engineer",
  "Microservices Developer",
  "Microservices Engineer",
  "JavaScript Full Stack Developer",
  "TypeScript Full Stack Developer",
  "React + Node.js Developer",
  "Next.js + Node.js Developer",
  "MERN Stack Developer",
  "MEAN Stack Developer",
  "JavaScript Engineer",
  "TypeScript Engineer",
  "Cloud Software Engineer",
];

async function main() {
  const dbFile = resolve(root, "data", "jobs-buddy.db");
  const db = await runMigrations(`file:${dbFile}`);

  await clearAllJobData(db);
  console.log("Cleared all jobs, documents, and daily stats.");

  const existing = await getProfile(db);
  if (!existing) {
    console.error("No profile found — run pnpm setup first.");
    process.exit(1);
  }

  await saveProfile(db, {
    ...existing,
    preferences: {
      ...existing.preferences,
      targetRoles: TARGET_ROLES,
      minMatchScore: 5,
    },
  });

  console.log(`Profile updated: ${TARGET_ROLES.length} target roles, minMatchScore=5`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
