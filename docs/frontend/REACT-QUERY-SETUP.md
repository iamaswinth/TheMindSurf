# React Query Integration - Complete Setup ✅

## What Has Been Done

### 1. **Installed Packages**

- ✅ `@tanstack/react-query` - Core React Query library
- ✅ `@tanstack/react-query-devtools` - Development tools

### 2. **Created Core Files**

#### **API Layer** (`lib/api-client.ts`)

- ✅ `ApiClient` class with all endpoint methods
- ✅ `ApiError` class for error handling
- ✅ `serverFetch()` helper for server-side fetching
- ✅ TypeScript-safe, ready for FastAPI backend

#### **Query Configuration** (`lib/query-client.ts`)

- ✅ `makeQueryClient()` - Creates new query clients
- ✅ `getQueryClient()` - Singleton for browser, new instance for server
- ✅ Configured with sensible defaults (30s stale time, 5min cache)

#### **Provider Setup** (`lib/providers.tsx`)

- ✅ `QueryProvider` component
- ✅ React Query Devtools integration (development only)
- ✅ Ready to wrap your app

#### **Custom Hooks** (`lib/hooks/`)

- ✅ `use-namespaces.ts` - Namespace CRUD with optimistic updates
- ✅ `use-documents.ts` - Document CRUD with optimistic updates
- ✅ `use-chat.ts` - Chat with streaming support

### 3. **Updated App Structure**

- ✅ Added `QueryProvider` to `app/layout.tsx`
- ✅ Updated `lib/types.ts` with `ChatResponse` and `isStreaming`

### 4. **Documentation**

- ✅ `PREFETCHING.md` - Complete prefetching guide
- ✅ `BACKEND-REQUIREMENTS.md` - FastAPI endpoint specifications
- ✅ `EXAMPLE-PREFETCH-PAGE.tsx` - Server component with prefetching
- ✅ `EXAMPLE-DASHBOARD-CLIENT.tsx` - Client component using hooks
- ✅ `.env.local.example` - Environment variable template

## How to Use

### Step 1: Set Up Environment Variables

```bash
# Copy the example file
cp .env.local.example .env.local

# Edit .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

### Step 2: Start Your FastAPI Backend

Make sure your backend is running on `http://localhost:8000` with CORS enabled.

### Step 3: Use React Query Hooks in Components

```tsx
"use client";
import { useNamespaces, useCreateNamespace } from "@/lib/hooks/use-namespaces";

function MyComponent() {
  const { data: namespaces, isLoading } = useNamespaces();
  const createMutation = useCreateNamespace();

  const handleCreate = async () => {
    await createMutation.mutateAsync("new-namespace");
  };

  return (
    <div>
      {isLoading
        ? "Loading..."
        : namespaces.map((ns) => <div key={ns.id}>{ns.name}</div>)}
      <button onClick={handleCreate}>Create</button>
    </div>
  );
}
```

### Step 4: Add Prefetching (Optional but Recommended)

Create a server component that prefetches data:

```tsx
// app/page.tsx (Server Component)
import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from "@tanstack/react-query";
import { serverFetch } from "@/lib/api-client";
import { namespaceKeys } from "@/lib/hooks/use-namespaces";
import DashboardClient from "./dashboard-client";

export default async function Page() {
  const queryClient = new QueryClient();

  // Prefetch data on server
  await queryClient.prefetchQuery({
    queryKey: namespaceKeys.lists(),
    queryFn: () => serverFetch("/namespaces"),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardClient />
    </HydrationBoundary>
  );
}
```

## Key Features

### ✨ **Automatic Caching**

Data is cached automatically - no need to manage state manually.

### ✨ **Optimistic Updates**

UI updates instantly, then confirms with server:

```tsx
const { mutate } = useCreateNamespace();
mutate("new-namespace"); // UI updates immediately
```

### ✨ **Background Refetching**

Stale data refetches automatically in the background.

### ✨ **Prefetching**

Server-side prefetching for instant page loads:

- No loading spinners on initial render
- Better SEO with server-rendered data
- Smooth user experience

### ✨ **Error Handling**

Built-in error handling with `ApiError` class:

```tsx
try {
  await uploadMutation.mutateAsync({ file, namespaceId, settings });
} catch (error) {
  if (error instanceof ApiError) {
    if (error.isNotFound()) {
      toast.error("Namespace not found");
    }
  }
}
```

### ✨ **Streaming Support**

Real-time chat streaming:

```tsx
const { sendStreamingMessage } = useChat({
  mode: "namespace",
  namespace: "ns1",
  onMessage: (msg) => setMessages((prev) => [...prev, msg]),
});

await sendStreamingMessage("Hello", settings);
```

### ✨ **DevTools**

React Query DevTools shows:

- All queries and their state
- Cache contents
- Query refetch status
- Network activity

Access at: `http://localhost:3000` (bottom-left icon)

## API Client Methods

### Namespaces

```tsx
apiClient.getNamespaces();
apiClient.getNamespace(id);
apiClient.createNamespace(name);
apiClient.deleteNamespace(id);
```

### Documents

```tsx
apiClient.getDocuments(namespaceId?)
apiClient.getDocument(id)
apiClient.uploadDocument(file, namespaceId, settings)
apiClient.deleteDocument(id)
```

### Chat

```tsx
apiClient.sendMessage(message, settings);
apiClient.streamChat(message, settings); // Returns ReadableStream
```

## React Query Hooks

### Queries (GET)

```tsx
useNamespaces(); // Get all namespaces
useNamespace(id); // Get single namespace
useDocuments(namespaceId); // Get documents for namespace
useDocument(id); // Get single document
```

### Mutations (POST/PUT/DELETE)

```tsx
useCreateNamespace(); // Create namespace
useDeleteNamespace(); // Delete namespace
useUploadDocument(); // Upload document
useDeleteDocument(); // Delete document
useChat(); // Send chat message
```

## Query Keys

Organized hierarchically for efficient invalidation:

```typescript
namespaceKeys.all; // ['namespaces']
namespaceKeys.lists(); // ['namespaces', 'list']
namespaceKeys.detail(id); // ['namespaces', 'detail', id]

documentKeys.all; // ['documents']
documentKeys.lists(); // ['documents', 'list']
documentKeys.list(nsId); // ['documents', 'list', nsId]
documentKeys.detail(id); // ['documents', 'detail', id]
```

## Next Steps

1. **Connect to Real Backend**

   - Update `.env.local` with your API URL
   - Ensure FastAPI endpoints match the structure in `BACKEND-REQUIREMENTS.md`

2. **Update Your Pages**

   - Replace mock data with React Query hooks
   - Add prefetching to server components
   - Remove manual state management

3. **Test the Integration**

   - Open React Query DevTools
   - Watch queries refetch automatically
   - Test optimistic updates
   - Try error scenarios

4. **Add Toast Notifications**
   - Install a toast library (e.g., `sonner` or `react-hot-toast`)
   - Show success/error messages on mutations

## Example: Converting Existing Page

**Before (with mock data):**

```tsx
"use client";
const [namespaces, setNamespaces] = useState(mockNamespaces);
```

**After (with React Query):**

```tsx
"use client";
const { data: namespaces = [] } = useNamespaces();
```

That's it! React Query handles fetching, caching, and refetching automatically.

## Troubleshooting

### Query not fetching?

- Check if `enabled` option is set correctly
- Verify API URL in `.env.local`
- Check Network tab for CORS errors

### Data not updating after mutation?

- Verify `queryClient.invalidateQueries()` is called
- Check query keys match exactly

### Prefetching not working?

- Ensure server component uses `await`
- Check `HydrationBoundary` wraps client component
- Verify `dehydrate(queryClient)` is passed

## Resources

- [React Query Docs](https://tanstack.com/query/latest/docs/react/overview)
- [Next.js App Router Docs](https://nextjs.org/docs/app)
- [FastAPI CORS](https://fastapi.tiangolo.com/tutorial/cors/)
