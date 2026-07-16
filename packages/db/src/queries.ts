import { eq } from "drizzle-orm";
import { profileSchema, type Profile } from "@jobs-buddy/profile";
import type { Db } from "./client.js";
import { applications, dailyStats, documents, profile } from "./schema.js";

export async function getProfile(db: Db): Promise<Profile | null> {
  const rows = await db.select().from(profile).limit(1);
  const row = rows[0];
  if (!row) return null;
  return profileSchema.parse(JSON.parse(row.data));
}

export async function saveProfile(db: Db, data: Profile): Promise<void> {
  const existing = await db.select().from(profile).limit(1);
  const payload = {
    data: JSON.stringify(data),
    updatedAt: new Date().toISOString(),
  };
  if (existing[0]) {
    await db.update(profile).set(payload).where(eq(profile.id, existing[0].id));
  } else {
    await db.insert(profile).values(payload);
  }
}

export async function createApplication(
  db: Db,
  data: typeof applications.$inferInsert
) {
  await db.insert(applications).values(data);
  return data;
}

export async function updateApplicationStatus(
  db: Db,
  id: string,
  status: string,
  extra?: Partial<typeof applications.$inferInsert>
) {
  await db
    .update(applications)
    .set({ status, ...extra })
    .where(eq(applications.id, id));
}

export async function getApplication(db: Db, id: string) {
  const rows = await db.select().from(applications).where(eq(applications.id, id));
  return rows[0] ?? null;
}

export async function getTodayApplications(db: Db) {
  const today = new Date().toISOString().split("T")[0] ?? "";
  const rows = await db.select().from(applications);
  return rows.filter((r) => r.createdAt.startsWith(today));
}

export async function getAllApplications(db: Db) {
  return db.select().from(applications);
}

export async function clearAllJobData(db: Db): Promise<void> {
  await db.delete(documents);
  await db.delete(applications);
  await db.delete(dailyStats);
}

export async function saveDocument(db: Db, data: typeof documents.$inferInsert) {
  await db.insert(documents).values(data);
}

export async function getOrCreateDailyStats(db: Db, date: string) {
  const id = `stats-${date}`;
  const existing = await db.select().from(dailyStats).where(eq(dailyStats.id, id));
  if (existing[0]) return existing[0];

  const row = {
    id,
    date,
    totalFound: 0,
    highMatch: 0,
    formsReady: 0,
    submitted: 0,
    waiting: 0,
    skipped: 0,
  };
  await db.insert(dailyStats).values(row);
  return row;
}

export async function incrementDailyStat(
  db: Db,
  date: string,
  field: keyof typeof dailyStats.$inferSelect
) {
  const stats = await getOrCreateDailyStats(db, date);
  const value = (stats[field] as number) + 1;
  await db
    .update(dailyStats)
    .set({ [field]: value })
    .where(eq(dailyStats.id, stats.id));
}

export async function setDailyStat(
  db: Db,
  date: string,
  field: keyof typeof dailyStats.$inferSelect,
  value: number
) {
  const stats = await getOrCreateDailyStats(db, date);
  await db
    .update(dailyStats)
    .set({ [field]: value })
    .where(eq(dailyStats.id, stats.id));
}

export { applications, documents, dailyStats, profile };
