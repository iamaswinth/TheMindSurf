# React Query Prefetching Guide

## How Prefetching Works with React Query

React Query provides multiple prefetching strategies that work seamlessly with Next.js:

### 1. **Server-Side Prefetching (Recommended)**

Prefetch data on the server, then hydrate the client cache:

```tsx
// app/page.tsx (Server Component)
import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from "@tanstack/react-query";
import { serverFetch } from "@/lib/api-client";
import { namespaceKeys } from "@/lib/hooks/use-namespaces";
import { documentKeys } from "@/lib/hooks/use-documents";
import DashboardClient from "./dashboard-client";

export default async function DashboardPage() {
  const queryClient = new QueryClient();

  // Prefetch namespaces on server
  await queryClient.prefetchQuery({
    queryKey: namespaceKeys.lists(),
    queryFn: () => serverFetch("/namespaces"),
  });

  // Prefetch documents for first namespace
  const namespaces = queryClient.getQueryData(namespaceKeys.lists());
  if (namespaces && namespaces.length > 0) {
    await queryClient.prefetchQuery({
      queryKey: documentKeys.list(namespaces[0].id),
      queryFn: () => serverFetch(`/documents?namespace_id=${namespaces[0].id}`),
    });
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardClient />
    </HydrationBoundary>
  );
}
```

### 2. **Client-Side Prefetching**

Prefetch data on user interactions:

```tsx
// components/NamespaceCard.tsx
import { useQueryClient } from "@tanstack/react-query";
import { documentKeys } from "@/lib/hooks/use-documents";
import { apiClient } from "@/lib/api-client";

function NamespaceCard({ namespace }) {
  const queryClient = useQueryClient();

  // Prefetch documents when user hovers
  const prefetchDocuments = () => {
    queryClient.prefetchQuery({
      queryKey: documentKeys.list(namespace.id),
      queryFn: () => apiClient.getDocuments(namespace.id),
      staleTime: 60 * 1000, // 60 seconds
    });
  };

  return <div onMouseEnter={prefetchDocuments}>{namespace.name}</div>;
}
```

### 3. **Parallel Prefetching**

Prefetch multiple resources simultaneously:

```tsx
export default async function Page() {
  const queryClient = new QueryClient();

  // Prefetch multiple things at once
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: namespaceKeys.lists(),
      queryFn: () => serverFetch("/namespaces"),
    }),
    queryClient.prefetchQuery({
      queryKey: ["recent-documents"],
      queryFn: () => serverFetch("/documents/recent"),
    }),
    queryClient.prefetchQuery({
      queryKey: ["stats"],
      queryFn: () => serverFetch("/stats"),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>...</HydrationBoundary>
  );
}
```

### 4. **Conditional Prefetching**

Only prefetch what's needed:

```tsx
export default async function Page({ searchParams }) {
  const queryClient = new QueryClient();

  // Always prefetch namespaces
  await queryClient.prefetchQuery({
    queryKey: namespaceKeys.lists(),
    queryFn: () => serverFetch("/namespaces"),
  });

  // Conditionally prefetch documents if namespace selected
  if (searchParams.namespace) {
    await queryClient.prefetchQuery({
      queryKey: documentKeys.list(searchParams.namespace),
      queryFn: () =>
        serverFetch(`/documents?namespace_id=${searchParams.namespace}`),
    });
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>...</HydrationBoundary>
  );
}
```

### 5. **Background Refetching**

Keep data fresh in the background:

```tsx
function usePrefetchOnRoute() {
  const queryClient = useQueryClient();
  const router = useRouter();

  useEffect(() => {
    // Prefetch when route changes
    const prefetch = () => {
      queryClient.prefetchQuery({
        queryKey: namespaceKeys.lists(),
        queryFn: () => apiClient.getNamespaces(),
      });
    };

    router.events?.on("routeChangeStart", prefetch);
    return () => router.events?.off("routeChangeStart", prefetch);
  }, [queryClient, router]);
}
```

## Benefits

1. **Instant Data**: No loading spinners for prefetched data
2. **Better UX**: Smooth transitions between pages
3. **SEO**: Server-rendered data improves SEO
4. **Smart Caching**: React Query handles deduplication
5. **Automatic Revalidation**: Stale data refetches automatically

## Best Practices

1. ✅ Prefetch on server for initial page load
2. ✅ Prefetch on hover for anticipated navigation
3. ✅ Use parallel prefetching for independent data
4. ✅ Set appropriate staleTime values
5. ❌ Don't prefetch everything (waste of resources)
6. ❌ Don't prefetch user-specific data on server (unless authenticated)
