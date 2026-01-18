# Document Upload Integration Guide

## 📍 Endpoint: POST /api/v1/documents/process-multimodal

### 🎯 **Strategy: On-Demand Mutation + Progress Tracking + Optimistic Updates**

**Why this strategy:**

- File upload with heavy server-side processing (AI enhancement, vectorization)
- Long-running operation (10-60 seconds) requires real-time feedback
- Progress tracking improves UX during upload phase
- Optimistic updates for instant UI feedback
- Automatic cache invalidation for related queries

---

## 📦 **Complete Implementation**

### 1. Type Definitions

Located in: `lib/types.ts`

```typescript
// Core Processing Types
export type ContentType = "text" | "table" | "image";

export interface OriginalContent {
  raw_text: string;
  tables_html: string[];
  images_base64: string[];
}

export interface ChunkMetadata {
  page_numbers: number[];
  element_types?: string[];
  is_ai_enhanced: boolean;
  ai_model_used?: string;
  processing_time_ms?: number;
  token_count?: number;
}

export interface MultimodalChunk {
  chunk_id: number;
  enhanced_content: string;
  content_types: ContentType[];
  original_content: OriginalContent;
  metadata: ChunkMetadata;
}

export interface ProcessingStats {
  total_elements_extracted: number;
  text_only_chunks: number;
  chunks_with_tables: number;
  chunks_with_images: number;
  ai_enhanced_chunks: number;
  ai_enhancement_failures?: number;
  total_tables_found: number;
  total_images_found: number;
  total_pages: number;
  estimated_tokens?: number;
}

// API Response
export interface MultimodalProcessResponse {
  filename: string;
  total_chunks: number;
  processing_strategy: "hi_res" | "fast";
  ai_enhancement_enabled: boolean;
  processing_stats: ProcessingStats;
  chunks: MultimodalChunk[];
  processing_time_seconds: number;
  warnings: string[];
}

// Upload Settings
export interface UploadSettings {
  strategy: "hi_res" | "fast";
  max_chunk_size: number;
  enable_ai_enhancement: boolean;
  upsert_to_pinecone: boolean;
  pinecone_namespace: string;
}
```

---

### 2. API Service Function

Located in: `lib/api-client.ts`

```typescript
async uploadDocument(
  file: File,
  settings: UploadSettings,
  onProgress?: (progress: number) => void
): Promise<MultimodalProcessResponse> {
  const formData = new FormData();
  formData.append("file", file);

  // API expects FormData fields (NOT query params)
  formData.append("strategy", settings.strategy);
  formData.append("max_chunk_size", settings.max_chunk_size.toString());
  formData.append("enable_ai_enhancement", settings.enable_ai_enhancement.toString());
  formData.append("upsert_to_pinecone", settings.upsert_to_pinecone.toString());
  formData.append("pinecone_namespace", settings.pinecone_namespace);

  // Use XMLHttpRequest for progress tracking
  if (onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          onProgress(Math.round(percentComplete));
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          const error = JSON.parse(xhr.responseText);
          reject(new ApiError(error.detail, xhr.status, error.code));
        }
      });

      xhr.addEventListener("error", () => {
        reject(new ApiError("Network error during upload", 0));
      });

      xhr.open("POST", `${this.baseURL}/documents/process-multimodal`);
      if (this.token) {
        xhr.setRequestHeader("Authorization", `Bearer ${this.token}`);
      }
      xhr.send(formData);
    });
  }

  // Fallback to fetch without progress
  const response = await fetch(`${this.baseURL}/documents/process-multimodal`, {
    method: "POST",
    headers: {
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new ApiError(error.detail, response.status, error.code);
  }

  return response.json();
}
```

**Key Features:**

- ✅ Uses FormData fields (not query params)
- ✅ Progress tracking via XMLHttpRequest
- ✅ Proper error handling with ApiError
- ✅ Fallback to fetch if progress not needed
- ✅ Returns complete MultimodalProcessResponse

---

### 3. React Query Hook

Located in: `lib/hooks/use-documents.ts`

```typescript
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

      // Reset progress
      setUploadProgress(0);
    },
    onError: () => {
      setUploadProgress(0);
    },
  });

  return {
    ...mutation,
    uploadProgress,
  };
}
```

**Query Key Structure:**

```typescript
export const documentKeys = {
  all: ["documents"] as const,
  lists: () => [...documentKeys.all, "list"] as const,
  list: (namespaceId?: string) =>
    [...documentKeys.lists(), namespaceId] as const,
  details: () => [...documentKeys.all, "detail"] as const,
  detail: (id: string) => [...documentKeys.details(), id] as const,
};
```

---

### 4. Component Usage Example

Located in: `components/ui/UploadModal.tsx`

```typescript
export const DocumentsPage = () => {
  const { data: namespaces } = useNamespaces();
  const uploadMutation = useUploadDocument();

  const handleUpload = async (file: File, settings: UploadSettings) => {
    try {
      const response = await uploadMutation.mutateAsync({ file, settings });

      // Response contains full processing stats
      console.log("Upload complete:", {
        filename: response.filename,
        chunks: response.total_chunks,
        pages: response.processing_stats.total_pages,
        aiEnhanced: response.processing_stats.ai_enhanced_chunks,
        tables: response.processing_stats.total_tables_found,
        images: response.processing_stats.total_images_found,
        processingTime: response.processing_time_seconds,
      });

      return response;
    } catch (error) {
      console.error("Upload failed:", error);
      throw error;
    }
  };

  return (
    <UploadModal
      isOpen={true}
      onClose={() => {}}
      onUpload={handleUpload}
      namespaces={namespaces || []}
      uploadProgress={uploadMutation.uploadProgress}
    />
  );
};
```

---

## 🎨 **UI Components**

### Progress Bar (During Upload)

```tsx
{
  uploadProgress > 0 && uploadProgress < 100 && (
    <div className="w-full h-8 border-4 border-black bg-white relative overflow-hidden">
      <div
        className="h-full bg-[#FFFF00] transition-all duration-300"
        style={{ width: `${uploadProgress}%` }}
      >
        <span className="font-black text-xs text-black">{uploadProgress}%</span>
      </div>
    </div>
  );
}
```

### Processing Stats Display (After Success)

```tsx
{
  processResponse && (
    <div className="grid grid-cols-2 gap-3">
      <div className="p-3 bg-white border-2 border-black">
        <p className="text-2xl font-black text-[#FF006E]">
          {processResponse.processing_stats.ai_enhanced_chunks}
        </p>
        <p className="text-xs font-bold uppercase">AI Enhanced</p>
      </div>
      <div className="p-3 bg-white border-2 border-black">
        <p className="text-2xl font-black text-[#00FFFF]">
          {processResponse.processing_stats.total_tables_found}
        </p>
        <p className="text-xs font-bold uppercase">Tables Found</p>
      </div>
    </div>
  );
}
```

---

## ⚙️ **Configuration Recommendations**

### Cache/Stale Time

```typescript
// Not applicable for mutations
// Invalidation handled automatically on success
```

### Error Handling

```typescript
try {
  await uploadMutation.mutateAsync({ file, settings });
} catch (error) {
  if (error instanceof ApiError) {
    if (error.code === "FILE_TOO_LARGE") {
      toast.error("File exceeds 50MB limit");
    } else if (error.code === "INVALID_FILE_TYPE") {
      toast.error("Only PDF files are supported");
    } else if (error.code === "PROCESSING_ERROR") {
      toast.error("Processing failed. Please try again.");
    } else {
      toast.error(error.message);
    }
  }
}
```

### Refetch Policies

- Automatically invalidates related queries on success:
  - `documentKeys.list(namespace)` - Documents in this namespace
  - `documentKeys.lists()` - All document lists
  - `namespaceKeys.lists()` - Namespace list (for document count update)

---

## 🚀 **Performance Optimizations**

### 1. File Size Validation (Client-Side)

```typescript
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

if (file.size > MAX_FILE_SIZE) {
  setError("File exceeds 50MB limit");
  return;
}
```

### 2. Optimistic UI Updates

```typescript
onMutate: async ({ file, settings }) => {
  // Cancel outgoing queries
  await queryClient.cancelQueries({ queryKey: documentKeys.lists() });

  // Optimistic document entry
  const optimisticDoc: Document = {
    id: `temp-${Date.now()}`,
    name: file.name,
    pageCount: 0,
    fileSize: formatFileSize(file.size),
    uploadedAt: new Date().toISOString(),
    namespace: settings.pinecone_namespace,
    metadata: { isUploading: true },
  };

  queryClient.setQueryData<Document[]>(
    documentKeys.list(settings.pinecone_namespace),
    (old) => (old ? [optimisticDoc, ...old] : [optimisticDoc])
  );

  return { optimisticDoc };
},
```

### 3. Background Upload (Advanced)

```typescript
// Use service worker for background uploads
// (implementation depends on your PWA setup)
```

---

## 📊 **Expected Response Times**

| Processing Strategy | File Size   | Estimated Time |
| ------------------- | ----------- | -------------- |
| `fast`              | 1-10 pages  | 2-5 seconds    |
| `fast`              | 10-50 pages | 5-15 seconds   |
| `hi_res`            | 1-10 pages  | 5-15 seconds   |
| `hi_res`            | 10-50 pages | 15-60 seconds  |

**Factors affecting processing time:**

- Number of pages
- Number of tables and images
- AI enhancement enabled/disabled
- Server load

---

## 🐛 **Troubleshooting**

### Issue: Upload stuck at 100%

**Cause:** Server processing after upload complete  
**Solution:** Add secondary progress indicator for processing phase

### Issue: FormData not sent correctly

**Cause:** Setting Content-Type manually  
**Solution:** Let browser set Content-Type with boundary

### Issue: No progress updates

**Cause:** Using fetch instead of XMLHttpRequest  
**Solution:** Ensure onProgress callback is provided

### Issue: Cache not updating after upload

**Cause:** Query key mismatch  
**Solution:** Verify namespace ID matches between upload and list queries

---

## 📚 **Related Documentation**

- [TanStack Query Mutations](https://tanstack.com/query/latest/docs/framework/react/guides/mutations)
- [MDN: FormData](https://developer.mozilla.org/en-US/docs/Web/API/FormData)
- [MDN: XMLHttpRequest Progress](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/progress_event)
- Backend API: `backend/API_DOCUMENTATION.md`

---

**Last Updated:** January 6, 2026  
**Status:** ✅ Production Ready
