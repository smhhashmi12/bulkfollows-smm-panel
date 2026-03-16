import React, { useEffect, useMemo, useState } from 'react';
import { adminAPI, Provider, Service as ApiService } from '../../lib/api';
import { useAdminServices, useUpdateService, useCreateService, useDeleteService } from '../../lib/useAdminServices';
import { isTimeoutError } from '../../lib/utils';

const statusColors: { [key: string]: string } = {
  active: 'bg-green-500/20 text-green-400',
  inactive: 'bg-red-500/20 text-red-400',
};

type ProviderServiceRow = {
  id: string;
  provider_id: string;
  provider_service_id: string;
  provider_rate: number;
  our_rate: number;
  min_quantity: number;
  max_quantity: number;
  status: 'active' | 'inactive';
  service_id: string | null;
  services?: {
    id: string;
    name: string;
    category: string;
    description: string | null;
    status: 'active' | 'inactive';
  } | null;
};

const PROVIDER_SERVICES_TIMEOUT_MS = 120000; // 2 minutes (was 60s)

// Make sure Service type always has required description
type Service = ApiService & { description: string };

const ServiceManagementPage: React.FC = () => {
  // React Query hooks for services data
  const { data: servicesData = [], isLoading: servicesLoading, error: servicesError, status: servicesStatus } = useAdminServices();
  const { mutate: updateSvc, isPending: updatePending } = useUpdateService();
  const { mutate: createSvc, isPending: createPending } = useCreateService();
  const { mutate: deleteSvc, isPending: deletePending } = useDeleteService();

  // Local state
  const [providers, setProviders] = useState<Provider[]>([]);
  const [providerServices, setProviderServices] = useState<ProviderServiceRow[]>([]);
  const [isLoadingProviderServices, setIsLoadingProviderServices] = useState(false);
  const [error, setError] = useState('');
  const [isReloading, setIsReloading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentService, setCurrentService] = useState<Service | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(updatePending || createPending);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [providerFilter, setProviderFilter] = useState('all'); // 'all' | 'manual' | provider_id
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [manageProviderId, setManageProviderId] = useState('all');
  const [syncCategoriesInput, setSyncCategoriesInput] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isSyncingProvider, setIsSyncingProvider] = useState(false);
  const [isApplyingCategoryFilter, setIsApplyingCategoryFilter] = useState(false);
  const [servicesTimeoutMessage, setServicesTimeoutMessage] = useState('');

  // Debounce search input to avoid excessive recalculations
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [search]);

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    rate_per_1000: 0,
    min_quantity: 0,
    max_quantity: 10000,
    status: 'active' as 'active' | 'inactive',
    description: '',
  });

  // Use services data from React Query instead of state
  const services = servicesData;

  useEffect(() => {
    console.log('ServiceManagement - React Query state:', {
      dataLength: servicesData?.length,
      isLoading: servicesLoading,
      error: servicesError,
      status: servicesStatus,
    });
  }, [servicesData?.length, servicesLoading, servicesError, servicesStatus]);

  useEffect(() => {
    if (!servicesLoading) {
      setServicesTimeoutMessage('');
      return;
    }

    const timer = setTimeout(() => {
      setServicesTimeoutMessage('Backend not reachable. Please ensure the server is running on port 4000.');
    }, 10000);

    return () => clearTimeout(timer);
  }, [servicesLoading]);

  const fetchProviderServices = async () => {
    setIsLoadingProviderServices(true);
    setError('');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PROVIDER_SERVICES_TIMEOUT_MS);

    try {
      // force a fresh fetch (avoid 304 cache hits)
      const url = `/api/integrations/provider-services?ts=${Date.now()}`;

      const response = await fetch(url, {
        signal: controller.signal,
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      });

      if (!response.ok) {
        throw new Error(`Provider services API returned ${response.status}`);
      }

      const payload = await response.json();
      const rows = Array.isArray(payload?.providerServices) ? payload.providerServices : [];
      setProviderServices(rows);
    } catch (err: any) {
      const isTimeout = err instanceof DOMException && err.name === 'AbortError';
      console.error('[admin/services] provider-services fetch failed:', err);

      if (isTimeout) {
        setError('Provider services request timed out. Please try again (or check server load).');
      } else {
        setError(`Failed to load provider services: ${err?.message ?? 'unknown error'}`);
      }
    } finally {
      clearTimeout(timeoutId);
      setIsLoadingProviderServices(false);
    }
  };

  // re-fetch provider-services when user changes the dropdown
  useEffect(() => {
    if (manageProviderId !== 'all') {
      fetchProviderServices();
    }
  }, [manageProviderId]);

  useEffect(() => {
    reloadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchProviders = async () => {
    const data = await adminAPI.getAllProviders();
    setProviders((data || []) as Provider[]);
  };

  const reloadAll = async () => {
    try {
      setError('');
      setIsReloading(true);
      // Services are now loaded via React Query automatically
      // Just fetch providers and provider services
      await Promise.all([fetchProviders(), fetchProviderServices()]);
    } catch (err: any) {
      const msg = isTimeoutError(err) ? 'Request timed out. Please refresh.' : 'Error fetching data';
      console.error('Error fetching data:', err);
      setError(msg);
    } finally {
      setIsReloading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name.includes('quantity') || name.includes('rate') ? parseFloat(value) || 0 : value,
    }));
  };
  const handleOpenModal = (service: Service | null = null) => {
    if (service) {
      setCurrentService(service);
      setFormData({
        name: service.name,
        category: service.category,
        rate_per_1000: service.rate_per_1000,
        min_quantity: service.min_quantity,
        max_quantity: service.max_quantity,
        status: service.status,
        description: service.description || '',
      });
    } else {
      setCurrentService(null);
      setFormData({
        name: '',
        category: '',
        rate_per_1000: 0,
        min_quantity: 0,
        max_quantity: 10000,
        status: 'active',
        description: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.min_quantity >= formData.max_quantity) {
      setError('Minimum quantity must be less than maximum quantity');
      return;
    }
    
    try {
      setError('');
      if (currentService) {
        // Update existing service using mutation hook
        updateSvc(
          { serviceId: currentService.id, updates: formData },
          {
            onSuccess: () => {
              setIsModalOpen(false);
              setCurrentService(null);
            },
            onError: (err: any) => {
              console.error('Error updating service:', err);
              setError('Failed to update service. Please try again.');
            },
          }
        );
      } else {
        // Create new service using mutation hook
        createSvc(formData as any, {
          onSuccess: () => {
            setIsModalOpen(false);
            setCurrentService(null);
          },
          onError: (err: any) => {
            console.error('Error creating service:', err);
            setError('Failed to create service. Please try again.');
          },
        });
      }
    } catch (err: any) {
      console.error('Error saving service:', err);
      setError('Failed to save service. Please try again.');
    }
  };

  const providerById = useMemo(() => {
    const map = new Map<string, Provider>();
    (providers || []).forEach((provider) => {
      map.set(String(provider.id), provider);
    });
    return map;
  }, [providers]);

  const serviceById = useMemo(() => {
    const map = new Map<string, Service>();
    (services || []).forEach((service) => {
      // Ensure description is always present (fallback to empty string if missing)
      map.set(String(service.id), { ...service, description: service.description ?? '' });
    });
    return map;
  }, [services]);

  const providerServicesByServiceId = useMemo(() => {
    const map = new Map<string, ProviderServiceRow[]>();
    (providerServices || []).forEach((row: ProviderServiceRow) => {
      const serviceId = String(row.service_id || '').trim();
      if (!serviceId) return;
      const existing = map.get(serviceId) || [];
      existing.push(row);
      map.set(serviceId, existing);
    });
    return map;
  }, [providerServices]);

  const categories = useMemo(() => {
    return Array.from(
      new Set(
        (services || [])
          .map((service) => String(service.category || '').trim())
          .filter((value) => value !== '')
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [services]);

  const providerCategories = useMemo(() => {
    if (manageProviderId === 'all') return [];
    const catSet = new Set<string>();
    providerServices.forEach((row: ProviderServiceRow) => {
      if (row.provider_id !== manageProviderId) return;
      const svc = row.service_id ? serviceById.get(String(row.service_id)) : null;
      const category = String(row.services?.category || svc?.category || '').trim();
      if (category) catSet.add(category);
    });
    const result = Array.from(catSet).sort((a, b) => a.localeCompare(b));
    console.log('[ServiceManagement] providerCategories updated:', {
      manageProviderId,
      providerServicesCount: providerServices.length,
      servicesCount: services.length,
      categoriesCount: result.length,
      categories: result,
    });
    return result;
  }, [manageProviderId, providerServices, serviceById, services.length]);

  useEffect(() => {
    if (manageProviderId === 'all') {
      setSelectedCategories((prev: string[]) => (prev.length === 0 ? prev : []));
      return;
    }
    setSelectedCategories((prev: string[]) => {
      if (prev.length === providerCategories.length && prev.every((value: string, idx: number) => value === providerCategories[idx])) {
        return prev;
      }
      return providerCategories;
    });
  }, [manageProviderId, providerCategories]);

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev: string[]) => (
      prev.includes(category) ? prev.filter((item: string) => item !== category) : [...prev, category]
    ));
  };

  const handleSyncProviderServices = async () => {
    if (manageProviderId === 'all') {
      setError('Select a provider to sync.');
      return;
    }
    setIsSyncingProvider(true);
    setError('');
    setIsReloading(true);
    try {
      const response = await fetch('/api/admin/sync-provider-services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_id: manageProviderId,
          category: syncCategoriesInput.trim() ? syncCategoriesInput.trim() : undefined,
          replace_existing: true,
        }),
      });
      const raw = await response.text();
      let payload: any = {};
      try {
        payload = raw ? JSON.parse(raw) : {};
      } catch {
        throw new Error('Sync API returned invalid JSON. Ensure server routes are deployed.');
      }
      if (!response.ok || !payload.success) {
        throw new Error(payload?.message || 'Failed to sync provider services');
      }
      setError('');
      await fetchProviderServices();
    } catch (err: any) {
      setError(err.message || 'Failed to sync provider services');
    } finally {
      setIsSyncingProvider(false);
      setIsReloading(false);
    }
  };

  const handleApplyCategoryFilter = async () => {
    if (manageProviderId === 'all') {
      setError('Select a provider first.');
      return;
    }
    if (selectedCategories.length === 0) {
      setError('Select at least one category to keep.');
      return;
    }
    setIsApplyingCategoryFilter(true);
    setError('');
    try {
      const response = await fetch('/api/admin/provider-services/filter-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_id: manageProviderId,
          categories: selectedCategories,
          replace_existing: true,
        }),
      });
      const raw = await response.text();
      let payload: any = {};
      try {
        payload = raw ? JSON.parse(raw) : {};
      } catch {
        throw new Error('Category filter API returned invalid JSON. Ensure server routes are deployed.');
      }
      if (!response.ok || !payload.success) {
        throw new Error(payload?.message || 'Failed to apply category filter');
      }
      await fetchProviderServices();
    } catch (err: any) {
      setError(err.message || 'Failed to apply category filter');
    } finally {
      setIsApplyingCategoryFilter(false);
    }
  };

  const filteredServices = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();

    const sorted = [...(services || [])].sort((a, b) => {
      const categoryCompare = String(a.category || '').localeCompare(String(b.category || ''), undefined, { sensitivity: 'base' });
      if (categoryCompare !== 0) return categoryCompare;
      const nameCompare = String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' });
      if (nameCompare !== 0) return nameCompare;
      return String(a.id).localeCompare(String(b.id));
    });

    const result = sorted.filter((service) => {
      if (statusFilter !== 'all' && service.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && service.category !== categoryFilter) return false;

      const mappings = providerServicesByServiceId.get(service.id) || [];
      if (providerFilter !== 'all') {
        if (providerFilter === 'manual') {
          if (mappings.length > 0) return false;
        } else if (!mappings.some((m) => m.provider_id === providerFilter)) {
          return false;
        }
      }

      if (!q) return true;

      const nameMatch = String(service.name || '').toLowerCase().includes(q);
      const categoryMatch = String(service.category || '').toLowerCase().includes(q);
      if (nameMatch || categoryMatch) return true;

      for (const mapping of mappings) {
        const providerName = String(providerById.get(mapping.provider_id)?.name || mapping.provider_id).toLowerCase();
        const providerServiceId = String(mapping.provider_service_id || '').toLowerCase();
        if (providerName.includes(q) || providerServiceId.includes(q)) return true;
      }

      return false;
    });

    // Avoid noisy logs on every render; rely on the effect-based logger above.
    return result;
  }, [services, statusFilter, categoryFilter, providerFilter, debouncedSearch, providerServicesByServiceId, providerById]);

  const totalPages = Math.max(1, Math.ceil(filteredServices.length / Math.max(1, pageSize)));
  const paginatedServices = useMemo(() => {
    const safePageSize = Math.max(1, pageSize);
    const safePage = Math.max(1, Math.min(page, totalPages));
    const start = (safePage - 1) * safePageSize;
    return filteredServices.slice(start, start + safePageSize);
  }, [filteredServices, page, pageSize, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, categoryFilter, providerFilter, statusFilter, pageSize]);

  const handleToggleStatus = async (service: Service) => {
    if (!confirm(`Are you sure you want to ${service.status === 'active' ? 'deactivate' : 'activate'} this service?`)) {
      return;
    }
    
    try {
      const newStatus = service.status === 'active' ? 'inactive' : 'active';
      updateSvc(
        { serviceId: service.id, updates: { ...service, status: newStatus } },
        {
          onError: (err: any) => {
            console.error('Error updating service status:', err);
            setError('Failed to update service status. Please try again.');
          },
        }
      );
    } catch (err: any) {
      console.error('Error updating service status:', err);
      setError('Failed to update service status. Please try again.');
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm('Are you sure you want to delete this service? This action cannot be undone.')) {
      return;
    }
    
    try {
      deleteSvc(serviceId, {
        onError: (err: any) => {
          console.error('Error deleting service:', err);
          setError('Failed to delete service. Please try again.');
        },
      });
    } catch (err: any) {
      console.error('Error deleting service:', err);
      setError('Failed to delete service. Please try again.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-brand-container border border-brand-border rounded-2xl p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Provider Service Manager</h2>
            <p className="text-xs text-gray-400">Sync services and keep only the categories you need.</p>
          </div>
          <div className="text-xs text-gray-400">
            Selected provider: <span className="text-white">{manageProviderId === 'all' ? 'None' : (providerById.get(manageProviderId)?.name || manageProviderId)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label htmlFor="provider-manager-provider" className="block text-xs text-gray-400 mb-1">Provider</label>
            <select
              id="provider-manager-provider"
              name="providerManagerProvider"
              value={manageProviderId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setManageProviderId(e.target.value)}
              className="w-full bg-black/20 border border-brand-border rounded-lg p-2 text-sm"
            >
              <option value="all">Select provider</option>
              {providers.map((provider: Provider) => (
                <option key={provider.id} value={provider.id}>{provider.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="provider-manager-sync-categories" className="block text-xs text-gray-400 mb-1">Sync Categories (optional)</label>
            <input
              id="provider-manager-sync-categories"
              name="providerManagerSyncCategories"
              value={syncCategoriesInput}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSyncCategoriesInput(e.target.value)}
              placeholder="instagram, youtube"
              className="w-full bg-black/20 border border-brand-border rounded-lg p-2 text-sm"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleSyncProviderServices}
              className="w-full px-3 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-sm disabled:opacity-60"
              disabled={isSyncingProvider}
            >
              {isSyncingProvider ? 'Syncing...' : 'Sync Provider Services'}
            </button>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleApplyCategoryFilter}
              className="w-full px-3 py-2 rounded-lg bg-gradient-to-r from-brand-accent to-brand-purple text-sm disabled:opacity-60"
              disabled={isApplyingCategoryFilter}
            >
              {isApplyingCategoryFilter ? 'Applying...' : 'Keep Selected Categories'}
            </button>
          </div>
        </div>

        {manageProviderId === 'all' ? (
          <p className="text-xs text-gray-400">Select a provider to manage categories.</p>
        ) : isLoadingProviderServices ? (
          <p className="text-xs text-gray-400">Loading categories for {providerById.get(manageProviderId)?.name || 'this provider'}...</p>
        ) : providerCategories.length === 0 ? (
          <p className="text-xs text-gray-400">No categories found. Sync provider services first or check if provider has services.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {providerCategories.map((cat: string) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className={`px-3 py-1 rounded-full text-xs border ${
                    selectedCategories.includes(cat)
                      ? 'bg-green-500/20 border-green-500/40 text-green-200'
                      : 'bg-black/20 border-brand-border text-gray-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:max-w-5xl lg:grid-cols-5">
          <div className="sm:col-span-2 lg:col-span-2">
            <label htmlFor="services-search" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">Search</label>
            <div className="relative">
              <input
                id="services-search"
                name="servicesSearch"
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                placeholder="Search services, categories, provider ids..."
                className="w-full ds-glass rounded-lg p-2 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple"
              />
              <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
          </div>

          <div>
            <label htmlFor="services-category-filter" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">Category</label>
            <select
              id="services-category-filter"
              name="servicesCategoryFilter"
              value={categoryFilter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCategoryFilter(e.target.value)}
              className="w-full bg-black/20 border border-brand-border rounded-lg p-2 focus:ring-2 focus:ring-brand-purple focus:outline-none text-sm"
            >
              <option value="all">All Categories</option>
              {categories.map((cat: string) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="services-provider-filter" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">Provider</label>
            <select
              id="services-provider-filter"
              name="servicesProviderFilter"
              value={providerFilter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setProviderFilter(e.target.value)}
              className="w-full bg-black/20 border border-brand-border rounded-lg p-2 focus:ring-2 focus:ring-brand-purple focus:outline-none text-sm"
            >
              <option value="all">All Providers</option>
              <option value="manual">Manual (No Provider)</option>
              {(providers || []).map((provider: Provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="services-status-filter" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">Status</label>
            <select
              id="services-status-filter"
              name="servicesStatusFilter"
              value={statusFilter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value as any)}
              className="w-full bg-black/20 border border-brand-border rounded-lg p-2 focus:ring-2 focus:ring-brand-purple focus:outline-none text-sm"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 lg:justify-end">
          <div className="hidden text-xs text-gray-400 lg:block">
            Showing <span className="font-semibold text-gray-200">{filteredServices.length}</span> / {services.length}
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="bg-gradient-to-r from-brand-accent to-brand-purple hover:opacity-90 text-white font-semibold px-4 py-2 rounded-lg"
          >
            Add New Service
          </button>
        </div>
      </div>
      
      {servicesTimeoutMessage && (
        <div className="mb-4 p-4 bg-amber-500/20 text-amber-300 rounded-lg">
          {servicesTimeoutMessage}
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-500/20 text-red-400 rounded-lg">
          {error}
        </div>
      )}
      
      <div className="bg-brand-container border border-brand-border rounded-2xl">
        <div className="max-h-[calc(100vh-18rem)] overflow-auto ds-scrollbar">
          {servicesLoading && services.length === 0 ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
              <p className="mt-2">Loading services...</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="sticky top-0 z-10 bg-black/40 backdrop-blur">
                <tr>
                  <th className="p-4 font-semibold">Name</th>
                  <th className="p-4 font-semibold">Category</th>
                  <th className="p-4 font-semibold">Provider</th>
                  <th className="p-4 font-semibold text-right">Rate (per 1k)</th>
                  <th className="p-4 font-semibold text-center">Min/Max</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {paginatedServices.length > 0 ? (
                  paginatedServices.map((service: Service) => {
                    const mappings = providerServicesByServiceId.get(service.id) || [];
                    const firstMapping = mappings[0];
                    const providerName = firstMapping ? (providerById.get(firstMapping.provider_id)?.name || firstMapping.provider_id) : '';
                    const providerCell = mappings.length === 0
                      ? 'Manual'
                      : `${providerName} · #${String(firstMapping?.provider_service_id || '').trim()}`;
                    const providerTitle = mappings.length === 0
                      ? 'Manual service (no provider link found).'
                      : mappings
                          .map((m: ProviderServiceRow) => {
                            const name = providerById.get(m.provider_id)?.name || m.provider_id;
                            return `${name} (#${m.provider_service_id})`;
                          })
                          .join(', ');

                    return (
                    <tr key={service.id} className="hover:bg-black/10">
                      <td className="p-4 font-medium">
                        <div className="max-w-[32rem] truncate" title={service.name}>
                          {service.name}
                        </div>
                      </td>
                      <td className="p-4 text-gray-300">
                        <div className="max-w-[16rem] truncate" title={service.category}>
                          {service.category}
                        </div>
                      </td>
                      <td className="p-4 text-gray-300">
                        <div className="max-w-[18rem] truncate" title={providerTitle}>
                          {providerCell}
                          {mappings.length > 1 ? (
                            <span className="ml-2 text-xs text-gray-500">+{mappings.length - 1}</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="p-4 font-mono text-right text-green-400">
                        ${service.rate_per_1000.toFixed(4)}
                      </td>
                      <td className="p-4 text-center text-gray-300 font-mono">
                        {service.min_quantity} / {service.max_quantity}
                      </td>
                      <td className="p-4">
                        <span 
                          className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[service.status] || 'bg-gray-500/20 text-gray-400'}`}
                        >
                          {service.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => handleOpenModal(service)}
                            className="text-blue-400 hover:text-white p-1 rounded hover:bg-blue-500/20"
                            title="Edit"
                            disabled={servicesLoading || updatePending}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                          </button>
                          <button 
                            onClick={() => handleToggleStatus(service)}
                            className={`p-1 rounded ${service.status === 'active' ? 'text-yellow-400 hover:bg-yellow-500/20' : 'text-green-400 hover:bg-green-500/20'}`}
                            title={service.status === 'active' ? 'Deactivate' : 'Activate'}
                            disabled={updatePending}
                          >
                            {service.status === 'active' ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.367zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            )}
                          </button>
                          <button 
                            onClick={() => handleDeleteService(service.id)}
                            className="text-red-400 hover:text-white p-1 rounded hover:bg-red-500/20"
                            title="Delete"
                            disabled={deletePending}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-400">
                      No services found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-gray-400">
          Showing{' '}
          <span className="font-semibold text-gray-200">
            {filteredServices.length === 0 ? 0 : (page - 1) * pageSize + 1}
          </span>
          -
          <span className="font-semibold text-gray-200">
            {Math.min(page * pageSize, filteredServices.length)}
          </span>{' '}
          of <span className="font-semibold text-gray-200">{filteredServices.length}</span> (total {services.length})
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={pageSize}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPageSize(Number(e.target.value) || 25)}
            className="bg-black/20 border border-brand-border rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-brand-purple focus:outline-none"
            aria-label="Rows per page"
          >
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </select>

          <button
            onClick={() => setPage((p: number) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 rounded-lg border border-brand-border bg-white/5 text-sm disabled:opacity-50 hover:bg-white/10"
          >
            Prev
          </button>
          <div className="px-2 text-sm text-gray-300">
            Page <span className="font-semibold text-white">{page}</span> / {totalPages}
          </div>
          <button
            onClick={() => setPage((p: number) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 rounded-lg border border-brand-border bg-white/5 text-sm disabled:opacity-50 hover:bg-white/10"
          >
            Next
          </button>

          <button
            onClick={() => reloadAll()}
            disabled={isReloading}
            className="ml-2 px-3 py-1.5 rounded-lg border border-brand-border bg-white/5 text-sm disabled:opacity-50 hover:bg-white/10"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Add/Edit Service Modal */}
      {isModalOpen && (
        <div className="fixed  inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="backdrop-filter: blur(var(--blur-md)) bg-brand-container border border-brand-border rounded-2xl p-6 w-full max-w-2xl">
            <h2 className="text-xl font-bold mb-4">
              {currentService ? 'Edit Service' : 'Add New Service'}
            </h2>
            
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label htmlFor="service-form-name" className="block text-sm font-medium mb-1">Service Name *</label>
                  <input
                    type="text"
                    id="service-form-name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full bg-black/20 border border-brand-border rounded-lg p-2 pl-10 focus:ring-2 focus:ring-brand-purple focus:outline-none text-sm"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="service-form-category" className="block text-sm font-medium mb-1">Category *</label>
                  <input
                    type="text"
                    id="service-form-category"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full bg-black/20 border border-brand-border rounded-lg p-2 pl-10 focus:ring-2 focus:ring-brand-purple focus:outline-none text-sm"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="service-form-rate" className="block text-sm font-medium mb-1">Rate per 1,000 *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <input
                      type="number"
                      id="service-form-rate"
                      name="rate_per_1000"
                      value={formData.rate_per_1000}
                      onChange={handleInputChange}
                      step="0.0001"
                      min="0"
                      className="w-full bg-black/20 border border-brand-border rounded-lg p-2 pl-10 focus:ring-2 focus:ring-brand-purple focus:outline-none text-sm"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="service-form-status" className="block text-sm font-medium mb-1">Status</label>
                  <select
                    id="service-form-status"
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full bg-black/20 border border-brand-border rounded-lg p-2 pl-10 focus:ring-2 focus:ring-brand-purple focus:outline-none text-sm"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="service-form-min" className="block text-sm font-medium mb-1">Minimum Quantity *</label>
                  <input
                    type="number"
                    id="service-form-min"
                    name="min_quantity"
                    value={formData.min_quantity}
                    onChange={handleInputChange}
                    min="0"
                    className="w-full bg-black/20 border border-brand-border rounded-lg p-2 pl-10 focus:ring-2 focus:ring-brand-purple focus:outline-none text-sm"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="service-form-max" className="block text-sm font-medium mb-1">Maximum Quantity *</label>
                  <input
                    type="number"
                    id="service-form-max"
                    name="max_quantity"
                    value={formData.max_quantity}
                    onChange={handleInputChange}
                    min={formData.min_quantity + 1}
                    className="w-full bg-black/20 border border-brand-border rounded-lg p-2 pl-10 focus:ring-2 focus:ring-brand-purple focus:outline-none text-sm"
                    required
                  />
                </div>
              </div>
              
              <div className="mb-6">
                <label htmlFor="service-form-description" className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  id="service-form-description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full bg-black/20 border border-brand-border rounded-lg p-2 pl-10 focus:ring-2 focus:ring-brand-purple focus:outline-none text-sm"
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-brand-border rounded-lg hover:bg-black/20"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {currentService ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>{currentService ? 'Update Service' : 'Create Service'}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default ServiceManagementPage;
