export interface JobListing {
  title: string;
  company: string;
  url: string;
  salary?: string;
  postedDate?: string;
  platform: string;
  description?: string;
  location?: string;
  jobKey?: string;
  applyUrl?: string;
  applyType?: "easy_apply" | "external" | "ats";
}

export interface SearchOptions {
  query: string;
  location?: string;
  remote?: boolean;
  maxPages?: number;
}

export interface JobDetail extends JobListing {
  description: string;
  applyUrl: string;
  applyType: "easy_apply" | "external" | "ats";
}
