import type { Browser, BrowserContext, Page } from "playwright";
import { v4 as uuid } from "uuid";
import type { Profile } from "@jobs-buddy/profile";
import type { Db } from "@jobs-buddy/db";
import type { JobListing } from "@jobs-buddy/utils";
import { scoreJob, answerApplicationQuestion } from "@jobs-buddy/ai";
import { launchBrowser, launchIndeedProfile } from "@jobs-buddy/browser";
import { crawlAll } from "@jobs-buddy/crawler";
import {
  createApplication,
  incrementDailyStat,
  setDailyStat,
  saveDocument,
  saveProfile,
  updateApplicationStatus,
} from "@jobs-buddy/db";
import { generateCoverLetterPdf } from "@jobs-buddy/cover-letter";
import { generateResumePdf } from "@jobs-buddy/resume";
import { notifySingleReview, loadNotificationConfig, sendDailyEmailSummary } from "@jobs-buddy/notifications";
import { detectAtsPlatform, getOutputDir, isRemoteJob, matchesTargetRole } from "@jobs-buddy/utils";
import { fetchJobDetail as fetchLinkedInDetail } from "@jobs-buddy/playwright-linkedin";
import {
  fetchJobDetail as fetchIndeedDetail,
  fetchJobDetailFromSerp,
  applyIndeed,
  submitApplication as submitIndeed,
  ensureIndeedLoggedIn,
  fetchIndeedProfile,
  mergeIndeedIntoProfile,
  INDEED_BASE,
} from "@jobs-buddy/playwright-indeed";
import { applyGreenhouse, submitGreenhouse } from "@jobs-buddy/playwright-greenhouse";
import { applyLever, submitLever } from "@jobs-buddy/playwright-lever";
import { applyAshby, submitAshby } from "@jobs-buddy/playwright-ashby";
import { applyWorkable, submitWorkable } from "@jobs-buddy/playwright-workable";
import { applySmartRecruiters, submitSmartRecruiters } from "@jobs-buddy/playwright-smartrecruiters";
import { env } from "./config.js";
import { waitForDecision, setLastPipelineRun } from "./api.js";
import { acquireIndeedLock } from "./indeed-lock.js";

async function fetchJobDescription(
  listing: JobListing,
  indeedContext: BrowserContext,
  linkedInPage: Page,
  indeedSearchUrl?: string
): Promise<{ description: string; applyUrl?: string; applyType?: string }> {
  try {
    if (listing.platform === "linkedin") {
      const detail = await fetchLinkedInDetail(linkedInPage, listing.url, env.screenshotDir);
      return { description: detail.description, applyUrl: detail.applyUrl, applyType: detail.applyType };
    }
    if (listing.platform === "indeed") {
      const page = await indeedContext.newPage();
      let detail;
      try {
        detail = await fetchIndeedDetail(page, listing.url, env.screenshotDir);
      } finally {
        await page.close();
      }

      if (!detail.description.trim() && listing.jobKey && indeedSearchUrl) {
        detail = await fetchJobDetailFromSerp(
          indeedContext,
          listing.jobKey,
          indeedSearchUrl,
          env.screenshotDir
        );
      }

      const description =
        detail.description.trim() ||
        listing.description?.trim() ||
        `${listing.title}\n${listing.location ?? "Remote"}\nWork from home / remote position`;

      return { description, applyUrl: detail.applyUrl, applyType: detail.applyType };
    }
    const page = await indeedContext.newPage();
    try {
      await page.goto(listing.url, { waitUntil: "domcontentloaded", timeout: 30000 });
      return { description: (await page.locator("body").textContent()) ?? "" };
    } finally {
      await page.close();
    }
  } catch (err) {
    console.error(`Failed to fetch job description for ${listing.url}:`, err);
    return { description: listing.description ?? "" };
  }
}

async function applyToJob(
  page: Page,
  applyUrl: string,
  profile: Profile,
  resumeBuffer: Buffer,
  coverLetterBuffer: Buffer
) {
  const platform = detectAtsPlatform(applyUrl);
  switch (platform) {
    case "greenhouse":
      return applyGreenhouse(page, applyUrl, profile, resumeBuffer, coverLetterBuffer, env.screenshotDir);
    case "lever":
      return applyLever(page, applyUrl, profile, resumeBuffer, coverLetterBuffer, env.screenshotDir);
    case "ashby":
      return applyAshby(page, applyUrl, profile, resumeBuffer, coverLetterBuffer, env.screenshotDir);
    case "workable":
      return applyWorkable(page, applyUrl, profile, resumeBuffer, coverLetterBuffer, env.screenshotDir);
    case "smartrecruiters":
      return applySmartRecruiters(page, applyUrl, profile, resumeBuffer, coverLetterBuffer, env.screenshotDir);
    default:
      return applyGreenhouse(page, applyUrl, profile, resumeBuffer, coverLetterBuffer, env.screenshotDir);
  }
}

async function submitJob(page: Page, applyUrl: string) {
  const platform = detectAtsPlatform(applyUrl);
  switch (platform) {
    case "greenhouse": return submitGreenhouse(page, env.screenshotDir);
    case "lever": return submitLever(page, env.screenshotDir);
    case "ashby": return submitAshby(page, env.screenshotDir);
    case "workable": return submitWorkable(page, env.screenshotDir);
    case "smartrecruiters": return submitSmartRecruiters(page, env.screenshotDir);
    default: return submitGreenhouse(page, env.screenshotDir);
  }
}

export async function runPipeline(db: Db, profile?: Profile) {
  const { getProfile } = await import("@jobs-buddy/db");
  const userProfile = profile ?? (await getProfile(db));
  if (!userProfile) throw new Error("No profile configured. Run pnpm setup first.");

  const today = new Date().toISOString().split("T")[0] ?? "";
  const searchQuery = userProfile.preferences.targetRoles[0]
    ? `${userProfile.preferences.targetRoles[0]} ${userProfile.preferences.targetTech.slice(0, 2).join(" ")}`
    : userProfile.preferences.targetTech.slice(0, 3).join(" ") || "React Developer";

  console.log(`Starting pipeline — search: "${searchQuery}"`);

  let browser: Browser | null = null;
  let indeedContext: BrowserContext | null = null;
  const stats = { processed: 0, submitted: 0, skipped: 0, waiting: 0 };
  const releaseIndeed = await acquireIndeedLock("pipeline");

  try {
    // Persistent Chrome profile — stays logged in to Indeed across runs
    indeedContext = await launchIndeedProfile(env.sessionDir, false);

    const loggedIn = await ensureIndeedLoggedIn(indeedContext, env.screenshotDir, env.sessionDir);
    if (!loggedIn) {
      setLastPipelineRun({
        status: "failed",
        error: "Indeed login required. Click 'Connect Indeed' in the dashboard and log in first.",
      });
      console.error("Indeed not logged in — connect Indeed from dashboard first.");
      return stats;
    }

    let activeProfile = userProfile;
    try {
      const indeedData = await fetchIndeedProfile(indeedContext, env.outputDir);
      activeProfile = mergeIndeedIntoProfile(userProfile, indeedData);
      await saveProfile(db, activeProfile);
      console.log(
        `Indeed profile synced: ${indeedData.skills.length} skills, headline: ${indeedData.headline ?? "—"}`
      );
    } catch (err) {
      console.warn("Indeed profile sync skipped:", (err as Error).message);
    }

    browser = await launchBrowser({ headless: env.headless, sessionDir: env.sessionDir });

    const remoteSearch = userProfile.preferences.targetLocations.some((l) => /remote/i.test(l));

    const searchLocation = remoteSearch ? "Remote" : userProfile.personal.location;

    const crawlerConfig = {
      headless: env.headless,
      sessionDir: env.sessionDir,
      screenshotDir: env.screenshotDir,
    };

    const searchQueries = [
      "React Developer",
      "Full Stack Developer",
      "Node.js Developer",
      "Backend Developer",
      "Software Engineer",
      "Next.js Developer",
    ];

    const listings: JobListing[] = [];
    const crawlErrors: string[] = [];
    const seenUrls = new Set<string>();
    let lastIndeedSearchUrl = `${INDEED_BASE}/jobs?l=${encodeURIComponent(searchLocation)}&remotejob=1`;

    for (const query of searchQueries) {
      lastIndeedSearchUrl = `${INDEED_BASE}/jobs?q=${encodeURIComponent(query)}&l=${encodeURIComponent(searchLocation)}&remotejob=1`;
      console.log(`Crawling: "${query}" in ${searchLocation}`);
      const result = await crawlAll(
        browser,
        indeedContext,
        {
          query,
          location: searchLocation,
          remote: userProfile.preferences.targetLocations.some((l) => /remote/i.test(l)),
          maxPages: 1,
        },
        crawlerConfig
      );
      crawlErrors.push(...result.errors);
      for (const job of result.jobs) {
        if (!seenUrls.has(job.url)) {
          seenUrls.add(job.url);
          listings.push(job);
        }
      }
    }

    if (crawlErrors.length > 0) {
      console.error("Crawl errors:\n", crawlErrors.join("\n"));
      setLastPipelineRun({ status: "crawl_errors", errors: crawlErrors, found: listings.length });
    }

    const matchedListings = listings.filter((listing) => {
      const roleOk = matchesTargetRole(listing.title, activeProfile.preferences.targetRoles);
      const remoteOk = isRemoteJob(listing, listing.description ?? "", { fromRemoteSearch: remoteSearch });
      return roleOk && remoteOk;
    });

    console.log(
      `Filtered to ${matchedListings.length} remote role matches (from ${listings.length} crawled)`
    );

    if (matchedListings.length === 0) {
      setLastPipelineRun({
        status: "no_jobs",
        errors: ["No remote jobs matched your target titles. Try Sync Indeed Profile and run again."],
        found: listings.length,
      });
      console.error("No matching remote jobs after title/remote filter.");
      return stats;
    }

    await setDailyStat(db, today, "totalFound", matchedListings.length);

    const linkedInPage = await browser.newPage();
    const outputDir = getOutputDir(env.outputDir, "documents");
    const notifConfig = loadNotificationConfig();

    for (const listing of matchedListings) {
      stats.processed++;
      const applicationId = uuid();
      await createApplication(db, {
        id: applicationId,
        company: listing.company,
        title: listing.title,
        jobUrl: listing.url,
        platform: listing.platform,
        status: "crawled",
        createdAt: new Date().toISOString(),
      });

      try {
        const { description, applyUrl: detailApplyUrl, applyType } = await fetchJobDescription(
          listing,
          indeedContext,
          linkedInPage,
          lastIndeedSearchUrl
        );

        const titleMatch = matchesTargetRole(listing.title, activeProfile.preferences.targetRoles);
        const remoteOk = isRemoteJob(listing, description, { fromRemoteSearch: remoteSearch });

        if (!titleMatch || !remoteOk) {
          await updateApplicationStatus(db, applicationId, "skipped", {
            notes: !titleMatch ? "Title not in target roles" : "Not remote/WFH",
          });
          stats.skipped++;
          continue;
        }

        let match;
        try {
          match = await scoreJob(`${listing.title}\n\n${description}`, activeProfile);
        } catch (err) {
          console.error(`Scoring failed for ${listing.title}:`, err);
          await updateApplicationStatus(db, applicationId, "score_failed", {
            notes: String(err),
          });
          continue;
        }

        const minScore = activeProfile.preferences.minMatchScore ?? env.minMatchScore;

        if (match.score < minScore) {
          match = {
            ...match,
            score: Math.max(match.score, minScore),
            recommendation: "Review" as const,
            reasoning: `${match.reasoning} Title matches target role + remote/WFH — proceeding.`,
          };
        }

        await incrementDailyStat(db, today, "highMatch");

        const applyUrl = detailApplyUrl ?? listing.applyUrl ?? listing.url;
        const isIndeedEasyApply =
          listing.platform === "indeed" &&
          (applyType === "easy_apply" || applyUrl.includes("in.indeed.com") || !detectAtsPlatform(applyUrl));

        if (env.dryRun) {
          await updateApplicationStatus(db, applicationId, "scored", {
            score: match.score,
            salaryEstimate: match.salaryEstimate,
            matchData: JSON.stringify(match),
            notes: "DRY_RUN=true — set DRY_RUN=false in .env to fill forms and submit",
          });
          console.log(`[DRY RUN] Scored ${listing.title} at ${listing.company}: ${match.score}%`);
          continue;
        }

        const resume = await generateResumePdf(description, activeProfile, outputDir);
        const coverLetter = await generateCoverLetterPdf(
          description,
          activeProfile,
          listing.company,
          listing.title,
          outputDir
        );

        await saveDocument(db, {
          id: uuid(),
          jobId: applicationId,
          resumePath: resume.path,
          coverLetterPath: coverLetter.path,
          createdAt: new Date().toISOString(),
        });

        const workPage =
          listing.platform === "indeed"
            ? await indeedContext.newPage()
            : await browser.newPage();

        let autofillResult;
        if (isIndeedEasyApply) {
          await workPage.goto(applyUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
          autofillResult = await applyIndeed(
            workPage,
            activeProfile,
            resume.buffer,
            coverLetter.buffer,
            env.screenshotDir
          );
        } else {
          autofillResult = await applyToJob(
            workPage,
            applyUrl,
            activeProfile,
            resume.buffer,
            coverLetter.buffer
          );
        }

        const answeredQuestions: { question: string; answer: string }[] = [];
        for (const q of autofillResult.unansweredQuestions) {
          const answer = await answerApplicationQuestion(q.label, activeProfile, listing.company, listing.title);
          answeredQuestions.push({ question: q.label, answer });
          await workPage.locator(q.selector).fill(answer).catch(() => {});
        }

        const screenshot = "screenshot" in autofillResult ? (autofillResult as { screenshot?: string }).screenshot : undefined;

        await updateApplicationStatus(db, applicationId, "awaiting_review", {
          platform: detectAtsPlatform(applyUrl) ?? listing.platform,
          score: match.score,
          salaryEstimate: match.salaryEstimate,
          matchData: JSON.stringify(match),
          screenshotPath: screenshot,
          questions: JSON.stringify(answeredQuestions),
          missingFields: JSON.stringify(autofillResult.missing),
        });

        await incrementDailyStat(db, today, "formsReady");
        await incrementDailyStat(db, today, "waiting");
        stats.waiting++;

        await notifySingleReview(notifConfig, {
          id: applicationId,
          company: listing.company,
          title: listing.title,
          score: match.score,
          salaryEstimate: match.salaryEstimate,
          dashboardUrl: `${env.dashboardUrl}/review/${applicationId}`,
        });

        console.log(`Awaiting review: ${listing.title} at ${listing.company}`);
        const decision = await waitForDecision(applicationId);

        if (decision === "yes") {
          if (isIndeedEasyApply) {
            await submitIndeed(workPage, env.screenshotDir);
          } else {
            await submitJob(workPage, applyUrl);
          }
          await updateApplicationStatus(db, applicationId, "submitted", {
            submittedAt: new Date().toISOString(),
          });
          await incrementDailyStat(db, today, "submitted");
          stats.submitted++;
          console.log(`Submitted: ${listing.title}`);
        } else if (decision === "skip") {
          await updateApplicationStatus(db, applicationId, "skipped");
          stats.skipped++;
          await incrementDailyStat(db, today, "skipped");
        } else {
          await updateApplicationStatus(db, applicationId, "editing");
          console.log(`Editing: ${listing.title} — waiting for re-approval`);
          const reDecision = await waitForDecision(applicationId);
          if (reDecision === "yes") {
            if (isIndeedEasyApply) {
              await submitIndeed(workPage, env.screenshotDir);
            } else {
              await submitJob(workPage, applyUrl);
            }
            await updateApplicationStatus(db, applicationId, "submitted", {
              submittedAt: new Date().toISOString(),
            });
            stats.submitted++;
          }
        }
        await workPage.close().catch(() => {});
      } catch (err) {
        console.error(`Error processing ${listing.title}:`, err);
      }
    }

    await linkedInPage.close();
  } finally {
    if (browser) await browser.close();
    if (indeedContext) await indeedContext.close().catch(() => {});
    releaseIndeed();
  }

  await sendDailyEmailSummary(loadNotificationConfig(), {
    totalProcessed: stats.processed,
    submitted: stats.submitted,
    skipped: stats.skipped,
    waiting: stats.waiting,
  });

  console.log("Pipeline complete:", stats);
  setLastPipelineRun({ status: "complete", found: stats.processed, ...stats });
  return stats;
}
