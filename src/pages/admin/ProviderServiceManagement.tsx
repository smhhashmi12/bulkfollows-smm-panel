import React, { useEffect, useMemo, useState } from 'react';
import { adminAPI } from '../../lib/api';

type Provider = {
  id: string;
  name: string;
};

type ProviderServiceRow = {
  id: string;
  provider_id: string;
  service_id: string;
  provider_service_id: string;
  provider_rate: number;
  our_rate: number;
  min_quantity: number;
  max_quantity: number;
  status: 'active' | 'inactive';
  updated_at?: string;
  providers?: { id: string; name: string };
  services?: { id: string; name: string; category: string; status: 'active' | 'inactive' };
};

const asEmbeddedObject = <T,>(value: T | T[] | null | undefined): T | undefined => {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
};

type EditForm = {
  provider_rate: number;
  our_rate: number;
  min_quantity: number;
  max_quantity: number;
  status: 'active' | 'inactive';
  service_name: string;
  service_category: string;
  service_status: 'active' | 'inactive';
};

const ProviderServiceManagementPage: React.FC = () => {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [rows, setRows] = useState<ProviderServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingProviderId, setSyncingProviderId] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const [editing, setEditing] = useState<ProviderServiceRow | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [markupPercent, setMarkupPercent] = useState<number>(50);

  const loadProviders = async () => {
    const data = await adminAPI.getAllProviders();
    setProviders((data || []).map((p: any) => ({ id: p.id, name: p.name })));
  };

  const loadProviderServices = async () => {
    const params = new URLSearchParams();
    if (providerFilter !== 'all') params.set('provider_id', providerFilter);
    if (statusFilter !== 'all') params.set('status', statusFilter);

    const response = await fetch(`/api/admin/provider-services?${params.toString()}`);
    const result = await response.json();
    if (!response.ok || !result.success) {
      throw new Error(result?.message || 'Failed to load provider services');
    }
    const normalizedRows = (result.services || []).map((row: any) => ({
      ...row,
      providers: asEmbeddedObject(row.providers),
      services: asEmbeddedObject(row.services),
    }));
    setRows(normalizedRows);
  };

  const reloadAll = async () => {
    setLoading(true);
    setError('');
    try {
      await Promise.all([loadProviders(), loadProviderServices()]);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reloadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerFilter, statusFilter]);

  const categories = useMemo(() => {
    return Array.from(
      new Set(
        rows
          .map((r) => r.services?.category)
          .filter((value): value is string => Boolean(value))
      )
    ).sort();
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (categoryFilter !== 'all' && row.services?.category !== categoryFilter) return false;
      if (!q) return true;

      const providerName = (row.providers?.name || '').toLowerCase();
      const serviceName = (row.services?.name || '').toLowerCase();
      const providerServiceId = String(row.provider_service_id || '').toLowerCase();
      return providerName.includes(q) || serviceName.includes(q) || providerServiceId.includes(q);
    });
  }, [rows, categoryFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page]);

  useEffect(() => {
    setPage(1);
  }, [providerFilter, categoryFilter, statusFilter, search, rows.length]);

  const totalCount = filteredRows.length;
  const activeCount = filteredRows.filter((r) => r.status === 'active').length;
  const providerCount = new Set(filteredRows.map((r) => r.provider_id)).size;

  const handleSyncProvider = async (providerId: string) => {
    setSyncingProviderId(providerId);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/admin/sync-provider-services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider_id: providerId, markup_percent: markupPercent }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result?.message || 'Failed to sync provider services');
      }

      setMessage(`Synced ${result.synced_count || result.count || 0} services successfully.`);
      await loadProviderServices();
    } catch (err: any) {
      setError(err.message || 'Failed to sync provider services');
    } finally {
      setSyncingProviderId(null);
    }
  };

  const handleSyncAllProviders = async () => {
    if (providers.length === 0) {
      setError('No providers found.');
      return;
    }

    setSyncingAll(true);
    setError('');
    setMessage('');
    let success = 0;
    let failed = 0;

    for (const provider of providers) {
      try {
        const response = await fetch('/api/admin/sync-provider-services', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider_id: provider.id, markup_percent: markupPercent }),
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
          failed += 1;
        } else {
          success += 1;
        }
      } catch {
        failed += 1;
      }
    }

    setMessage(`Sync complete. Success: ${success}, Failed: ${failed}`);
    await loadProviderServices();
    setSyncingAll(false);
  };

  const handleOpenEdit = (row: ProviderServiceRow) => {
    setEditing(row);
    setEditForm({
      provider_rate: Number(row.provider_rate || 0),
      our_rate: Number(row.our_rate || 0),
      min_quantity: Number(row.min_quantity || 1),
      max_quantity: Number(row.max_quantity || 10000),
      status: row.status || 'active',
      service_name: row.services?.name || '',
      service_category: row.services?.category || 'Other',
      service_status: row.services?.status || 'active',
    });
  };

  const handleSaveEdit = async () => {
    if (!editing || !editForm) return;

    if (editForm.min_quantity >= editForm.max_quantity) {
      setError('Minimum quantity must be less than maximum quantity.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch(`/api/admin/provider-services/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result?.message || 'Failed to update provider service');
      }

      setMessage('Provider service updated successfully.');
      setEditing(null);
      setEditForm(null);
      await loadProviderServices();
    } catch (err: any) {
      setError(err.message || 'Failed to update provider service');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-400">Markup %</label>
          <input
            type="number"
            min="0"
            step="1"
            value={markupPercent}
            onChange={(e) => setMarkupPercent(Math.max(0, Number(e.target.value) || 0))}
            className="w-24 px-2 py-2 rounded-lg bg-black/20 border border-brand-border text-sm"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={reloadAll}
            className="px-3 py-2 rounded-lg bg-gray-500/20 hover:bg-gray-500/30 text-sm"
            disabled={loading}
          >
            Refresh
          </button>
          <button
            onClick={handleSyncAllProviders}
            className="px-3 py-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-sm disabled:opacity-60"
            disabled={syncingAll || providers.length === 0}
          >
            {syncingAll ? 'Syncing all...' : 'Sync All Providers'}
          </button>
        </div>
      </div>

      {error && <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 text-sm">{error}</div>}
      {message && <div className="p-3 rounded-lg bg-green-500/20 border border-green-500/40 text-green-300 text-sm">{message}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-brand-container border border-brand-border rounded-xl p-4">
          <p className="text-xs text-gray-400">Visible Services</p>
          <p className="text-2xl font-bold">{totalCount}</p>
        </div>
        <div className="bg-brand-container border border-brand-border rounded-xl p-4">
          <p className="text-xs text-gray-400">Active</p>
          <p className="text-2xl font-bold text-green-400">{activeCount}</p>
        </div>
        <div className="bg-brand-container border border-brand-border rounded-xl p-4">
          <p className="text-xs text-gray-400">Providers</p>
          <p className="text-2xl font-bold text-cyan-400">{providerCount}</p>
        </div>
      </div>

      <div className="bg-brand-container border border-brand-border rounded-2xl p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="w-full bg-black/20 border border-brand-border rounded-lg p-2 text-sm"
          >
            <option value="all">All Providers</option>
            {providers.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.name}
              </option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full bg-black/20 border border-brand-border rounded-lg p-2 text-sm"
          >
            <option value="all">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-black/20 border border-brand-border rounded-lg p-2 text-sm"
          >
            <option value="all">Any Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <input
            type="text"
            placeholder="Search service/provider/id..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-black/20 border border-brand-border rounded-lg p-2 text-sm"
          />
        </div>

        <div className="overflow-x-auto ds-scrollbar">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-400">
              Showing {filteredRows.length === 0 ? 0 : (page - 1) * pageSize + 1} - {Math.min(page * pageSize, filteredRows.length)} of {filteredRows.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page <= 1}
                className="h-8 w-8 rounded border border-brand-border bg-black/20 text-gray-300 disabled:opacity-40"
                title="Previous"
              >
                ↑
              </button>
              <span className="text-xs text-gray-300">Page {page}/{totalPages}</span>
              <button
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages}
                className="h-8 w-8 rounded border border-brand-border bg-black/20 text-gray-300 disabled:opacity-40"
                title="Next"
              >
                ↓
              </button>
            </div>
          </div>
          <table className="w-full text-sm text-left">
            <thead className="bg-black/20 border-b border-brand-border">
              <tr>
                <th className="p-3">Provider</th>
                <th className="p-3">Service</th>
                <th className="p-3">Category</th>
                <th className="p-3">Provider Service ID</th>
                <th className="p-3 text-right">Provider Rate</th>
                <th className="p-3 text-right">Our Rate</th>
                <th className="p-3 text-center">Min/Max</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-gray-400">Loading provider services...</td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-gray-400">No provider services found.</td>
                </tr>
              ) : (
                paginatedRows.map((row) => (
                  <tr key={row.id} className="hover:bg-black/10">
                    <td className="p-3 font-medium">{row.providers?.name || '-'}</td>
                    <td className="p-3">{row.services?.name || '-'}</td>
                    <td className="p-3 text-gray-300">{row.services?.category || '-'}</td>
                    <td className="p-3 font-mono text-xs">{row.provider_service_id}</td>
                    <td className="p-3 text-right text-gray-300">${Number(row.provider_rate || 0).toFixed(4)}</td>
                    <td className="p-3 text-right text-green-400">${Number(row.our_rate || 0).toFixed(4)}</td>
                    <td className="p-3 text-center font-mono text-xs">
                      {row.min_quantity} / {row.max_quantity}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${row.status === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(row)}
                          className="px-2 py-1 text-xs rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-300"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleSyncProvider(row.provider_id)}
                          disabled={syncingProviderId === row.provider_id}
                          className="px-2 py-1 text-xs rounded bg-green-500/20 hover:bg-green-500/30 text-green-300 disabled:opacity-60"
                        >
                          {syncingProviderId === row.provider_id ? 'Syncing...' : 'Sync Provider'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && editForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-brand-container border border-brand-border rounded-2xl p-5 space-y-4">
            <h2 className="text-xl font-bold">Edit Provider Service</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Service Name</label>
                <input
                  type="text"
                  value={editForm.service_name}
                  onChange={(e) => setEditForm({ ...editForm, service_name: e.target.value })}
                  className="w-full bg-black/20 border border-brand-border rounded-lg p-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Category</label>
                <input
                  type="text"
                  value={editForm.service_category}
                  onChange={(e) => setEditForm({ ...editForm, service_category: e.target.value })}
                  className="w-full bg-black/20 border border-brand-border rounded-lg p-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Provider Rate</label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={editForm.provider_rate}
                  onChange={(e) => setEditForm({ ...editForm, provider_rate: Number(e.target.value) })}
                  className="w-full bg-black/20 border border-brand-border rounded-lg p-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Our Rate</label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={editForm.our_rate}
                  onChange={(e) => setEditForm({ ...editForm, our_rate: Number(e.target.value) })}
                  className="w-full bg-black/20 border border-brand-border rounded-lg p-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Min Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={editForm.min_quantity}
                  onChange={(e) => setEditForm({ ...editForm, min_quantity: Number(e.target.value) })}
                  className="w-full bg-black/20 border border-brand-border rounded-lg p-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Max Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={editForm.max_quantity}
                  onChange={(e) => setEditForm({ ...editForm, max_quantity: Number(e.target.value) })}
                  className="w-full bg-black/20 border border-brand-border rounded-lg p-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Provider Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value as 'active' | 'inactive' })}
                  className="w-full bg-black/20 border border-brand-border rounded-lg p-2 text-sm"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">System Service Status</label>
                <select
                  value={editForm.service_status}
                  onChange={(e) => setEditForm({ ...editForm, service_status: e.target.value as 'active' | 'inactive' })}
                  className="w-full bg-black/20 border border-brand-border rounded-lg p-2 text-sm"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setEditing(null);
                  setEditForm(null);
                }}
                className="px-3 py-2 rounded-lg bg-gray-500/20 hover:bg-gray-500/30 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="px-3 py-2 rounded-lg bg-gradient-to-r from-brand-accent to-brand-purple text-sm disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProviderServiceManagementPage;
