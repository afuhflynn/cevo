"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as React from "react";

// Query invalidation rule: every project mutation (duplicate, archive,
// unarchive) must invalidate ["dashboard", "projects"] and
// ["dashboard", "activity"] so the cached catalog and feed refetch.
// Server Actions also call revalidatePath for the RSC shell.
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
      },
    },
  });
}

let browserClient: QueryClient | undefined;

export function DashboardQueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [client] = React.useState(() => {
    if (typeof window === "undefined") return makeQueryClient();
    browserClient ??= makeQueryClient();
    return browserClient;
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
