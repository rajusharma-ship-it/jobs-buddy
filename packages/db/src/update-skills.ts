import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runMigrations, getProfile, saveProfile } from "./index.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

const FULL_STACK_SKILLS = [
  // Core (your existing stack + common variants)
  "JavaScript",
  "TypeScript",
  "React",
  "React.js",
  "ReactJS",
  "Next.js",
  "Nextjs",
  "Node.js",
  "Nodejs",
  "Express.js",
  "Expressjs",
  // Frontend
  "HTML5",
  "CSS3",
  "Tailwind CSS",
  "Bootstrap",
  "Redux",
  "Zustand",
  "React Query",
  "TanStack Query",
  "Context API",
  "Responsive Design",
  "UI Development",
  "Frontend Development",
  "Single Page Application",
  "SPA",
  "Webpack",
  "Vite",
  "Material UI",
  "Shadcn UI",
  // Backend
  "NestJS",
  "REST API",
  "RESTful API",
  "GraphQL",
  "API Development",
  "API Integration",
  "Microservices",
  "Server-side Development",
  "Backend Development",
  "WebSockets",
  "Socket.io",
  // Databases
  "MongoDB",
  "PostgreSQL",
  "MySQL",
  "SQL",
  "NoSQL",
  "Mongoose",
  "Prisma",
  "Redis",
  "Database Design",
  // Full stack / DevOps
  "MERN Stack",
  "MEAN Stack",
  "Full Stack Development",
  "Software Development",
  "Web Development",
  "Git",
  "GitHub",
  "GitLab",
  "Docker",
  "AWS",
  "CI/CD",
  "Linux",
  "NPM",
  "PNPM",
  "Postman",
  // Auth & security
  "JWT",
  "OAuth",
  "Authentication",
  "Authorization",
  // Testing & process
  "Jest",
  "React Testing Library",
  "Unit Testing",
  "Integration Testing",
  "Agile",
  "Scrum",
  "Jira",
];

const TARGET_TECH = [
  "JavaScript",
  "TypeScript",
  "React",
  "Next.js",
  "Node.js",
  "Express.js",
  "NestJS",
  "MongoDB",
  "PostgreSQL",
  "REST API",
  "GraphQL",
  "Redis",
  "Docker",
  "AWS",
  "Git",
  "Tailwind CSS",
  "Redux",
  "Prisma",
  "MERN Stack",
  "Microservices",
];

async function main() {
  const dbFile = resolve(root, "data", "jobs-buddy.db");
  const db = await runMigrations(`file:${dbFile}`);

  const existing = await getProfile(db);
  if (!existing) {
    console.error("No profile found — run pnpm setup first.");
    process.exit(1);
  }

  const mergedSkills = [...new Set([...existing.skills, ...FULL_STACK_SKILLS])];
  const mergedTargetTech = [...new Set([...existing.preferences.targetTech, ...TARGET_TECH])];

  const experience =
    existing.experience.length > 0
      ? existing.experience.map((exp, i) =>
          i === 0
            ? {
                ...exp,
                techStack: [...new Set([...exp.techStack, ...TARGET_TECH])],
              }
            : exp
        )
      : [
          {
            company: "Software Development",
            title: "Full Stack Developer",
            startDate: "2020-01",
            endDate: null,
            description:
              "Full stack web development with React, Next.js, TypeScript, Node.js, and Express. Building REST APIs, integrating databases (MongoDB, PostgreSQL), authentication, and deploying scalable applications.",
            techStack: TARGET_TECH,
          },
        ];

  await saveProfile(db, {
    ...existing,
    skills: mergedSkills,
    experience,
    preferences: {
      ...existing.preferences,
      targetTech: mergedTargetTech,
    },
  });

  console.log(`Skills updated: ${mergedSkills.length} total skills`);
  console.log(`Target tech: ${mergedTargetTech.length} technologies`);
  console.log(`Experience entries: ${experience.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
