import React, { useEffect, useMemo, useState } from 'react';
import { adminAPI } from '../../lib/api';

interface Provider {
  id: string;
  name: string;
}

interface ProviderServiceRow {
  id: string;
  provider_id: string;
  service_id: string;
  provider_service_id: string;
  provider_rate: number;
  our_rate: number;
  min_quantity: number;
  max_quantity: number;
  status: 'active' | 'inactive';
  providers?: { id: string; name: string } | { id: string; name: string }[];
  services?: { id: string; name: string; category: string; status: 'active' | 'inactive' } | { id: string; name: string; category: string; status: 'active' | 'inactive' }[];
}

const asEmbedded = <T,>(value: T | T[] | null | undefined): T | undefined => {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
};

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const ProviderMarginManager: React.FC = () => {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [providerServices, setProviderServices] = useState<ProviderServiceRow[]>([]);
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [providerMarginType, setProviderMarginType] = useState<'percent' | 'fixed'>('percent');
  const [providerMarginValue, setProviderMarginValue] = useState<number>(25);

  const [comparisonServiceId, setComparisonServiceId] = useState<string>('');
  const [comparisonSort, setComparisonSort] = useState<string>('cost');
  const [comparison, setComparison] = useState<any>(null);
  const [competitorPrices, setCompetitorPrices] = useState<any[]>([]);
  const [syncingProvider, setSyncingProvider] = useState(false);
  const [syncCategories, setSyncCategories] = useState('');

  const filteredServices = useMemo(() => {
    const q = search.trim().toLowerCase();
    return providerServices.filter((row) => {
      if (providerFilter !== 'all' && row.provider_id !== providerFilter) return false;
      if (!q) return true;
      const providerName = (asEmbedded(row.providers)?.name || '').toLowerCase();
      const serviceName = (asEmbedded(row.services)?.name || '').toLowerCase();
      const providerServiceId = String(row.provider_service_id || '').toLowerCase();
      return providerName.includes(q) || serviceName.includes(q) || providerServiceId.includes(q);
    });
  }, [providerServices, providerFilter, search]);

  const uniqueServices = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    providerServices.forEach((row) => {
      const svc = asEmbedded(row.services);
      if (svc?.id && !map.has(svc.id)) {
        map.set(svc.id, { id: svc.id, name: svc.name });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [providerServices]);


  const loadProviders = async () => {
    const data = await adminAPI.getAllProviders();
    setProviders((data || []).map((p: any) => ({ id: p.id, name: p.name })));
  };

  const loadProviderServices = async () => {
    const params = new URLSearchParams();
    if (providerFilter !== 'all') params.set('provider_id', providerFilter);

    const response = await fetch(`/api/admin/provider-services?${params.toString()}`);
    const raw = await response.text();
    let payload: any = {};
    try {
      payload = raw ? JSON.parse(raw) : {};
    } catch {
      throw new Error('Provider services API returned invalid JSON. Ensure server routes are deployed.');
    }
    if (!response.ok || !payload.success) {
      throw new Error(payload?.message || 'Failed to load provider services');
    }

    const normalized = (payload.services || []).map((row: ProviderServiceRow) => ({
      ...row,
      providers: asEmbedded(row.providers),
      services: asEmbedded(row.services),
    }));

    setProviderServices(normalized);
  };

  const reloadAll = async () => {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await Promise.all([loadProviders(), loadProviderServices()]);
    } catch (err: any) {
      setError(err.message || 'Failed to load margin manager data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reloadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerFilter]);

  const handleApplyProviderMargin = async () => {
    if (providerFilter === 'all') {
      setError('Please select a provider first.');
      return;
    }
    setError('');
    setMessage('');
    try {
      const payload = await adminAPI.applyProviderMargin(
        providerFilter,
        providerMarginType,
        providerMarginValue
      );
      setMessage(`Provider margin applied to ${payload.applied || 0} services.`);
      await Promise.all([loadProviderServices()]);
    } catch (err: any) {
      setError(err.message || 'Failed to apply provider margin');
    }
  };

  const handleLoadComparison = async () => {
    setError('');
    setMessage('');
    if (!comparisonServiceId) {
      setError('Select a service to compare.');
      return;
    }

    try {
      const payload = await adminAPI.getServiceComparison({
        service_id: comparisonServiceId,
        limit: 5,
        sort: comparisonSort,
      });
      setComparison(payload);
      const competitorData = await adminAPI.getCompetitorPrices(comparisonServiceId);
      setCompetitorPrices(competitorData || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load comparison');
    }
  };

  const handleResetProviderMargin = async () => {
    if (providerFilter === 'all') {
      setError('Please select a provider first.');
      return;
    }
    setError('');
    setMessage('');
    try {
      const payload = await adminAPI.resetProviderMargin(providerFilter);
      setMessage(`Provider margin removed. Reset ${payload.reset || 0} services.`);
      await Promise.all([loadProviderServices()]);
    } catch (err: any) {
      setError(err.message || 'Failed to reset provider margin');
    }
  };

  const handleSyncProviderServices = async () => {
    if (providerFilter === 'all') {
      setError('Please select a provider first.');
      return;
    }
    setError('');
    setMessage('');
    setSyncingProvider(true);
    try {
      const response = await fetch('/api/admin/sync-provider-services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_id: providerFilter,
          category: syncCategories.trim() || undefined,
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
      setMessage(`Synced ${payload.synced_count || payload.count || 0} services.`);
      await loadProviderServices();
    } catch (err: any) {
      setError(err.message || 'Failed to sync provider services');
    } finally {
      setSyncingProvider(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Provider Margin Manager</h1>
          <p className="text-sm text-gray-400">Set provider-wise margin and compare providers.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="bg-black/20 border border-brand-border rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">All Providers</option>
            {providers.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.name}
              </option>
            ))}
          </select>
          <button
            onClick={reloadAll}
            className="px-3 py-2 rounded-lg bg-gray-500/20 hover:bg-gray-500/30 text-sm"
            disabled={loading}
          >
            Refresh
          </button>
        </div>
      </div>

      {error && <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 text-sm">{error}</div>}
      {message && <div className="p-3 rounded-lg bg-green-500/20 border border-green-500/40 text-green-300 text-sm">{message}</div>}

      <div className="grid grid-cols-1 md:grid-cols-1 gap-3">
        <div className="bg-brand-container border border-brand-border rounded-xl p-4">
          <p className="text-xs text-gray-400">Services Loaded</p>
          <p className="text-2xl font-bold">{providerServices.length}</p>
        </div>
      </div>

      <div className="bg-brand-container border border-brand-border rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Provider Wise Margin</h2>
          <p className="text-sm text-gray-400">Set one margin for the selected provider.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <label htmlFor="provider-margin-type" className="block text-xs text-gray-400 mb-1">Type</label>
            <select
              id="provider-margin-type"
              name="providerMarginType"
              value={providerMarginType}
              onChange={(e) => setProviderMarginType(e.target.value as 'percent' | 'fixed')}
              className="w-full bg-black/20 border border-brand-border rounded-lg p-2 text-sm"
            >
              <option value="percent">Percent</option>
              <option value="fixed">Fixed</option>
            </select>
          </div>
          <div>
            <label htmlFor="provider-margin-value" className="block text-xs text-gray-400 mb-1">Value</label>
            <input
              type="number"
              id="provider-margin-value"
              name="providerMarginValue"
              value={providerMarginValue}
              onChange={(e) => setProviderMarginValue(Number(e.target.value))}
              className="w-full bg-black/20 border border-brand-border rounded-lg p-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="provider-margin-sync-categories" className="block text-xs text-gray-400 mb-1">Sync Categories</label>
            <input
              id="provider-margin-sync-categories"
              name="providerMarginSyncCategories"
              value={syncCategories}
              onChange={(e) => setSyncCategories(e.target.value)}
              placeholder="e.g. instagram, youtube"
              className="w-full bg-black/20 border border-brand-border rounded-lg p-2 text-sm"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleApplyProviderMargin}
              className="w-full px-4 py-2 rounded-lg bg-gradient-to-r from-brand-accent to-brand-purple text-sm"
            >
              Apply to Provider
            </button>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleResetProviderMargin}
              className="w-full px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-sm"
            >
              Remove Margin
            </button>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleSyncProviderServices}
              className="w-full px-4 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-sm disabled:opacity-60"
              disabled={syncingProvider}
            >
              {syncingProvider ? 'Syncing...' : 'Resync Services'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-brand-container border border-brand-border rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Provider Services</h2>
          <input
            id="provider-margin-search"
            name="providerMarginSearch"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search services, provider, or ID"
            className="bg-black/20 border border-brand-border rounded-lg px-3 py-2 text-sm w-64"
          />
        </div>

        <div className="bg-black/20 border border-brand-border rounded-lg overflow-auto ds-scrollbar max-h-[420px]">
          <table className="w-full text-sm text-left">
            <thead className="bg-black/40 border-b border-brand-border">
              <tr>
                <th className="p-3">Provider</th>
                <th className="p-3">Service</th>
                <th className="p-3 text-right">Provider Rate</th>
                <th className="p-3 text-right">Our Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {filteredServices.slice(0, 100).map((row) => (
                <tr key={row.id} className="hover:bg-black/10">
                  <td className="p-3">{asEmbedded(row.providers)?.name || '-'}</td>
                  <td className="p-3">
                    {asEmbedded(row.services)?.name || `Provider Service ID: ${row.provider_service_id}`}
                  </td>
                  <td className="p-3 text-right text-gray-300">${toNumber(row.provider_rate).toFixed(4)}</td>
                  <td className="p-3 text-right text-green-400">${toNumber(row.our_rate).toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-brand-container border border-brand-border rounded-2xl p-5 space-y-4">
        <h2 className="text-lg font-semibold">Service Comparison Tool</h2>
        <div className="flex flex-wrap gap-2">
          <select
            value={comparisonServiceId}
            onChange={(e) => setComparisonServiceId(e.target.value)}
            className="bg-black/20 border border-brand-border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Select service</option>
            {uniqueServices.map((svc) => (
              <option key={svc.id} value={svc.id}>{svc.name}</option>
            ))}
          </select>
          <select
            value={comparisonSort}
            onChange={(e) => setComparisonSort(e.target.value)}
            className="bg-black/20 border border-brand-border rounded-lg px-3 py-2 text-sm"
          >
            <option value="cost">Sort by Cost</option>
            <option value="quality">Sort by Quality</option>
            <option value="margin">Sort by Margin</option>
          </select>
          <button
            onClick={handleLoadComparison}
            className="px-4 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-sm"
          >
            Compare
          </button>
        </div>

        {comparison ? (
          <div className="space-y-3">
            <div className="overflow-auto ds-scrollbar">
              <table className="w-full text-sm text-left">
                <thead className="bg-black/20 border-b border-brand-border">
                  <tr>
                    <th className="p-3">Provider</th>
                    <th className="p-3 text-right">Cost/1K</th>
                    <th className="p-3 text-right">Our Rate</th>
                    <th className="p-3 text-right">Margin %</th>
                    <th className="p-3 text-center">Quality</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {comparison.providers.map((row: any) => (
                    <tr key={row.id}>
                      <td className="p-3">{row.providers?.name || row.provider_id}</td>
                      <td className="p-3 text-right">${toNumber(row.provider_rate).toFixed(4)}</td>
                      <td className="p-3 text-right text-green-400">${toNumber(row.our_rate).toFixed(4)}</td>
                      <td className="p-3 text-right">{toNumber(row.margin_percent).toFixed(2)}%</td>
                      <td className="p-3 text-center">{row.quality_score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-black/20 border border-brand-border rounded-lg p-3 text-sm">
                <p className="text-xs text-gray-400">Best Value</p>
                <p className="font-medium">{comparison.best_value?.providers?.name || '-'}</p>
              </div>
              <div className="bg-black/20 border border-brand-border rounded-lg p-3 text-sm">
                <p className="text-xs text-gray-400">Best Quality</p>
                <p className="font-medium">{comparison.best_quality?.providers?.name || '-'}</p>
              </div>
              <div className="bg-black/20 border border-brand-border rounded-lg p-3 text-sm">
                <p className="text-xs text-gray-400">Recommended</p>
                <p className="font-medium">{comparison.recommended?.providers?.name || '-'}</p>
              </div>
            </div>

            <div className="bg-black/20 border border-brand-border rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-2">Competitor Pricing</p>
              {competitorPrices.length === 0 ? (
                <p className="text-sm text-gray-400">No competitor pricing captured for this service.</p>
              ) : (
                <div className="overflow-auto ds-scrollbar">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="text-gray-400">
                        <th className="pb-2">Provider</th>
                        <th className="pb-2 text-right">Price/1K</th>
                        <th className="pb-2 text-center">Quality</th>
                        <th className="pb-2 text-center">Delivery (h)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border">
                      {competitorPrices.slice(0, 8).map((row: any) => (
                        <tr key={row.id}>
                          <td className="py-2">{row.provider_name}</td>
                          <td className="py-2 text-right">${toNumber(row.price_per_1000).toFixed(4)}</td>
                          <td className="py-2 text-center">{row.quality_score}</td>
                          <td className="py-2 text-center">{row.delivery_time_hours}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400">Select a service and compare providers.</p>
        )}
      </div>
    </div>
  );
};

export default ProviderMarginManager;
