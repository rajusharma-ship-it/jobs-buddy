"use client";

import { useJobs } from "@/components/dashboard-home";
import { RunJobsButton } from "@/components/run-jobs-button";
import Link from "next/link";

export default function JobsPage() {
  const { data, isLoading } = useJobs();

  if (isLoading) return <p>Loading...</p>;

  return (
    <div className="space-y-4">
      <RunJobsButton />
      <h1 className="text-2xl font-bold">Today&apos;s Jobs</h1>
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-2 text-left">Company</th>
              <th className="px-4 py-2 text-left">Title</th>
              <th className="px-4 py-2 text-left">Score</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {(data?.jobs ?? []).map((job) => (
              <tr key={job.id} className="border-t border-border">
                <td className="px-4 py-2">{job.company}</td>
                <td className="px-4 py-2">{job.title}</td>
                <td className="px-4 py-2">{job.score ?? "—"}%</td>
                <td className="px-4 py-2">
                  <StatusBadge status={job.status} />
                </td>
                <td className="px-4 py-2">
                  {job.status === "awaiting_review" && (
                    <Link href={`/review/${job.id}`} className="text-primary hover:underline">
                      Review
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    awaiting_review: "bg-yellow-100 text-yellow-800",
    submitted: "bg-green-100 text-green-800",
    skipped: "bg-gray-100 text-gray-600",
    scored: "bg-blue-100 text-blue-800",
    crawled: "bg-slate-100 text-slate-700",
    score_failed: "bg-red-100 text-red-700",
    no_description: "bg-orange-100 text-orange-700",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ${colors[status] ?? "bg-muted"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
