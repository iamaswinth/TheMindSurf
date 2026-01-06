import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api-client";
import { Namespace, CreateNamespaceRequest } from "../types";

// Query Keys
export const namespaceKeys = {
  all: ["namespaces"] as const,
  lists: () => [...namespaceKeys.all, "list"] as const,
  list: (filters?: string) => [...namespaceKeys.lists(), filters] as const,
  details: () => [...namespaceKeys.all, "detail"] as const,
  detail: (id: string) => [...namespaceKeys.details(), id] as const,
};

// ============================================
// GET ALL NAMESPACES
// ============================================
export function useNamespaces() {
  return useQuery({
    queryKey: namespaceKeys.lists(),
    queryFn: async () => {
      const response = await apiClient.getNamespaces();
      // Extract namespaces array from response
      return response.namespaces;
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

// ============================================
// GET SINGLE NAMESPACE
// ============================================
export function useNamespace(id: string) {
  return useQuery({
    queryKey: namespaceKeys.detail(id),
    queryFn: () => apiClient.getNamespace(id),
    enabled: !!id,
  });
}

// ============================================
// CREATE NAMESPACE
// ============================================
export function useCreateNamespace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateNamespaceRequest) =>
      apiClient.createNamespace(data),
    onMutate: async (data) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: namespaceKeys.lists() });

      // Snapshot previous value
      const previousNamespaces = queryClient.getQueryData<Namespace[]>(
        namespaceKeys.lists()
      );

      // Optimistically update
      const optimisticNamespace: Namespace = {
        id: `temp-${Date.now()}`,
        name: data.name,
        description: data.description,
        document_count: 0,
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData<Namespace[]>(namespaceKeys.lists(), (old) =>
        old ? [optimisticNamespace, ...old] : [optimisticNamespace]
      );

      return { previousNamespaces };
    },
    onError: (err, data, context) => {
      // Rollback on error
      if (context?.previousNamespaces) {
        queryClient.setQueryData(
          namespaceKeys.lists(),
          context.previousNamespaces
        );
      }
    },
    onSuccess: () => {
      // Refetch to get accurate data
      queryClient.invalidateQueries({ queryKey: namespaceKeys.lists() });
    },
  });
}

// ============================================
// DELETE NAMESPACE
// ============================================
export function useDeleteNamespace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.deleteNamespace(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: namespaceKeys.lists() });

      const previousNamespaces = queryClient.getQueryData<Namespace[]>(
        namespaceKeys.lists()
      );

      // Optimistically remove
      queryClient.setQueryData<Namespace[]>(namespaceKeys.lists(), (old) =>
        old?.filter((ns) => ns.id !== id)
      );

      return { previousNamespaces };
    },
    onError: (err, id, context) => {
      if (context?.previousNamespaces) {
        queryClient.setQueryData(
          namespaceKeys.lists(),
          context.previousNamespaces
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: namespaceKeys.lists() });
    },
  });
}
