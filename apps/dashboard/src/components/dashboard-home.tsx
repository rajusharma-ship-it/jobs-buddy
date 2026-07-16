"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { fetchApi } from "@/lib/utils";
import type { JobsResponse } from "@/lib/types";
import { StatsBar } from "@/components/stats-bar";
import { RunJobsButton } from "@/components/run-jobs-button";

export function useJobs() {
  return useQuery<JobsResponse>({
    queryKey: ["jobs"],
    queryFn: () => fetchApi("/api/jobs"),
    refetchInterval: 5000,
  });
}

export function DashboardHome() {
  const { data, isLoading, error } = useJobs();

  if (isLoading) return <p className="text-muted-foreground">Loading...</p>;
  if (error) return <p className="text-red-600">Worker offline. Start with: pnpm dev:worker</p>;

  const awaiting = data?.jobs.filter((j) => j.status === "awaiting_review") ?? [];

  return (
    <div className="space-y-6">
      <RunJobsButton />
      <StatsBar stats={data?.stats ?? { totalFound: 0, highMatch: 0, formsReady: 0, submitted: 0, waiting: 0, skipped: 0 }} />

      <section>
        <h2 className="mb-3 text-lg font-semibold">Ready to Review</h2>
        {awaiting.length === 0 ? (
          <p className="text-muted-foreground">No applications waiting for review.</p>
        ) : (
          <div className="grid gap-3">
            {awaiting.map((job) => (
              <Link
                key={job.id}
                href={`/review/${job.id}`}
                className="flex items-center justify-between rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-md"
              >
                <div>
                  <p className="font-medium">{job.title}</p>
                  <p className="text-sm text-muted-foreground">{job.company}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-primary">{job.score}%</p>
                  <p className="text-xs text-muted-foreground">{job.salaryEstimate}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
