import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}

export async function writeJsonFile(path: string, data: unknown): Promise<void> {
  await ensureDir(dirname(path));
  await writeFile(path, JSON.stringify(data, null, 2), "utf-8");
}

export function detectAtsPlatform(url: string): string | null {
  const patterns: [RegExp, string][] = [
    [/greenhouse\.io/i, "greenhouse"],
    [/lever\.co/i, "lever"],
    [/ashbyhq\.com/i, "ashby"],
    [/workable\.com/i, "workable"],
    [/smartrecruiters\.com/i, "smartrecruiters"],
    [/linkedin\.com/i, "linkedin"],
    [/indeed\.com/i, "indeed"],
  ];
  for (const [pattern, platform] of patterns) {
    if (pattern.test(url)) return platform;
  }
  return null;
}

export function formatSalary(currency: string, min: number, max: number): string {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
  return `${fmt(min)}–${fmt(max)}`;
}

export function getOutputDir(base: string, subdir: string): string {
  return join(base, subdir, new Date().toISOString().split("T")[0] ?? "");
}

export type { JobListing, JobDetail, SearchOptions } from "./job-types.js";
export { isRemoteJob, matchesTargetRole } from "./job-matching.js";
