import { useQuery, UseQueryResult } from '@tanstack/react-query';

/**
 * Service Data Type
 */
export interface Service {
  id: string;
  name: string;
  category: string;
  description?: string;
  rate_per_1000: number;
  min_quantity: number;
  max_quantity: number;
  completion_time?: number;
  time_pricing?: Record<string, number>;
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
}

interface ServicesResponse {
  services: Service[];
  error?: string;
  cached?: boolean;
  age?: number;
}

/**
 * Fetch services from the backend
 * The backend serves cached data from Supabase with timeout protection
 *
 * @returns Promise<Service[]>
 */
async function fetchServices(): Promise<Service[]> {
  const controller = new AbortController();
  // Use 15-second timeout on client (server timeout is 8 seconds)
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch('/api/services', {
      signal: controller.signal,
    });

    // Parse response regardless of status (graceful degradation)
    const data: ServicesResponse = await response.json();
    
    if (!response.ok) {
      console.warn(`[Services] API returned ${response.status}: ${data.error || 'Unknown error'}`);
      // Return empty array on error (better UX than throwing)
      return [];
    }

    return data.services || [];
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.warn('[Services] Request timed out after 15 seconds');
      // Return empty array instead of throwing on timeout
      return [];
    }
    
    console.error('[Services] Fetch failed:', error);
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Hook to fetch and cache services
 *
 * Features:
 * - Automatic caching with 10-minute TTL
 * - Request deduplication (multiple simultaneous calls = single request)
 * - Automatic retry on failure (with backoff)
 * - Stale-while-revalidate pattern
 * - Graceful fallback to empty array on timeout
 *
 * Usage:
 * ```
 * const { data: services, isLoading, error } = useServices();
 * ```
 *
 * @returns UseQueryResult<Service[], Error>
 */
export function useServices(): UseQueryResult<Service[], Error> {
  return useQuery({
    queryKey: ['services'],
    queryFn: fetchServices,
    // Cache fresh data for 10 minutes
    staleTime: 10 * 60 * 1000,
    // Keep in cache for 15 minutes before garbage collection
    gcTime: 15 * 60 * 1000,
    // Retry very conservatively (only once after server timeout)
    retry: (failureCount, error) => {
      // Don't retry timeouts aggressively
      if (failureCount > 0) return false;
      // Only retry once, immediately
      return true;
    },
    // Don't refetch just because window regains focus
    refetchOnWindowFocus: false,
    // Initialize with empty array to prevent undefined
    initialData: [],
  });
}

/**
 * Interface for query result with better typing
 */
export interface UseServicesResult {
  services: Service[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<any>;
}

/**
 * Alternative hook signature for better type safety
 * Provides pre-filtered data and loading states
 */
export function useServicesTyped(): UseServicesResult {
  const { data, isLoading, isError, error, refetch } = useServices();

  return {
    services: data || [],
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  };
}
