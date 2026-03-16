import React, { useState, useEffect } from 'react';
import { Card, Badge } from '../../design-system';
import { ServiceProfitManager } from '../../components/admin/ServiceProfitManager';
import { Settings, Zap } from 'lucide-react';

interface Provider {
  id: string;
  name: string;
  api_key: string;
  markup_percentage?: number;
  balance?: number;
  status: 'active' | 'inactive' | 'error';
}

interface Service {
  id: string;
  name: string;
  provider_id?: string;
  provider_rate?: number;
  our_rate?: number;
  status: 'active' | 'inactive' | 'hidden';
  rate_per_1000?: number;
  category?: string;
}

const ServicePricingDashboard: React.FC = () => {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [showProviderMarginModal, setShowProviderMarginModal] = useState(false);
  const [editingMargin, setEditingMargin] = useState<number>(0);

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch providers
      const providersRes = await fetch('/api/admin/providers', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`
        }
      });
      const providersData = await providersRes.json();
      setProviders(providersData.providers || []);

      // Fetch services
      const servicesRes = await fetch('/api/admin/services', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`
        }
      });
      const servicesData = await servicesRes.json();
      setServices(servicesData.services || []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load providers and services. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProviderMargin = async (providerId: string, margin: number) => {
    try {
      const response = await fetch(`/api/admin/providers/${providerId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`
        },
        body: JSON.stringify({ markup_percentage: margin })
      });

      if (!response.ok) throw new Error('Failed to update margin');

      // Update local state
      setProviders(providers.map(p =>
        p.id === providerId ? { ...p, markup_percentage: margin } : p
      ));

      if (selectedProvider?.id === providerId) {
        setSelectedProvider({ ...selectedProvider, markup_percentage: margin });
      }

      alert('Provider margin updated successfully!');
      setShowProviderMarginModal(false);
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleUpdateServiceMargin = async (serviceId: string, margin: number) => {
    try {
      const response = await fetch(`/api/admin/services/${serviceId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token')}`
        },
        body: JSON.stringify({ margin_percentage: margin })
      });

      if (!response.ok) throw new Error('Failed to update service');

      // Recalculate our_rate based on new margin
      const service = services.find(s => s.id === serviceId);
      if (service && service.provider_rate) {
        const newOurRate = service.provider_rate * (1 + margin / 100);
        setServices(services.map(s =>
          s.id === serviceId ? { ...s, our_rate: newOurRate } : s
        ));
      }

      alert('Service pricing updated!');
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading providers and services...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-accent to-brand-purple rounded-2xl p-6 border border-brand-border">
        <h1 className="text-3xl font-bold mb-2">Service & Provider Management</h1>
        <p className="text-gray-300">Manage your providers' profit margins and service pricing</p>
      </div>

      {error && (
        <Card className="bg-red-500/10 border border-red-500/50 text-red-400 p-4">
          {error}
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-xs text-gray-400 mb-1">Total Providers</p>
          <p className="text-3xl font-bold text-brand-accent">{providers.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-400 mb-1">Total Services</p>
          <p className="text-3xl font-bold text-brand-accent">{services.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-400 mb-1">Active Services</p>
          <p className="text-3xl font-bold text-green-400">
            {services.filter(s => s.status === 'active').length}
          </p>
        </Card>
      </div>

      {/* Providers Overview */}
      <div>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-brand-accent" />
          Providers & Margins
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {providers.map(provider => (
            <Card key={provider.id} className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-white">{provider.name}</h3>
                  <Badge className={provider.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}>
                    {provider.status}
                  </Badge>
                </div>
                <button
                  onClick={() => {
                    setSelectedProvider(provider);
                    setEditingMargin(provider.markup_percentage || 0);
                    setShowProviderMarginModal(true);
                  }}
                  className="text-xs px-3 py-1 bg-brand-accent/20 hover:bg-brand-accent/30 text-brand-accent rounded-lg transition-colors"
                >
                  Edit Margin
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-black/20 rounded p-2">
                  <span className="text-gray-400">Profit Margin</span>
                  <p className="text-lg font-bold text-brand-accent">{provider.markup_percentage || 0}%</p>
                </div>
                <div className="bg-black/20 rounded p-2">
                  <span className="text-gray-400">Balance</span>
                  <p className="text-lg font-bold text-green-400">${(provider.balance || 0).toFixed(2)}</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Services: {services.filter(s => s.provider_id === provider.id).length}
              </p>
            </Card>
          ))}
        </div>
      </div>

      {/* Services Manager */}
      <div>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-green-400" />
          Service Pricing Control
        </h2>
        <ServiceProfitManager
          services={services}
          providers={providers}
          onUpdate={handleUpdateServiceMargin}
        />
      </div>

      {/* Provider Margin Modal */}
      {showProviderMarginModal && selectedProvider && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Set Profit Margin</h2>
            <p className="text-sm text-gray-400 mb-4">Provider: <span className="font-semibold text-white">{selectedProvider.name}</span></p>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Profit Margin (%)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={editingMargin}
                  onChange={(e) => setEditingMargin(parseFloat(e.target.value) || 0)}
                  min="0"
                  max="300"
                  className="flex-1 bg-black/20 border border-brand-border rounded-lg p-2 focus:ring-2 focus:ring-brand-purple"
                />
                <span className="text-lg font-bold">%</span>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                This margin will be added to all provider services unless overridden individually.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleUpdateProviderMargin(selectedProvider.id, editingMargin)}
                className="flex-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 py-2 rounded-lg font-medium text-sm transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => setShowProviderMarginModal(false)}
                className="flex-1 bg-gray-500/20 hover:bg-gray-500/30 text-gray-400 py-2 rounded-lg font-medium text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ServicePricingDashboard;
