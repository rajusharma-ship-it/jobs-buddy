import cron from "node-cron";
import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import { runMigrations } from "@jobs-buddy/db";
import { env } from "./config.js";
import { createApiRouter } from "./api.js";
import { runPipeline } from "./pipeline.js";

async function main() {
  const db = await runMigrations(env.databaseUrl);
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(createApiRouter(db));

  const server = createServer(app);

  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(`\nPort ${env.workerPort} is already in use.`);
      console.error("Close the other worker window or run:  npx kill-port 3001\n");
      process.exit(1);
    }
    throw err;
  });

  server.listen(env.workerPort, env.host, () => {
    console.log(`Worker API running at ${env.workerUrl} (local only)`);
    console.log(`Dashboard:     ${env.dashboardUrl}`);
    console.log(`Data folder:   ${env.projectRoot}\\data`);
    console.log(`DRY_RUN:       ${env.dryRun}  |  Scoring: ${process.env.SCORING_MODE ?? "auto (OpenAI + local fallback)"}`);
  });

  if (cron.validate(env.cronSchedule)) {
    cron.schedule(env.cronSchedule, () => {
      console.log("Cron triggered — starting daily pipeline");
      runPipeline(db).catch(console.error);
    });
    console.log(`Cron scheduled: ${env.cronSchedule}`);
  }
}

main().catch(console.error);
