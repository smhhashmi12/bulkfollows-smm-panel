import { queryClient } from './QueryClientProvider';
import { Service } from './useServices';

/**
 * Cache Prefetching Utility
 *
 * Provides helper functions to preload data into React Query cache
 * before components that use them are rendered.
 *
 * Usage:
 * ```
 * await prefetchServices();
 * // Now when useServices() is called, data will be instant
 * ```
 */

/**
 * Prefetch services data before components need it
 *
 * This is useful when:
 * - User navigates to a page that needs services
 * - Anticipating a user action that will fetch services
 * - Initial page load optimization
 *
 * @returns Promise<void>
 */
export async function prefetchServices(): Promise<void> {
  await queryClient.prefetchQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const response = await fetch('/api/services');
      if (!response.ok) {
        throw new Error('Failed to prefetch services');
      }
      const data = await response.json();
      return data.services || [];
    },
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Prefetch admin services
 *
 * Loads all services (including inactive) for admin dashboard
 *
 * @returns Promise<void>
 */
export async function prefetchAdminServices(): Promise<void> {
  await queryClient.prefetchQuery({
    queryKey: ['adminServices'],
    queryFn: async () => {
      const response = await fetch('/api/admin/services');
      if (!response.ok) {
        throw new Error('Failed to prefetch admin services');
      }
      const data = await response.json();
      return data.services || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Set services data directly in cache
 *
 * Useful for optimistic updates or when you have fresh data
 * from another source
 *
 * @param services - Array of services to cache
 */
export function setCachedServices(services: Service[]): void {
  queryClient.setQueryData(['services'], services);
}

/**
 * Set admin services data directly in cache
 *
 * @param services - Array of services to cache
 */
export function setCachedAdminServices(services: Service[]): void {
  queryClient.setQueryData(['adminServices'], services);
}

/**
 * Invalidate services cache to force refetch
 *
 * Use after mutations that affect services
 *
 * @returns Promise<void>
 */
export async function invalidateServicesCache(): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: ['services'] });
}

/**
 * Invalidate admin services cache
 *
 * @returns Promise<void>
 */
export async function invalidateAdminServicesCache(): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: ['adminServices'] });
}

/**
 * Get cached services without triggering a refetch
 *
 * Returns null if not cached or cache is stale
 *
 * @returns Cached services or null
 */
export function getCachedServices(): Service[] | null {
  return queryClient.getQueryData(['services']) as Service[] | null;
}

/**
 * Get cached admin services
 *
 * @returns Cached services or null
 */
export function getCachedAdminServices(): Service[] | null {
  return queryClient.getQueryData(['adminServices']) as Service[] | null;
}

/**
 * Prefetch multiple data sets in parallel
 *
 * Optimizes loading for pages that need multiple data sources
 *
 * Usage:
 * ```
 * await prefetchPageData('admin-dashboard', ['services', 'providers']);
 * ```
 *
 * @param pageName - Name of page for logging
 * @param dataToFetch - Array of data types to prefetch
 * @returns Promise<void>
 */
export async function prefetchPageData(
  pageName: string,
  dataToFetch: Array<'services' | 'admin-services'>
): Promise<void> {
  console.log(`[Prefetch] Preloading data for ${pageName}:`, dataToFetch);

  const tasks = dataToFetch.map((dataType) => {
    switch (dataType) {
      case 'services':
        return prefetchServices();
      case 'admin-services':
        return prefetchAdminServices();
      default:
        return Promise.resolve();
    }
  });

  await Promise.all(tasks);
  console.log(`[Prefetch] Completed prefetching for ${pageName}`);
}

/**
 * Get cache statistics for debugging
 *
 * Shows what data is currently cached
 *
 * @returns Cache statistics object
 */
export function getCacheStats() {
  return {
    services: queryClient.getQueryData(['services']) ? 'cached' : 'not cached',
    adminServices: queryClient.getQueryData(['adminServices']) ? 'cached' : 'not cached',
    timestamp: new Date().toISOString(),
  };
}
