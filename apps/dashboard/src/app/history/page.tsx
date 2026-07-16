"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchApi } from "@/lib/utils";
import type { Application } from "@/lib/types";

export default function HistoryPage() {
  const { data, isLoading } = useQuery<Application[]>({
    queryKey: ["history"],
    queryFn: () => fetchApi("/api/applications"),
  });

  if (isLoading) return <p>Loading...</p>;

  const submitted = (data ?? []).filter((a) => a.status === "submitted");
  const skipped = (data ?? []).filter((a) => a.status === "skipped");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Application History</h1>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Submitted ({submitted.length})</h2>
        <HistoryList items={submitted} />
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Skipped ({skipped.length})</h2>
        <HistoryList items={skipped} />
      </section>
    </div>
  );
}

function HistoryList({ items }: { items: Application[] }) {
  if (items.length === 0) return <p className="text-muted-foreground">None yet.</p>;
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="flex justify-between rounded-lg border border-border p-3 text-sm">
          <div>
            <p className="font-medium">{item.title} at {item.company}</p>
            <p className="text-muted-foreground">{item.submittedAt ?? item.createdAt}</p>
          </div>
          <span className="text-muted-foreground">{item.score}%</span>
        </div>
      ))}
    </div>
  );
}
