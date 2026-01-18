# Document Management API Integration Guide

## Overview

Complete integration of document CRUD operations with efficient caching strategies using TanStack Query v5.

## API Endpoints

### 1. GET /api/v1/documents

**Purpose:** Fetch paginated list of documents with optional filtering

**Query Parameters:**

- `namespace_id` (optional): Filter by namespace UUID
- `namespace` (optional): Filter by namespace name
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)

**Response:**

```typescript
{
  documents: Document[],
  total: number,
  page: number,
  limit: number
}
```

**Frontend Implementation:**

```typescript
// lib/api-client.ts
async getDocuments(params?: {
  namespace_id?: string;
  namespace?: string;
  page?: number;
  limit?: number;
}): Promise<DocumentListResponse> {
  const queryParams = new URLSearchParams();
  if (params?.namespace_id) queryParams.set("namespace_id", params.namespace_id);
  if (params?.namespace) queryParams.set("namespace", params.namespace);
  if (params?.page) queryParams.set("page", params.page.toString());
  if (params?.limit) queryParams.set("limit", params.limit.toString());

  const url = `/documents${queryParams.toString() ? `?${queryParams}` : ""}`;
  return this.request<DocumentListResponse>(url);
}
```

**Usage with Hooks:**

```typescript
// Simple list - all documents
const { data: documents, isLoading } = useDocuments();

// Filtered by namespace
const { data: documents } = useDocuments("my-namespace");

// With pagination
const { data, isLoading } = useDocumentsPaginated("my-namespace", 1, 20);
```

---

### 2. GET /api/v1/documents/{id}

**Purpose:** Fetch detailed information about a specific document

**Response:**

```typescript
{
  id: string;
  name: string;
  page_count: number;
  file_size: string;
  file_size_bytes?: number;
  uploaded_at: string;
  namespace: string;
  namespace_name?: string;
  metadata?: {
    processing_strategy?: string;
    chunk_count?: number;
    has_images?: boolean;
    has_tables?: boolean;
  };
  // Additional processing details
}
```

**Frontend Implementation:**

```typescript
// lib/api-client.ts
async getDocument(id: string): Promise<DocumentDetail> {
  return this.request<DocumentDetail>(`/documents/${id}`);
}
```

**Usage:**

```typescript
const { data: document, isLoading } = useDocument(docId);
```

---

### 3. DELETE /api/v1/documents/{id}

**Purpose:** Delete document and all associated vectors from Pinecone

**Response:**

```typescript
{
  status: "success",
  message: string,
  document_id: string,
  vectors_deleted: number
}
```

**Frontend Implementation:**

```typescript
// lib/api-client.ts
async deleteDocument(id: string): Promise<DeleteDocumentResponse> {
  return this.request<DeleteDocumentResponse>(`/documents/${id}`, {
    method: "DELETE",
  });
}
```

**Usage:**

```typescript
const deleteMutation = useDeleteDocument();

const handleDelete = async (docId: string) => {
  if (confirm("Are you sure?")) {
    await deleteMutation.mutateAsync(docId);
  }
};
```

---

## Type Definitions

### Document Interface

```typescript
interface Document {
  id: string;
  name: string;
  page_count: number; // ⚠️ snake_case (backend format)
  file_size: string; // ⚠️ snake_case
  file_size_bytes?: number;
  uploaded_at: string; // ⚠️ snake_case
  namespace: string;
  namespace_name?: string;
  metadata?: {
    processing_strategy?: "fast" | "quality" | "balanced";
    chunk_count?: number;
    has_images?: boolean;
    has_tables?: boolean;
  };
}
```

### Important Field Names

**Backend uses snake_case** - frontend must match:

- ✅ `page_count` (NOT pageCount)
- ✅ `file_size` (NOT fileSize)
- ✅ `uploaded_at` (NOT uploadedAt)

---

## React Query Hooks

### Query Key Factory Pattern

```typescript
const documentKeys = {
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
```

**Benefits:**

- Type-safe query keys
- Easy invalidation: `queryClient.invalidateQueries({ queryKey: documentKeys.lists() })`
- Prevents cache mismatches
- Supports filter-based caching

---

### useDocuments Hook

**Purpose:** Fetch all documents or filter by namespace

```typescript
export function useDocuments(
  namespace?: string,
  options?: { page?: number; limit?: number }
) {
  return useQuery({
    queryKey: documentKeys.list({ namespace, page: options?.page }),
    queryFn: async () => {
      const response = await apiClient.getDocuments({ namespace, ...options });
      return response.documents; // Extract array from response
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

**Usage:**

```typescript
// All documents
const { data: documents = [], isLoading } = useDocuments();

// Namespace-specific
const { data: documents } = useDocuments("my-namespace");
```

---

### useDocumentsPaginated Hook

**Purpose:** Efficient pagination with placeholder data

```typescript
export function useDocumentsPaginated(
  namespace?: string,
  page = 1,
  limit = 20
) {
  return useQuery({
    queryKey: documentKeys.list({ namespace, page }),
    queryFn: async () => {
      return apiClient.getDocuments({ namespace, page, limit });
    },
    placeholderData: (previousData) => previousData, // Keep old data while loading
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000,
  });
}
```

**Benefits:**

- No loading spinner between pages
- Smooth UX with stale data shown
- Auto-updates in background

---

### useDocument Hook

**Purpose:** Fetch single document details

```typescript
export function useDocument(id: string) {
  return useQuery({
    queryKey: documentKeys.detail(id),
    queryFn: () => apiClient.getDocument(id),
    enabled: !!id,
    staleTime: 60 * 1000, // 1 minute (details change less often)
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
```

---

### useDeleteDocument Hook

**Purpose:** Delete document with optimistic updates

```typescript
export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.deleteDocument(id),

    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: documentKeys.lists() });

      // Snapshot for rollback
      const previousDocuments = queryClient.getQueriesData({
        queryKey: documentKeys.lists(),
      });

      // Optimistically remove from all cached lists
      queryClient.setQueriesData<Document[]>(
        { queryKey: documentKeys.lists() },
        (old) => old?.filter((doc) => doc.id !== id)
      );

      return { previousDocuments };
    },

    onError: (err, id, context) => {
      // Rollback on error
      context?.previousDocuments.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      console.error("Delete failed:", err);
    },

    onSuccess: (data) => {
      console.log(
        `✅ Document deleted: ${data.vectors_deleted} vectors removed`
      );

      // Invalidate to ensure consistency
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: documentKeys.details() });
    },
  });
}
```

**Features:**

- **Optimistic Updates:** Document disappears immediately
- **Rollback on Error:** Restores if deletion fails
- **Vector Confirmation:** Logs number of vectors deleted
- **Cache Invalidation:** Ensures all lists stay in sync

---

## UI Implementation

### Documents Page

```typescript
"use client";

export default function DocumentsPage() {
  const [selectedNamespace, setSelectedNamespace] = useState<string>("all");

  // Hooks
  const { data: namespaces = [] } = useNamespaces();
  const { data: documents = [], isLoading } = useDocuments(
    selectedNamespace === "all" ? undefined : selectedNamespace
  );
  const deleteMutation = useDeleteDocument();

  const handleDeleteDocument = async (docId: string) => {
    const document = documents.find((doc) => doc.id === docId);
    if (!document) return;

    const confirmed = confirm(
      `Are you sure you want to delete "${document.name}"? ` +
        `This will also remove all associated vectors from Pinecone.`
    );

    if (confirmed) {
      try {
        await deleteMutation.mutateAsync(docId);
      } catch (error) {
        console.error("Delete failed:", error);
        alert("Failed to delete document. Please try again.");
      }
    }
  };

  return (
    <div>
      {/* Document list */}
      {documents.map((doc) => (
        <div key={doc.id}>
          <h3>{doc.name}</h3>
          <p>
            {doc.page_count} pages • {doc.file_size}
          </p>
          <p>Uploaded: {formatDate(doc.uploaded_at)}</p>

          <button onClick={() => handleDeleteDocument(doc.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}
```

---

## Caching Strategy

### Stale Time vs GC Time

**staleTime:** How long data is considered fresh

- Lists: 30s (frequent changes)
- Details: 60s (change less often)
- Prevents unnecessary refetches

**gcTime (Garbage Collection Time):** How long to keep unused data in cache

- Lists: 5 minutes
- Details: 10 minutes
- Enables instant back navigation

### Cache Invalidation

**After Upload:**

```typescript
queryClient.invalidateQueries({
  queryKey: documentKeys.list({ namespace: uploadedNamespace }),
});
queryClient.invalidateQueries({
  queryKey: documentKeys.lists(),
});
```

**After Delete:**

```typescript
queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
queryClient.invalidateQueries({ queryKey: documentKeys.details() });
```

---

## Best Practices

### 1. Always Use snake_case Field Names

```typescript
// ✅ Correct
<p>{doc.page_count} pages</p>
<p>{doc.file_size}</p>
<p>{formatDate(doc.uploaded_at)}</p>

// ❌ Wrong
<p>{doc.pageCount} pages</p>
<p>{doc.fileSize}</p>
<p>{formatDate(doc.uploadedAt)}</p>
```

### 2. Use Optimistic Updates for Better UX

```typescript
const deleteMutation = useDeleteDocument();

// Document disappears immediately, rolls back if error
await deleteMutation.mutateAsync(docId);
```

### 3. Show Confirmation for Destructive Actions

```typescript
if (confirm(`Delete "${doc.name}"? This will remove all vectors.`)) {
  await deleteMutation.mutateAsync(docId);
}
```

### 4. Handle Loading and Error States

```typescript
const { data, isLoading, error } = useDocuments();

if (isLoading) return <Spinner />;
if (error) return <ErrorMessage error={error} />;
```

### 5. Use placeholderData for Pagination

```typescript
// Shows old data while loading next page
const { data } = useDocumentsPaginated(namespace, page, 20);
```

---

## Testing

### Test Document List

```bash
curl http://localhost:8000/api/v1/documents
```

### Test Filtered by Namespace

```bash
curl "http://localhost:8000/api/v1/documents?namespace=my-namespace"
```

### Test Pagination

```bash
curl "http://localhost:8000/api/v1/documents?page=2&limit=10"
```

### Test Document Detail

```bash
curl http://localhost:8000/api/v1/documents/{doc_id}
```

### Test Delete

```bash
curl -X DELETE http://localhost:8000/api/v1/documents/{doc_id}
```

---

## Common Issues

### Issue: Documents show old field names

**Fix:** Update JSX to use `page_count`, `file_size`, `uploaded_at`

### Issue: Delete doesn't update UI

**Check:**

1. `useDeleteDocument` is called in component
2. Mutation is triggered: `deleteMutation.mutateAsync(id)`
3. Query keys are properly invalidated

### Issue: Pagination doesn't work smoothly

**Fix:** Use `placeholderData: (prev) => prev` in `useDocumentsPaginated`

### Issue: Stale data after upload

**Fix:** Invalidate queries in `useUploadDocument` onSuccess callback

---

## Summary

✅ **Complete API Integration**

- GET all documents with filtering/pagination
- GET single document details
- DELETE document with vector cleanup

✅ **Efficient Caching**

- Query key factory pattern
- Optimistic updates with rollback
- Smart stale times (30s-60s)
- Placeholder data for pagination

✅ **Type Safety**

- Full TypeScript interfaces
- Backend snake_case field names
- Proper response typing

✅ **Production Ready**

- Error handling with rollback
- Loading states
- Confirmation dialogs
- Vector deletion tracking
