export interface JobStats {
  totalFound: number;
  highMatch: number;
  formsReady: number;
  submitted: number;
  waiting: number;
  skipped: number;
}

export interface Application {
  id: string;
  company: string;
  title: string;
  jobUrl: string;
  platform: string | null;
  score: number | null;
  salaryEstimate: string | null;
  status: string;
  matchData: string | null;
  screenshotPath: string | null;
  questions: string | null;
  missingFields: string | null;
  submittedAt: string | null;
  notes: string | null;
  createdAt: string;
}

export interface JobsResponse {
  jobs: Application[];
  stats: JobStats;
}
