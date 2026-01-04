// This is a SERVER COMPONENT that prefetches data
// Place this file at: app/dashboard-with-prefetch/page.tsx

import { HydrationBoundary, QueryClient, dehydrate } from "@tantml:react-query";
import { serverFetch } from "@/lib/api-client";
import { namespaceKeys } from "@/lib/hooks/use-namespaces";
import { documentKeys } from "@/lib/hooks/use-documents";
import DashboardClient from "./dashboard-client";

export default async function DashboardWithPrefetchPage() {
  // Create a new query client for this request
  const queryClient = new QueryClient();

  try {
    // Step 1: Prefetch namespaces
    await queryClient.prefetchQuery({
      queryKey: namespaceKeys.lists(),
      queryFn: () => serverFetch("/namespaces"),
    });

    // Step 2: Get the prefetched namespaces data
    const namespaces = queryClient.getQueryData(namespaceKeys.lists()) as any[];

    // Step 3: If we have namespaces, prefetch documents for the first one
    if (namespaces && namespaces.length > 0) {
      const firstNamespaceId = namespaces[0].id;

      await queryClient.prefetchQuery({
        queryKey: documentKeys.list(firstNamespaceId),
        queryFn: () =>
          serverFetch(`/documents?namespace_id=${firstNamespaceId}`),
      });
    }

    // Optional: Prefetch other data in parallel
    // await Promise.all([
    //   queryClient.prefetchQuery({
    //     queryKey: ['recent-documents'],
    //     queryFn: () => serverFetch('/documents/recent?limit=5'),
    //   }),
    //   queryClient.prefetchQuery({
    //     queryKey: ['stats'],
    //     queryFn: () => serverFetch('/stats'),
    //   }),
    // ]);
  } catch (error) {
    console.error("Prefetch error:", error);
    // Continue rendering even if prefetch fails
    // The client will fetch the data
  }

  // Dehydrate the query client state and pass it to the client component
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardClient />
    </HydrationBoundary>
  );
}

// Optional: Add loading.tsx in the same directory
// app/dashboard-with-prefetch/loading.tsx
// export default function Loading() {
//   return <div>Loading dashboard...</div>;
// }

// Optional: Add error.tsx for error handling
// app/dashboard-with-prefetch/error.tsx
// 'use client';
// export default function Error({ error, reset }) {
//   return (
//     <div>
//       <h2>Something went wrong!</h2>
//       <button onClick={reset}>Try again</button>
//     </div>
//   );
// }
