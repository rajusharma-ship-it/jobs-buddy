import express, { type Response, type Router } from "express";
import { getApplication, getProfile, getTodayApplications, updateApplicationStatus, getOrCreateDailyStats } from "@jobs-buddy/db";
import type { Db } from "@jobs-buddy/db";

const pendingDecisions = new Map<string, { resolve: (v: string) => void; reject: (e: Error) => void }>();

let lastPipelineRun: Record<string, unknown> = { status: "idle" };

export function setLastPipelineRun(data: Record<string, unknown>) {
  lastPipelineRun = { ...data, at: new Date().toISOString() };
}

export function getLastPipelineRun() {
  return lastPipelineRun;
}

export function waitForDecision(applicationId: string, timeoutMs = 3600000): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingDecisions.delete(applicationId);
      reject(new Error("Review timeout"));
    }, timeoutMs);

    pendingDecisions.set(applicationId, {
      resolve: (v) => { clearTimeout(timer); resolve(v); },
      reject: (e) => { clearTimeout(timer); reject(e); },
    });
  });
}

export function resolveDecision(applicationId: string, decision: string): boolean {
  const pending = pendingDecisions.get(applicationId);
  if (!pending) return false;
  pending.resolve(decision);
  pendingDecisions.delete(applicationId);
  return true;
}

let pipelineRunning = false;

export function isPipelineRunning(): boolean {
  return pipelineRunning;
}

export function createApiRouter(db: Db): Router {
  const router = express.Router();

  router.get("/health", (_req: unknown, res: Response) => {
    res.json({ status: "ok" });
  });

  router.get("/api/sessions", async (_req: unknown, res: Response) => {
    const { getSessionStatus } = await import("./sessions.js");
    res.json(getSessionStatus());
  });

  router.post("/api/sessions/indeed/sync", async (_req: unknown, res: Response) => {
    const { syncIndeedProfileToDb } = await import("./sessions.js");
    const result = await syncIndeedProfileToDb().catch((err) => ({
      ok: false,
      message: String(err),
    }));
    res.json(result);
  });

  router.post("/api/sessions/indeed/login", async (_req: unknown, res: Response) => {
    const { startIndeedLogin } = await import("./sessions.js");
    startIndeedLogin()
      .then((result) => console.log("Indeed login:", result.message))
      .catch((err) => console.error("Indeed login failed:", err));
    res.json({
      ok: true,
      message: "Chrome opened — log in to Indeed. Session will be saved automatically.",
    });
  });

  router.get("/api/status", (_req: unknown, res: Response) => {
    res.json({ pipeline: getLastPipelineRun() });
  });

  router.get("/api/jobs", async (_req: unknown, res: Response) => {
    const today = await getTodayApplications(db);
    const stats = await getOrCreateDailyStats(db, new Date().toISOString().split("T")[0] ?? "");
    res.json({
      jobs: today,
      stats: {
        totalFound: stats.totalFound ?? 0,
        highMatch: stats.highMatch ?? 0,
        formsReady: stats.formsReady ?? 0,
        submitted: stats.submitted ?? 0,
        waiting: stats.waiting ?? 0,
        skipped: stats.skipped ?? 0,
      },
    });
  });

  router.get("/api/jobs/:id", async (req: { params: { id: string } }, res: Response) => {
    const job = await getApplication(db, req.params.id);
    if (!job) return res.status(404).json({ error: "Not found" });
    res.json(job);
  });

  router.get("/api/applications", async (_req: unknown, res: Response) => {
    const { getAllApplications } = await import("@jobs-buddy/db");
    const apps = await getAllApplications(db);
    res.json(apps);
  });

  router.get("/api/profile", async (_req: unknown, res: Response) => {
    const profile = await getProfile(db);
    res.json(profile);
  });

  router.put("/api/profile", async (req: { body: unknown }, res: Response) => {
    const { saveProfile } = await import("@jobs-buddy/db");
    const { profileSchema } = await import("@jobs-buddy/profile");
    const parsed = profileSchema.parse(req.body);
    await saveProfile(db, parsed);
    res.json({ ok: true });
  });

  router.post("/api/jobs/:id/decision", async (req: { params: { id: string }; body: { decision: string } }, res: Response) => {
    const { decision } = req.body;
    if (!["yes", "skip", "edit"].includes(decision)) {
      return res.status(400).json({ error: "Invalid decision" });
    }

    const statusMap: Record<string, string> = {
      yes: "approved",
      skip: "skipped",
      edit: "editing",
    };

    await updateApplicationStatus(db, req.params.id, statusMap[decision] ?? decision);
    const resolved = resolveDecision(req.params.id, decision);
    res.json({ ok: true, resolved });
  });

  router.post("/api/run", async (_req: unknown, res: Response) => {
    const { isIndeedLoginInProgress } = await import("./sessions.js");
    const { getIndeedLockHolder } = await import("./indeed-lock.js");

    if (isIndeedLoginInProgress()) {
      return res.status(409).json({
        ok: false,
        message: "Indeed login in progress — finish signing in at profile.indeed.com first",
      });
    }
    if (pipelineRunning) {
      return res.status(409).json({ ok: false, message: "Pipeline already running — wait for it to finish" });
    }
    const lockHolder = getIndeedLockHolder();
    if (lockHolder && lockHolder !== "pipeline") {
      return res.status(409).json({
        ok: false,
        message: `Indeed Chrome is busy (${lockHolder}) — try again in a moment`,
      });
    }

    pipelineRunning = true;
    setLastPipelineRun({ status: "running" });
    const { runPipeline } = await import("./pipeline.js");
    runPipeline(db)
      .catch((err) => {
        console.error("Pipeline failed:", err);
        setLastPipelineRun({ status: "failed", error: String(err) });
      })
      .finally(() => {
        pipelineRunning = false;
      });
    res.json({ ok: true, message: "Pipeline started — keep the Chrome window open" });
  });

  return router;
}
