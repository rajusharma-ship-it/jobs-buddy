import { config } from "dotenv";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = resolve(__dirname, "../../..");

config({ path: resolve(PROJECT_ROOT, ".env") });

function dataPath(...segments: string[]): string {
  return resolve(PROJECT_ROOT, ...segments);
}

function ensureDir(path: string) {
  mkdirSync(path, { recursive: true });
}

const dbFile = dataPath("data", "jobs-buddy.db");

function resolveDatabaseUrl(): string {
  const raw = process.env.DATABASE_URL;
  if (!raw) return `file:${dbFile}`;
  if (raw.startsWith("file:")) {
    const pathPart = raw.slice(5);
    if (pathPart.startsWith("/") || /^[A-Za-z]:/.test(pathPart)) return raw;
    return `file:${resolve(PROJECT_ROOT, pathPart.replace(/^\.\//, ""))}`;
  }
  return `file:${resolve(PROJECT_ROOT, raw)}`;
}

ensureDir(dirname(dbFile));
ensureDir(dataPath("sessions"));
ensureDir(dataPath("screenshots"));
ensureDir(dataPath("output"));

export const env = {
  projectRoot: PROJECT_ROOT,
  host: process.env.HOST ?? "127.0.0.1",
  databaseUrl: resolveDatabaseUrl(),
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  cronSchedule: process.env.CRON_SCHEDULE ?? "0 9 * * 1-5",
  minMatchScore: parseInt(process.env.MIN_MATCH_SCORE ?? "80", 10),
  headless: process.env.HEADLESS !== "false",
  dryRun: process.env.DRY_RUN === "true",
  workerPort: parseInt(process.env.WORKER_PORT ?? "3001", 10),
  workerUrl: process.env.WORKER_URL ?? "http://127.0.0.1:3001",
  dashboardUrl: process.env.DASHBOARD_URL ?? "http://127.0.0.1:3000",
  sessionDir: dataPath("sessions"),
  screenshotDir: dataPath("screenshots"),
  outputDir: dataPath("output"),
};
