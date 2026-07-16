export { createDb, schema } from "./client.js";
export type { Db } from "./client.js";
export { runMigrations } from "./migrate.js";
export {
  getProfile,
  saveProfile,
  createApplication,
  updateApplicationStatus,
  getApplication,
  getTodayApplications,
  getAllApplications,
  clearAllJobData,
  saveDocument,
  getOrCreateDailyStats,
  incrementDailyStat,
  setDailyStat,
  applications,
  documents,
  dailyStats,
  profile,
} from "./queries.js";
