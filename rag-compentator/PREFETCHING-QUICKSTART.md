# Quick Start: React Query + Prefetching

## Yes, React Query fully supports prefetching! 🚀

React Query has **excellent** prefetching capabilities with multiple strategies:

## 1. **Server-Side Prefetching** (Recommended for Next.js)

Prefetch data on the server, then hydrate the client cache for instant UI:

```tsx
// ✅ BEST PRACTICE: Server Component with Prefetch
import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from "@tanstack/react-query";

export default async function Page() {
  const queryClient = new QueryClient();

  // Prefetch on server - NO loading spinner on client!
  await queryClient.prefetchQuery({
    queryKey: ["namespaces"],
    queryFn: () => serverFetch("/namespaces"),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ClientComponent /> {/* Gets instant data */}
    </HydrationBoundary>
  );
}
```

**Benefits:**

- ✅ Zero loading state on initial render
- ✅ Better SEO (data rendered on server)
- ✅ Faster perceived performance
- ✅ Automatic cache hydration

## 2. **Client-Side Prefetching** (For User Interactions)

Prefetch before user navigates:

```tsx
"use client";
import { useQueryClient } from "@tanstack/react-query";

function NamespaceCard({ namespace }) {
  const queryClient = useQueryClient();

  // Prefetch on hover - instant when clicked!
  const handleHover = () => {
    queryClient.prefetchQuery({
      queryKey: ["documents", namespace.id],
      queryFn: () => apiClient.getDocuments(namespace.id),
      staleTime: 60_000, // Cache for 60 seconds
    });
  };

  return <div onMouseEnter={handleHover}>...</div>;
}
```

## 3. **Parallel Prefetching**

Prefetch multiple things at once:

```tsx
await Promise.all([
  queryClient.prefetchQuery({
    queryKey: ["namespaces"],
    queryFn: () => serverFetch("/namespaces"),
  }),
  queryClient.prefetchQuery({
    queryKey: ["recent-docs"],
    queryFn: () => serverFetch("/documents/recent"),
  }),
  queryClient.prefetchQuery({
    queryKey: ["stats"],
    queryFn: () => serverFetch("/stats"),
  }),
]);
```

## 4. **Dependent Prefetching**

Prefetch based on other data:

```tsx
// First prefetch namespaces
await queryClient.prefetchQuery({
  queryKey: ["namespaces"],
  queryFn: () => serverFetch("/namespaces"),
});

// Get the data we just prefetched
const namespaces = queryClient.getQueryData(["namespaces"]);

// Then prefetch documents for first namespace
if (namespaces?.length > 0) {
  await queryClient.prefetchQuery({
    queryKey: ["documents", namespaces[0].id],
    queryFn: () => serverFetch(`/documents?namespace_id=${namespaces[0].id}`),
  });
}
```

## 5. **Prefetch on Route Change**

```tsx
"use client";
function usePrefetchOnRoute() {
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleRouteChange = () => {
      // Prefetch data for common routes
      queryClient.prefetchQuery({
        queryKey: ["namespaces"],
        queryFn: () => apiClient.getNamespaces(),
      });
    };

    router.events?.on("routeChangeStart", handleRouteChange);
    return () => router.events?.off("routeChangeStart", handleRouteChange);
  }, [router, queryClient]);
}
```

## Complete Example

### Server Component (Prefetch):

```tsx
// app/dashboard/page.tsx
import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from "@tanstack/react-query";
import { serverFetch } from "@/lib/api-client";
import DashboardClient from "./dashboard-client";

export default async function DashboardPage() {
  const queryClient = new QueryClient();

  // Prefetch namespaces
  await queryClient.prefetchQuery({
    queryKey: ["namespaces"],
    queryFn: () => serverFetch("/namespaces"),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardClient />
    </HydrationBoundary>
  );
}
```

### Client Component (Use Data):

```tsx
// app/dashboard/dashboard-client.tsx
"use client";
import { useNamespaces } from "@/lib/hooks/use-namespaces";

export default function DashboardClient() {
  // This will use prefetched data instantly - NO loading state!
  const { data: namespaces = [] } = useNamespaces();

  return (
    <div>
      {namespaces.map((ns) => (
        <div key={ns.id}>{ns.name}</div>
      ))}
    </div>
  );
}
```

## Prefetch Options

```tsx
queryClient.prefetchQuery({
  queryKey: ["key"],
  queryFn: fetchFunction,

  // Options:
  staleTime: 60_000, // How long data stays fresh
  gcTime: 5 * 60_000, // How long unused data stays in cache
  retry: 1, // Retry on error
});
```

## When to Prefetch?

| Strategy            | Use When                  | Example                 |
| ------------------- | ------------------------- | ----------------------- |
| Server prefetch     | Initial page load         | Dashboard, list pages   |
| Hover prefetch      | User likely to navigate   | Cards, links            |
| Parallel prefetch   | Multiple independent data | Dashboard sections      |
| Route prefetch      | Route transitions         | Navigation menu items   |
| Background prefetch | Anticipate user needs     | Next page in pagination |

## Benefits of Prefetching

1. **Zero Loading States** - Data available instantly
2. **Better UX** - Smooth, fast interactions
3. **SEO Improvement** - Server-rendered content
4. **Reduced Perceived Latency** - Data ready before needed
5. **Smart Caching** - React Query handles deduplication

## Common Patterns

### Pattern 1: Dashboard with Related Data

```tsx
// Prefetch main data + first item's details
await queryClient.prefetchQuery(["namespaces"], fetchNamespaces);
const namespaces = queryClient.getQueryData(["namespaces"]);
if (namespaces[0]) {
  await queryClient.prefetchQuery(["documents", namespaces[0].id], fetchDocs);
}
```

### Pattern 2: List with Details on Hover

```tsx
<Card onMouseEnter={() => prefetchDetails(item.id)}>{item.name}</Card>
```

### Pattern 3: Pagination

```tsx
// Prefetch next page
queryClient.prefetchQuery(["items", page + 1], () => fetchItems(page + 1));
```

## Answer: YES! React Query + Prefetching = ✅✅✅

React Query has **first-class prefetching support** and it's one of its most powerful features. Combined with Next.js App Router, you get:

- ✅ Server-side prefetching
- ✅ Client-side prefetching
- ✅ Automatic cache hydration
- ✅ Smart deduplication
- ✅ Background refetching
- ✅ Stale-while-revalidate

It's the **best way** to handle data fetching in modern React apps!
