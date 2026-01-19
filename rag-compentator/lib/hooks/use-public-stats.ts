import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { PublicStats } from "@/lib/types";

export function usePublicStats() {
  return useQuery<PublicStats>({
    queryKey: ["public-stats"],
    queryFn: () => apiClient.getPublicStats(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 5, // Refetch every 5 minutes
    refetchOnWindowFocus: true,
  });
}
