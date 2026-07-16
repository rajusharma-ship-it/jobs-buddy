"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/utils";
import type { Application } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ReviewCard({ job }: { job: Application }) {
  const router = useRouter();
  const match = job.matchData ? JSON.parse(job.matchData) : null;
  const questions = job.questions ? JSON.parse(job.questions) : [];
  const missing = job.missingFields ? JSON.parse(job.missingFields) : [];

  const decision = useMutation({
    mutationFn: (d: "yes" | "skip" | "edit") =>
      fetchApi(`/api/jobs/${job.id}/decision`, {
        method: "POST",
        body: JSON.stringify({ decision: d }),
      }),
    onSuccess: () => router.push("/"),
  });

  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-border bg-card shadow-lg">
      <div className="border-b border-border p-6">
        <h1 className="text-xl font-bold">Ready to Apply</h1>
      </div>

      <div className="space-y-4 p-6">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Company" value={job.company} />
          <Field label="Position" value={job.title} />
          <Field label="Match Score" value={`${job.score}%`} highlight />
          <Field label="Salary Est." value={job.salaryEstimate ?? "—"} />
        </div>

        {match?.reasoning && (
          <div className="rounded-lg bg-muted p-3 text-sm">
            <p className="font-medium">AI Reasoning</p>
            <p className="text-muted-foreground">{match.reasoning}</p>
          </div>
        )}

        {match?.matchedSkills && (
          <div>
            <p className="mb-1 text-sm font-medium">Matched Skills</p>
            <div className="flex flex-wrap gap-1">
              {match.matchedSkills.map((s: string) => (
                <span key={s} className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">{s}</span>
              ))}
            </div>
          </div>
        )}

        {missing.length > 0 && (
          <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
            <p className="font-medium">Missing fields: {missing.join(", ")}</p>
          </div>
        )}

        {questions.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium">{questions.length} answered questions</p>
            {questions.map((q: { question: string; answer: string }, i: number) => (
              <div key={i} className="mb-2 rounded-lg bg-muted p-3 text-sm">
                <p className="font-medium">{q.question}</p>
                <p className="text-muted-foreground">{q.answer}</p>
              </div>
            ))}
          </div>
        )}

        {job.screenshotPath && (
          <p className="text-sm text-muted-foreground">Screenshot saved: {job.screenshotPath}</p>
        )}
      </div>

      <div className="flex gap-3 border-t border-border p-6">
        <button
          onClick={() => decision.mutate("yes")}
          disabled={decision.isPending}
          className="flex-1 rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          YES — Submit
        </button>
        <button
          onClick={() => decision.mutate("skip")}
          disabled={decision.isPending}
          className="flex-1 rounded-lg border border-border px-4 py-2.5 font-medium hover:bg-muted disabled:opacity-50"
        >
          SKIP
        </button>
        <button
          onClick={() => decision.mutate("edit")}
          disabled={decision.isPending}
          className="flex-1 rounded-lg border border-border px-4 py-2.5 font-medium hover:bg-muted disabled:opacity-50"
        >
          EDIT
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("font-medium", highlight && "text-primary")}>{value}</p>
    </div>
  );
}
