"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { fetchApi } from "@/lib/utils";
import type { Application } from "@/lib/types";
import { ReviewCard } from "@/components/review-card";

export default function ReviewPage() {
  const params = useParams();
  const id = params.id as string;

  const { data: job, isLoading, error } = useQuery<Application>({
    queryKey: ["job", id],
    queryFn: () => fetchApi(`/api/jobs/${id}`),
    enabled: !!id,
  });

  if (isLoading) return <p>Loading...</p>;
  if (error || !job) return <p>Application not found.</p>;

  return <ReviewCard job={job} />;
}
