import type { JobStats } from "@/lib/types";

export function StatsBar({ stats }: { stats: JobStats }) {
  const items = [
    { label: "Today's Jobs", value: stats.totalFound },
    { label: "High Match", value: stats.highMatch },
    { label: "Forms Ready", value: stats.formsReady },
    { label: "Submitted", value: stats.submitted },
    { label: "Waiting", value: stats.waiting },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">{item.label}</p>
          <p className="text-2xl font-bold">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
