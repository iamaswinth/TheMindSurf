import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api-client";
import { Document, DocumentDetail, UploadSettings } from "../types";
import { namespaceKeys } from "./use-namespaces";
import { useState } from "react";

// Query Keys - Efficient key factory pattern
export const documentKeys = {
  all: ["documents"] as const,
  lists: () => [...documentKeys.all, "list"] as const,
  list: (filters?: {
    namespace?: string;
    namespace_id?: string;
    page?: number;
  }) => [...documentKeys.lists(), filters] as const,
  details: () => [...documentKeys.all, "detail"] as const,
  detail: (id: string) => [...documentKeys.details(), id] as const,
};

// ============================================
// GET DOCUMENTS LIST
// ============================================
export function useDocuments(
  namespace?: string,
  options?: { page?: number; limit?: number }
) {
  return useQuery({
    queryKey: documentKeys.list({ namespace, page: options?.page }),
    queryFn: async () => {
      const response = await apiClient.getDocuments({
        namespace,
        page: options?.page,
        limit: options?.limit,
      });
      // Extract documents array from response
      return response.documents;
    },
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });
}

// ============================================
// GET DOCUMENTS WITH PAGINATION
// ============================================
export function useDocumentsPaginated(
  namespace?: string,
  page: number = 1,
  limit: number = 10
) {
  return useQuery({
    queryKey: documentKeys.list({ namespace, page }),
    queryFn: () => apiClient.getDocuments({ namespace, page, limit }),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData, // Keep previous data while loading
  });
}

// ============================================
// GET SINGLE DOCUMENT DETAIL
// ============================================
export function useDocument(id: string) {
  return useQuery({
    queryKey: documentKeys.detail(id),
    queryFn: () => apiClient.getDocument(id),
    enabled: !!id,
    staleTime: 60 * 1000, // Details stay fresh longer
  });
}

// ============================================
// UPLOAD DOCUMENT WITH PROGRESS TRACKING
// ============================================
export function useUploadDocument() {
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState(0);

  const mutation = useMutation({
    mutationFn: async ({
      file,
      settings,
    }: {
      file: File;
      settings: UploadSettings;
    }) => {
      setUploadProgress(0);
      return apiClient.uploadDocument(file, settings, (progress) => {
        setUploadProgress(progress);
      });
    },
    onSuccess: (data, variables) => {
      // Invalidate documents list for this namespace
      queryClient.invalidateQueries({
        queryKey: documentKeys.list({
          namespace: variables.settings.pinecone_namespace,
        }),
      });

      // Invalidate all documents list
      queryClient.invalidateQueries({
        queryKey: documentKeys.lists(),
      });

      // Update namespace document count
      queryClient.invalidateQueries({
        queryKey: namespaceKeys.lists(),
      });

      // Reset progress
      setUploadProgress(0);
    },
    onError: () => {
      // Reset progress on error
      setUploadProgress(0);
    },
  });

  return {
    ...mutation,
    uploadProgress,
  };
}

// ============================================
// DELETE DOCUMENT
// ============================================
export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.deleteDocument(id),
    onMutate: async (id) => {
      // Cancel outgoing queries to prevent race conditions
      await queryClient.cancelQueries({ queryKey: documentKeys.lists() });

      // Snapshot previous values
      const previousLists = queryClient.getQueriesData<Document[]>({
        queryKey: documentKeys.lists(),
      });

      // Optimistically remove from all cached lists
      previousLists.forEach(([queryKey, data]) => {
        if (data) {
          queryClient.setQueryData<Document[]>(
            queryKey,
            data.filter((doc) => doc.id !== id)
          );
        }
      });

      return { previousLists };
    },
    onError: (err, id, context) => {
      // Rollback on error
      if (context?.previousLists) {
        context.previousLists.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSuccess: (data) => {
      // Invalidate to refetch with accurate counts
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: namespaceKeys.lists() });

      console.log(
        `✅ Document deleted: ${data.vectors_deleted} vectors removed`
      );
    },
  });
}
