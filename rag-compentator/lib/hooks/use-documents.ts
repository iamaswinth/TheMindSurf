import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api-client";
import { Document, UploadSettings } from "../types";
import { namespaceKeys } from "./use-namespaces";

// Query Keys
export const documentKeys = {
  all: ["documents"] as const,
  lists: () => [...documentKeys.all, "list"] as const,
  list: (namespaceId?: string) =>
    [...documentKeys.lists(), namespaceId] as const,
  details: () => [...documentKeys.all, "detail"] as const,
  detail: (id: string) => [...documentKeys.details(), id] as const,
};

// ============================================
// GET DOCUMENTS
// ============================================
export function useDocuments(namespaceId?: string) {
  return useQuery({
    queryKey: documentKeys.list(namespaceId),
    queryFn: () => apiClient.getDocuments(namespaceId),
    staleTime: 30 * 1000,
    enabled: !!namespaceId, // Only fetch if namespace is provided
  });
}

// ============================================
// GET SINGLE DOCUMENT
// ============================================
export function useDocument(id: string) {
  return useQuery({
    queryKey: documentKeys.detail(id),
    queryFn: () => apiClient.getDocument(id),
    enabled: !!id,
  });
}

// ============================================
// UPLOAD DOCUMENT
// ============================================
export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      file,
      settings,
    }: {
      file: File;
      settings: UploadSettings;
    }) => apiClient.uploadDocument(file, settings),
    onSuccess: (data, variables) => {
      // Invalidate documents list for this namespace
      queryClient.invalidateQueries({
        queryKey: documentKeys.list(variables.settings.pinecone_namespace),
      });

      // Invalidate all documents list
      queryClient.invalidateQueries({
        queryKey: documentKeys.lists(),
      });

      // Update namespace document count
      queryClient.invalidateQueries({
        queryKey: namespaceKeys.lists(),
      });
    },
  });
}

// ============================================
// DELETE DOCUMENT
// ============================================
export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.deleteDocument(id),
    onMutate: async (id) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: documentKeys.lists() });

      // Snapshot previous values for all namespace lists
      const previousData = new Map();
      const allQueries = queryClient.getQueriesData<Document[]>({
        queryKey: documentKeys.lists(),
      });

      allQueries.forEach(([queryKey, data]) => {
        previousData.set(queryKey, data);
      });

      // Optimistically remove from all lists
      allQueries.forEach(([queryKey, data]) => {
        if (data) {
          queryClient.setQueryData<Document[]>(
            queryKey,
            data.filter((doc) => doc.id !== id)
          );
        }
      });

      return { previousData };
    },
    onError: (err, id, context) => {
      // Rollback
      if (context?.previousData) {
        context.previousData.forEach((data, queryKey) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSuccess: () => {
      // Refetch everything to be sure
      queryClient.invalidateQueries({ queryKey: documentKeys.all });
      queryClient.invalidateQueries({ queryKey: namespaceKeys.lists() });
    },
  });
}
