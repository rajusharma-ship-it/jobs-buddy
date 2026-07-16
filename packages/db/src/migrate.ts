import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createDb, getRawClient } from "./client.js";

export async function runMigrations(databaseUrl: string) {
  const path = databaseUrl.replace(/^file:/, "");
  mkdirSync(dirname(path), { recursive: true });

  const client = getRawClient(databaseUrl);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS profile (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      resume_path TEXT,
      cover_letter_path TEXT,
      created_at TEXT NOT NULL
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS applications (
      id TEXT PRIMARY KEY,
      company TEXT NOT NULL,
      title TEXT NOT NULL,
      job_url TEXT NOT NULL,
      platform TEXT,
      score INTEGER,
      salary_estimate TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      match_data TEXT,
      screenshot_path TEXT,
      questions TEXT,
      missing_fields TEXT,
      submitted_at TEXT,
      notes TEXT,
      created_at TEXT NOT NULL
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS resume_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      html_template TEXT NOT NULL,
      is_default INTEGER DEFAULT 0
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS daily_stats (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      total_found INTEGER DEFAULT 0,
      high_match INTEGER DEFAULT 0,
      forms_ready INTEGER DEFAULT 0,
      submitted INTEGER DEFAULT 0,
      waiting INTEGER DEFAULT 0,
      skipped INTEGER DEFAULT 0
    )
  `);

  return createDb(databaseUrl);
}
