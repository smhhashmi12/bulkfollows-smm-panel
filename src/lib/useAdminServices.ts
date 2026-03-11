import { useQuery, UseMutationResult, useMutation, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { Service } from './useServices';

interface AdminServicesResponse {
  services: Service[];
  error?: string;
  cached?: boolean;
  age?: number;
}

/**
 * Fetch all services with admin access
 * This endpoint requires admin authentication
 *
 * @returns Promise<Service[]>
 */
async function fetchAdminServices(): Promise<Service[]> {
  const controller = new AbortController();
  // Use 15-second timeout (server timeout is 8 seconds)
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch('/api/admin/services', {
      signal: controller.signal,
    });

    console.log('[Admin Services] Response status:', response.status);
    // Parse response regardless of status
    const data: AdminServicesResponse = await response.json();
    console.log('[Admin Services] Response data:', data);
    
    if (!response.ok) {
      console.warn(`[Admin Services] API returned ${response.status}: ${data.error || 'Unknown error'}`);
      return [];
    }

    console.log('[Admin Services] Returning services:', data.services?.length);
    return data.services || [];
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.warn('[Admin Services] Request timed out after 15 seconds');
      return [];
    }
    
    console.error('[Admin Services] Fetch failed:', error);
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Hook to fetch and cache admin services
 *
 * Used in admin dashboard for service management
 * Features:
 * - Separate cache key from user services
 * - Admin-specific cache invalidation
 * - Supports mutations (create, update, delete)
 * - Shorter TTL for more frequent changes
 * - Graceful timeout handling
 *
 * @returns UseQueryResult<Service[], Error>
 */
export function useAdminServices(): UseQueryResult<Service[], Error> {
  return useQuery({
    queryKey: ['adminServices'],
    queryFn: fetchAdminServices,
    staleTime: 0, // Disable caching to force fresh data
    gcTime: 0, // Disable garbage time cache
    retry: false, // Disable retries to see the actual result
    refetchOnWindowFocus: true, // Enable refetch on focus
    // Remove initialData to see if query is actually running
  });
}

/**
 * Update a service (admin operation)
 *
 * @param serviceId - ID of service to update
 * @param updates - Partial service data to update
 * @returns Promise<Service>
 */
export async function updateService(
  serviceId: string,
  updates: Partial<Service>
): Promise<Service> {
  const response = await fetch(`/api/admin/services/${serviceId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    throw new Error(`Failed to update service: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Create a new service (admin operation)
 *
 * @param service - Service data to create
 * @returns Promise<Service>
 */
export async function createService(service: Omit<Service, 'id'>): Promise<Service> {
  const response = await fetch('/api/admin/services', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(service),
  });

  if (!response.ok) {
    throw new Error(`Failed to create service: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Delete a service (admin operation)
 *
 * @param serviceId - ID of service to delete
 */
export async function deleteService(serviceId: string): Promise<void> {
  const response = await fetch(`/api/admin/services/${serviceId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`Failed to delete service: ${response.statusText}`);
  }
}

/**
 * Hook for mutating services with automatic cache invalidation
 *
 * Usage:
 * ```
 * const { mutate: updateSvc } = useUpdateService();
 * updateSvc({ serviceId: '123', updates: { status: 'inactive' } });
 * ```
 */
export function useUpdateService(): UseMutationResult<Service, Error, { serviceId: string; updates: Partial<Service> }> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ serviceId, updates }) => updateService(serviceId, updates),
    onSuccess: () => {
      // Invalidate admin services cache to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['adminServices'] });
      // Also invalidate user services cache
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });
}

/**
 * Hook for creating services with automatic cache invalidation
 */
export function useCreateService(): UseMutationResult<Service, Error, Omit<Service, 'id'>> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createService,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminServices'] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });
}

/**
 * Hook for deleting services with automatic cache invalidation
 */
export function useDeleteService(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteService,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminServices'] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
    },
  });
}
