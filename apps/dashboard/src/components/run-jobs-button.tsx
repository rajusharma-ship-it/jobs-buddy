"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchApi } from "@/lib/utils";

interface PipelineStatus {
  pipeline: {
    status: string;
    at?: string;
    found?: number;
    errors?: string[];
    error?: string;
    message?: string;
  };
}

interface SessionStatus {
  indeed: {
    profileExists: boolean;
    loginInProgress: boolean;
    lastSync?: { at: string; skills: number; headline?: string } | null;
  };
  linkedin: { profileExists: boolean };
}

export function RunJobsButton() {
  const queryClient = useQueryClient();

  const { data: status } = useQuery<PipelineStatus>({
    queryKey: ["pipeline-status"],
    queryFn: () => fetchApi("/api/status"),
    refetchInterval: 3000,
  });

  const { data: sessions } = useQuery<SessionStatus>({
    queryKey: ["sessions"],
    queryFn: () => fetchApi("/api/sessions"),
    refetchInterval: 5000,
  });

  const runJobs = useMutation({
    mutationFn: () =>
      fetchApi<{ ok: boolean; message: string }>("/api/run", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["pipeline-status"] });
    },
  });

  const syncIndeed = useMutation({
    mutationFn: () =>
      fetchApi<{ ok: boolean; message: string }>("/api/sessions/indeed/sync", { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sessions"] }),
  });

  const connectIndeed = useMutation({
    mutationFn: () =>
      fetchApi<{ ok: boolean; message: string }>("/api/sessions/indeed/login", {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
  });

  const pipeline = status?.pipeline;
  const isRunning = pipeline?.status === "running" || runJobs.isPending;
  const indeedReady = sessions?.indeed.profileExists;

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Job Search</h2>
          <p className="text-sm text-muted-foreground">
            Crawl Indeed & LinkedIn, score matches, and prepare applications.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => syncIndeed.mutate()}
            disabled={syncIndeed.isPending || !indeedReady}
            className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            {syncIndeed.isPending ? "Syncing…" : "Sync Indeed Profile"}
          </button>
          <button
            onClick={() => connectIndeed.mutate()}
            disabled={connectIndeed.isPending || sessions?.indeed.loginInProgress}
            className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            {sessions?.indeed.loginInProgress
              ? "Logging in…"
              : indeedReady
                ? "Reconnect Indeed"
                : "Connect Indeed"}
          </button>
          <button
            onClick={() => runJobs.mutate()}
            disabled={isRunning}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isRunning ? "Running…" : "Run Job Search"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs">
        <span
          className={`rounded-full px-2 py-1 ${indeedReady ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}
        >
          Indeed: {indeedReady ? "Chrome profile saved" : "not connected — click Connect Indeed first"}
          {" · profile at profile.indeed.com"}
        </span>
        {sessions?.indeed.lastSync && (
          <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-800">
            Profile synced {new Date(sessions.indeed.lastSync.at).toLocaleString()} (
            {sessions.indeed.lastSync.skills} skills)
          </span>
        )}
      </div>

      {syncIndeed.isSuccess && (
        <p className={`text-sm ${syncIndeed.data.ok ? "text-green-600" : "text-amber-600"}`}>
          {syncIndeed.data.message}
        </p>
      )}
      {connectIndeed.isSuccess && (
        <p className="text-sm text-blue-600">{connectIndeed.data.message}</p>
      )}
      {runJobs.isSuccess && (
        <p className="text-sm text-green-600">{runJobs.data.message}</p>
      )}
      {runJobs.isError && (
        <p className="text-sm text-red-600">
          Failed to start — is the worker running? (pnpm dev)
        </p>
      )}
      {pipeline && pipeline.status !== "idle" && (
        <p className="text-xs text-muted-foreground">
          Status: <span className="font-medium">{pipeline.status}</span>
          {pipeline.found !== undefined && ` · ${pipeline.found} found`}
          {pipeline.at && ` · ${new Date(pipeline.at).toLocaleTimeString()}`}
        </p>
      )}
      {pipeline?.errors && pipeline.errors.length > 0 && (
        <p className="text-xs text-amber-600">{pipeline.errors[0]}</p>
      )}
    </div>
  );
}
