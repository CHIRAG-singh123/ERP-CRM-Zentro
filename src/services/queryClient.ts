import { QueryClient } from '@tanstack/react-query';

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Performance optimizations
        refetchOnWindowFocus: false, // Don't refetch when window regains focus
        refetchOnMount: false, // Don't refetch on mount if data is fresh
        refetchOnReconnect: true, // Refetch when network reconnects
        retry: (failureCount, error) => {
          // Don't retry on 4xx errors (client errors)
          if (error && typeof error === 'object' && 'status' in error) {
            const status = (error as { status: number }).status;
            if (status >= 400 && status < 500) {
              return false;
            }
          }
          // Retry up to 2 times for network/server errors
          return failureCount < 2;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
        staleTime: 5 * 60 * 1000, // 5 minutes - data is fresh for 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes - keep unused data in cache for 10 minutes
        // Network mode for better offline handling
        networkMode: 'online',
        // Structural sharing to prevent unnecessary re-renders
        structuralSharing: true,
      },
      mutations: {
        retry: 0, // Don't retry mutations by default
        networkMode: 'online',
        // Optimistic updates can be enabled per mutation
      },
    },
  });
}

