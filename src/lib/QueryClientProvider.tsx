import React from 'react';
import { QueryClient, QueryClientProvider as TanStackQueryClientProvider } from '@tanstack/react-query';

// Create a client for the app to use
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache successful queries for 10 minutes by default
      staleTime: 10 * 60 * 1000,
      // Keep unused data in the cache for 15 minutes
      gcTime: 15 * 60 * 1000,
      // Retry failed requests once with exponential backoff
      retry: 1,
      // Don't refetch on window focus by default
      refetchOnWindowFocus: false,
      // Don't refetch on component mount if data is fresh
      refetchOnMount: false,
    },
  },
});

interface QueryClientProviderProps {
  children: React.ReactNode;
}

/**
 * QueryClientProvider Component
 *
 * Wraps the application with React Query's client provider.
 * Enables automatic caching, deduplication, and background synchronization
 * of server data across the entire application.
 *
 * Features:
 * - Automatic request deduplication
 * - Built-in cache management
 * - Background refetching
 * - Optimistic updates support
 * - Devtools support for debugging
 */
export const QueryClientProvider: React.FC<QueryClientProviderProps> = ({ children }) => {
  return (
    <TanStackQueryClientProvider client={queryClient}>
      {children}
    </TanStackQueryClientProvider>
  );
};

/**
 * Export queryClient for manual operations (prefetching, cache manipulation, etc.)
 */
export { queryClient };
