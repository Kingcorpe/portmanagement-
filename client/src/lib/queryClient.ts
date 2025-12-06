import { QueryClient, QueryFunction, MutationCache, QueryCache } from "@tanstack/react-query";

// Custom error class to carry compliance details
export class ApiError extends Error {
  status: number;
  complianceErrors?: string[];
  complianceWarnings?: string[];
  details?: Record<string, unknown>;
  
  constructor(
    message: string, 
    status: number, 
    complianceErrors?: string[], 
    complianceWarnings?: string[],
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.complianceErrors = complianceErrors;
    this.complianceWarnings = complianceWarnings;
    this.details = details;
  }
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = await res.text();
    
    // Try to parse as JSON for structured errors (like compliance)
    try {
      const json = JSON.parse(text);
      
      // Handle compliance errors specially
      if (json.complianceErrors && Array.isArray(json.complianceErrors)) {
        const message = json.complianceErrors.join('\n');
        throw new ApiError(
          message, 
          res.status, 
          json.complianceErrors, 
          json.complianceWarnings,
          json.details
        );
      }
      
      // Regular JSON error
      throw new ApiError(json.message || text || res.statusText, res.status);
    } catch (e) {
      if (e instanceof ApiError) throw e;
      // Not JSON, use text
      throw new ApiError(text || res.statusText, res.status);
    }
  }
}

// CRITICAL FIX #2: CSRF token cache
let csrfTokenCache: string | null = null;
let csrfTokenPromise: Promise<string> | null = null;

async function getCsrfToken(): Promise<string> {
  // Return cached token if available
  if (csrfTokenCache) {
    return csrfTokenCache;
  }
  
  // If already fetching, return the existing promise
  if (csrfTokenPromise) {
    return csrfTokenPromise;
  }
  
  // Fetch new token
  csrfTokenPromise = fetch('/api/csrf-token', {
    credentials: 'include',
  })
    .then(res => res.json())
    .then(data => {
      csrfTokenCache = data.csrfToken;
      csrfTokenPromise = null;
      return data.csrfToken;
    })
    .catch(error => {
      csrfTokenPromise = null;
      console.error('Failed to fetch CSRF token:', error);
      // Return empty string to allow request to proceed (will fail server-side if CSRF is required)
      return '';
    });
  
  return csrfTokenPromise;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // CRITICAL FIX #2: Include CSRF token for state-changing requests
  const isStateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
  const csrfToken = isStateChanging ? await getCsrfToken() : null;
  
  const headers: Record<string, string> = {};
  if (data) {
    headers['Content-Type'] = 'application/json';
  }
  if (csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
  }
  
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  // If CSRF token expired, clear cache and retry once
  if (res.status === 403 && isStateChanging && csrfToken) {
    csrfTokenCache = null;
    const newCsrfToken = await getCsrfToken();
    if (newCsrfToken && newCsrfToken !== csrfToken) {
      headers['X-CSRF-Token'] = newCsrfToken;
      const retryRes = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
        credentials: "include",
      });
      await throwIfResNotOk(retryRes);
      return retryRes;
    }
  }

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
