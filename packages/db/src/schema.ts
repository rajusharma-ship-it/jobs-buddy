import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const profile = sqliteTable("profile", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  data: text("data").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const documents = sqliteTable("documents", {
  id: text("id").primaryKey(),
  jobId: text("job_id").notNull(),
  resumePath: text("resume_path"),
  coverLetterPath: text("cover_letter_path"),
  createdAt: text("created_at").notNull(),
});

export const applications = sqliteTable("applications", {
  id: text("id").primaryKey(),
  company: text("company").notNull(),
  title: text("title").notNull(),
  jobUrl: text("job_url").notNull(),
  platform: text("platform"),
  score: integer("score"),
  salaryEstimate: text("salary_estimate"),
  status: text("status").notNull().default("pending"),
  matchData: text("match_data"),
  screenshotPath: text("screenshot_path"),
  questions: text("questions"),
  missingFields: text("missing_fields"),
  submittedAt: text("submitted_at"),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
});

export const resumeTemplates = sqliteTable("resume_templates", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  htmlTemplate: text("html_template").notNull(),
  isDefault: integer("is_default", { mode: "boolean" }).default(false),
});

export const dailyStats = sqliteTable("daily_stats", {
  id: text("id").primaryKey(),
  date: text("date").notNull(),
  totalFound: integer("total_found").default(0),
  highMatch: integer("high_match").default(0),
  formsReady: integer("forms_ready").default(0),
  submitted: integer("submitted").default(0),
  waiting: integer("waiting").default(0),
  skipped: integer("skipped").default(0),
});
