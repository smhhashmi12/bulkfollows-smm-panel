'use client';
import React, { useState, useEffect } from 'react';

interface Provider {
  id: string;
  name: string;
  api_url: string;
  api_key: string;
  api_secret?: string;
  balance: number;
  status: 'active' | 'inactive' | 'error';
  last_sync?: string;
  created_at?: string;
}

interface ProviderFormData {
  name: string;
  api_url: string;
  api_key: string;
  api_secret: string;
}

const ProviderManagementPage: React.FC = () => {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [formData, setFormData] = useState<ProviderFormData>({
    name: '',
    api_url: '',
    api_key: '',
    api_secret: '',
  });

  // Fetch providers on mount
  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      setError(null);
      const { adminAPI } = await import('../../lib/api');
      const data = await adminAPI.getAllProviders();
      setProviders(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load providers');
      console.error('Fetch providers error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (provider?: Provider) => {
    if (provider) {
      setEditingId(provider.id);
      setFormData({
        name: provider.name,
        api_url: provider.api_url,
        api_key: provider.api_key,
        api_secret: provider.api_secret || '',
      });
    } else {
      setEditingId(null);
      setFormData({ name: '', api_url: '', api_key: '', api_secret: '' });
    }
    setShowModal(true);
    setTestResult(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({ name: '', api_url: '', api_key: '', api_secret: '' });
    setTestResult(null);
  };

  const handleSaveProvider = async () => {
    try {
      if (!formData.name || !formData.api_url || !formData.api_key) {
        setError('Please fill in all required fields (Name, API URL, API Key)');
        return;
      }

      setError(null);
      const { adminAPI } = await import('../../lib/api');

      const providerData = {
        name: formData.name,
        api_url: formData.api_url,
        api_key: formData.api_key,
        api_secret: formData.api_secret,
        status: 'active',
        balance: editingId ? undefined : 0, // Don't reset balance on edit
      };

      if (editingId) {
        await adminAPI.updateProvider(editingId, providerData);
      } else {
        await adminAPI.createProvider(providerData);
      }

      await fetchProviders();
      handleCloseModal();
    } catch (err: any) {
      setError(err.message || 'Failed to save provider');
      console.error('Save provider error:', err);
    }
  };

  const handleTestConnection = async (provider: Provider) => {
    try {
      setTestingId(provider.id);
      setTestResult(null);

      // Simulate API test - in production, call actual provider API endpoint
      const testPayload = {
        api_url: provider.api_url,
        api_key: provider.api_key,
        api_secret: provider.api_secret,
      };

      // This would call a backend endpoint to test the provider connection
      const response = await fetch('/api/admin/test-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload),
      });

      if (response.ok) {
        const result = await response.json();
        setTestResult({
          success: true,
          message: `Connection successful. Balance: $${result.balance?.toFixed(2) || '0.00'}`,
        });
      } else {
        setTestResult({
          success: false,
          message: 'Connection failed. Check API credentials.',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Test failed: ${err.message || 'Connection timeout'}`,
      });
      console.error('Test connection error:', err);
    } finally {
      setTestingId(null);
    }
  };

  const handleSyncServices = async (provider: Provider) => {
    try {
      setSyncingId(provider.id);
      setError(null);

      // Call backend to sync services from provider
      const response = await fetch('/api/admin/sync-provider-services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider_id: provider.id }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result?.message || 'Sync failed');
      }

      setError(null);
      await fetchProviders();
      alert(`Synced ${result.synced_count || result.count || 0} services from ${provider.name}`);
    } catch (err: any) {
      setError(`Sync error: ${err.message || 'Sync timeout'}`);
      console.error('Sync services error:', err);
    } finally {
      setSyncingId(null);
    }
  };

  const handleRefreshBalance = async (provider: Provider) => {
    try {
      setError(null);
      const { adminAPI } = await import('../../lib/api');

      // Call test connection to refresh balance
      const response = await fetch('/api/admin/test-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_url: provider.api_url,
          api_key: provider.api_key,
          api_secret: provider.api_secret,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        // Update provider balance
        await adminAPI.updateProvider(provider.id, { balance: result.balance || 0 });
        await fetchProviders();
      }
    } catch (err: any) {
      setError(`Refresh error: ${err.message || 'Timeout'}`);
      console.error('Refresh balance error:', err);
    }
  };

  const handleDeleteProvider = async (providerId: string) => {
    if (!confirm('Are you sure you want to delete this provider? This action cannot be undone.')) {
      return;
    }

    try {
      setError(null);
      const { adminAPI } = await import('../../lib/api');
      await adminAPI.deleteProvider(providerId);
      await fetchProviders();
    } catch (err: any) {
      setError(`Delete error: ${err.message}`);
      console.error('Delete provider error:', err);
    }
  };

  const statusColors: { [key: string]: string } = {
    active: 'bg-green-500/20 text-green-400',
    inactive: 'bg-gray-500/20 text-gray-300',
    error: 'bg-red-500/20 text-red-400',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-end items-center">
        <button
          onClick={() => handleOpenModal()}
          className="bg-gradient-to-r from-brand-accent to-brand-purple hover:opacity-90 text-white font-semibold px-4 py-2 rounded-lg transition-all"
        >
          + Add New Provider
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-300 text-sm">
          Warning: {error}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400">Loading providers...</div>
        </div>
      ) : providers.length === 0 ? (
        <div className="bg-brand-container border border-brand-border rounded-2xl p-8 text-center text-gray-400">
          No providers found. Click "Add New Provider" to get started.
        </div>
      ) : (
        /* Providers Table */
        <div className="bg-brand-container border border-brand-border rounded-2xl">
          <div className="overflow-x-auto ds-scrollbar">
          <table className="w-full text-sm text-left">
            <thead className="bg-black/20 border-b border-brand-border">
              <tr>
                <th className="p-4 font-semibold">Provider Name</th>
                <th className="p-4 font-semibold">API URL</th>
                <th className="p-4 font-semibold">Balance</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold">Last Sync</th>
                <th className="p-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {providers.map((provider) => (
                <tr key={provider.id} className="hover:bg-black/10 transition-colors">
                  <td className="p-4 font-medium">{provider.name}</td>
                  <td className="p-4 text-gray-400 text-xs truncate max-w-xs" title={provider.api_url}>
                    {provider.api_url}
                  </td>
                  <td className="p-4 font-medium text-green-400">${provider.balance?.toFixed(2) || '0.00'}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[provider.status]}`}>
                      {provider.status.charAt(0).toUpperCase() + provider.status.slice(1)}
                    </span>
                  </td>
                  <td className="p-4 text-gray-400 text-xs">
                    {provider.last_sync ? new Date(provider.last_sync).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => handleOpenModal(provider)}
                        className="text-blue-400 hover:text-blue-300 text-xs font-semibold px-2 py-1 rounded hover:bg-blue-500/20 transition-colors"
                        title="Edit provider"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleTestConnection(provider)}
                        disabled={testingId === provider.id}
                        className="text-purple-400 hover:text-purple-300 text-xs font-semibold px-2 py-1 rounded hover:bg-purple-500/20 transition-colors disabled:opacity-50"
                        title="Test API connection"
                      >
                        {testingId === provider.id ? 'Testing...' : 'Test'}
                      </button>
                      <button
                        onClick={() => handleRefreshBalance(provider)}
                        className="text-cyan-400 hover:text-cyan-300 text-xs font-semibold px-2 py-1 rounded hover:bg-cyan-500/20 transition-colors"
                        title="Refresh balance"
                      >
                        Refresh
                      </button>
                      <button
                        onClick={() => handleSyncServices(provider)}
                        disabled={syncingId === provider.id}
                        className="text-green-400 hover:text-green-300 text-xs font-semibold px-2 py-1 rounded hover:bg-green-500/20 transition-colors disabled:opacity-50"
                        title="Sync services"
                      >
                        {syncingId === provider.id ? 'Syncing...' : 'Sync'}
                      </button>
                      <button
                        onClick={() => handleDeleteProvider(provider.id)}
                        className="text-red-400 hover:text-red-300 text-xs font-semibold px-2 py-1 rounded hover:bg-red-500/20 transition-colors"
                        title="Delete provider"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Add/Edit Provider Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-brand-container border border-brand-border rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto ds-scrollbar">
            <h2 className="text-xl font-bold mb-4">
              {editingId ? 'Edit Provider' : '+ Add New Provider'}
            </h2>

            {/* Form Fields */}
            <div className="space-y-4 mb-6">
              {/* Provider Name */}
              <div>
                <label className="block text-sm font-medium mb-2">Provider Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., SMM King, Instant Followers"
                  className="w-full bg-black/20 border border-brand-border rounded-lg p-2 pl-10 focus:ring-2 focus:ring-brand-purple focus:outline-none text-sm"
                />
              </div>

              {/* API URL */}
              <div>
                <label className="block text-sm font-medium mb-2">API URL *</label>
                <input
                  type="url"
                  value={formData.api_url}
                  onChange={(e) => setFormData({ ...formData, api_url: e.target.value })}
                  placeholder="https://api.provider.com"
                  className="w-full bg-black/20 border border-brand-border rounded-lg p-2 pl-10 focus:ring-2 focus:ring-brand-purple focus:outline-none text-sm"
                />
              </div>

              {/* API Key */}
              <div>
                <label className="block text-sm font-medium mb-2">API Key *</label>
                <input
                  type="password"
                  value={formData.api_key}
                  onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                  placeholder="Your API key"
                  className="w-full bg-black/20 border border-brand-border rounded-lg p-2 pl-10 focus:ring-2 focus:ring-brand-purple focus:outline-none text-sm"
                />
              </div>

              {/* API Secret (Optional) */}
              <div>
                <label className="block text-sm font-medium mb-2">API Secret (Optional)</label>
                <input
                  type="password"
                  value={formData.api_secret}
                  onChange={(e) => setFormData({ ...formData, api_secret: e.target.value })}
                  placeholder="Your API secret (if required)"
                  className="w-full bg-black/20 border border-brand-border rounded-lg p-2 pl-10 focus:ring-2 focus:ring-brand-purple focus:outline-none text-sm"
                />
              </div>
            </div>

            {/* Test Result */}
            {testResult && (
              <div
                className={`p-3 rounded-lg mb-4 text-sm ${
                  testResult.success
                    ? 'bg-green-500/20 text-green-300 border border-green-500/50'
                    : 'bg-red-500/20 text-red-300 border border-red-500/50'
                }`}
              >
                {testResult.message}
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => handleTestConnection(formData as any)}
                disabled={!formData.api_url || !formData.api_key}
                className="flex-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 font-semibold px-4 py-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Test Connection
              </button>
              <button
                onClick={handleSaveProvider}
                className="flex-1 bg-gradient-to-r from-brand-accent to-brand-purple hover:opacity-90 text-white font-semibold px-4 py-2 rounded-lg transition-all"
              >
                {editingId ? 'Update' : 'Create'}
              </button>
              <button
                onClick={handleCloseModal}
                className="flex-1 bg-gray-500/20 hover:bg-gray-500/30 text-gray-300 font-semibold px-4 py-2 rounded-lg transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProviderManagementPage;
