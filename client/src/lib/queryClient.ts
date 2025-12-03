import { QueryClient, QueryFunction, MutationCache, QueryCache } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

// Cache configuration for better performance
const STALE_TIME = {
  // Data that changes frequently
  alerts: 30 * 1000, // 30 seconds
  tasks: 60 * 1000, // 1 minute
  
  // Data that changes less frequently  
  households: 2 * 60 * 1000, // 2 minutes
  positions: 5 * 60 * 1000, // 5 minutes (prices update on server)
  
  // Reference data (rarely changes)
  universalHoldings: 10 * 60 * 1000, // 10 minutes
  portfolios: 5 * 60 * 1000, // 5 minutes
  user: 30 * 60 * 1000, // 30 minutes
};

// Helper to get stale time based on query key
function getStaleTime(queryKey: readonly unknown[]): number {
  const key = String(queryKey[0]);
  
  if (key.includes('/alerts')) return STALE_TIME.alerts;
  if (key.includes('/tasks')) return STALE_TIME.tasks;
  if (key.includes('/households')) return STALE_TIME.households;
  if (key.includes('/positions')) return STALE_TIME.positions;
  if (key.includes('/universal-holdings')) return STALE_TIME.universalHoldings;
  if (key.includes('/portfolios')) return STALE_TIME.portfolios;
  if (key.includes('/auth/user')) return STALE_TIME.user;
  
  // Default: 2 minutes
  return 2 * 60 * 1000;
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      // Global error handling for queries
      console.error('Query error:', error);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      // Global error handling for mutations
      console.error('Mutation error:', error);
    },
  }),
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      // Dynamic stale time based on data type
      staleTime: 2 * 60 * 1000, // 2 minutes default
      gcTime: 10 * 60 * 1000, // Keep unused data in cache for 10 minutes
      retry: (failureCount, error) => {
        // Don't retry on auth errors
        if (error instanceof Error && error.message.includes('401')) {
          return false;
        }
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    },
    mutations: {
      retry: false,
      // Optimistic update helper - mutations can use this
      onMutate: async () => {
        // Can be overridden per-mutation for optimistic updates
      },
    },
  },
});

/**
 * Helper for optimistic updates
 * Usage in mutations:
 * 
 * const mutation = useMutation({
 *   mutationFn: updateAlert,
 *   ...createOptimisticUpdate(
 *     ['/api/alerts'],
 *     (old, newData) => old.map(a => a.id === newData.id ? {...a, ...newData} : a)
 *   )
 * });
 */
export function createOptimisticUpdate<TData, TVariables>(
  queryKey: readonly unknown[],
  updateFn: (oldData: TData, variables: TVariables) => TData
) {
  return {
    onMutate: async (variables: TVariables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });
      
      // Snapshot previous value
      const previousData = queryClient.getQueryData<TData>(queryKey);
      
      // Optimistically update
      if (previousData) {
        queryClient.setQueryData<TData>(queryKey, (old) => 
          old ? updateFn(old, variables) : old
        );
      }
      
      return { previousData };
    },
    onError: (_err: Error, _variables: TVariables, context: { previousData?: TData } | undefined) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },
    onSettled: () => {
      // Refetch to ensure server state
      queryClient.invalidateQueries({ queryKey });
    },
  };
}

/**
 * Prefetch helper for anticipated navigation
 */
export function prefetchQuery<T>(queryKey: readonly unknown[]) {
  return queryClient.prefetchQuery({
    queryKey,
    queryFn: getQueryFn<T>({ on401: "throw" }),
    staleTime: getStaleTime(queryKey),
  });
}
