import type { JobListing } from "./job-types.js";

const REMOTE_PATTERN = /remote|work from home|wfh|work-from-home|100%\s*remote/i;
const ONSITE_LOCATION_PATTERN =
  /,\s*(india|kerala|karnataka|maharashtra|delhi|mumbai|bangalore|bengaluru|hyderabad|pune|chennai|kochi|gurgaon|noida)/i;

export function isRemoteJob(
  listing: JobListing,
  description = "",
  opts?: { fromRemoteSearch?: boolean }
): boolean {
  const text = `${listing.title} ${listing.company} ${listing.location ?? ""} ${listing.description ?? ""} ${description}`;
  if (REMOTE_PATTERN.test(text)) return true;

  const loc = (listing.location ?? "").trim().toLowerCase();
  if (loc === "remote") return true;

  if (loc && ONSITE_LOCATION_PATTERN.test(loc) && !REMOTE_PATTERN.test(loc)) {
    return false;
  }

  if (opts?.fromRemoteSearch) return true;
  return REMOTE_PATTERN.test(text);
}

export function matchesTargetRole(title: string, targetRoles: string[]): boolean {
  const normalizedTitle = normalize(title);
  if (!normalizedTitle) return false;

  for (const role of targetRoles) {
    const normalizedRole = normalize(role);
    if (!normalizedRole) continue;
    if (normalizedTitle.includes(normalizedRole) || normalizedRole.includes(normalizedTitle)) {
      return true;
    }

    const roleWords = normalizedRole
      .split(" ")
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
    if (roleWords.length >= 2 && roleWords.every((w) => normalizedTitle.includes(w))) {
      return true;
    }
  }

  const titleKeywords = ["react", "frontend", "front end", "fullstack", "full stack", "backend", "node", "next", "typescript", "javascript", "software engineer", "web developer", "mern", "mean"];
  const hasDevKeyword = titleKeywords.some((k) => normalizedTitle.includes(k.replace(/\s/g, "")) || normalizedTitle.includes(k));
  return hasDevKeyword;
}

const STOP_WORDS = new Set([
  "senior",
  "lead",
  "principal",
  "staff",
  "associate",
  "the",
  "and",
  "for",
  "with",
]);

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/reactjs/g, "react")
    .replace(/nextjs/g, "next js")
    .replace(/nodejs/g, "node js")
    .replace(/\./g, " ")
    .replace(/\+/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
