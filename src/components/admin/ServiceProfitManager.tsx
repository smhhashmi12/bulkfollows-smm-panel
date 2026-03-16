import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, Input } from '../../design-system';
import { DollarSign, TrendingUp, Settings } from 'lucide-react';

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

interface Provider {
  id: string;
  name: string;
  markup_percentage?: number;
}

interface ServiceProfitManagerProps {
  services?: Service[];
  providers?: Provider[];
  onUpdate?: (serviceId: string, margin: number) => void;
}

export const ServiceProfitManager: React.FC<ServiceProfitManagerProps> = ({
  services = [],
  providers = [],
  onUpdate,
}) => {
  const [filteredServices, setFilteredServices] = useState<Service[]>(services);
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'profit' | 'name' | 'provider'>('profit');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editMargin, setEditMargin] = useState<number>(0);

  useEffect(() => {
    let filtered = services;

    if (selectedProvider !== 'all') {
      filtered = filtered.filter(s => s.provider_id === selectedProvider);
    }

    // Sort
    if (sortBy === 'profit') {
      filtered.sort((a, b) => {
        const profitA = calculateProfit(a.our_rate || 0, a.provider_rate || 0);
        const profitB = calculateProfit(b.our_rate || 0, b.provider_rate || 0);
        return profitB - profitA;
      });
    } else if (sortBy === 'name') {
      filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    setFilteredServices(filtered);
  }, [services, selectedProvider, sortBy]);

  const calculateProfit = (ourRate: number, providerRate: number): number => {
    return ourRate - providerRate;
  };

  const calculateMarginPercent = (ourRate: number, providerRate: number): number => {
    if (providerRate === 0) return 0;
    return ((ourRate - providerRate) / providerRate) * 100;
  };

  const getProviderName = (providerId?: string): string => {
    if (!providerId) return 'Unknown';
    const provider = providers.find(p => p.id === providerId);
    return provider?.name || providerId;
  };

  const handleSaveMargin = async (serviceId: string, margin: number) => {
    if (onUpdate) {
      onUpdate(serviceId, margin);
    }
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      {/* Filter & Sort Bar */}
      <div className="bg-brand-container border border-brand-border rounded-2xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Provider Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">Filter by Provider</label>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="w-full bg-black/20 border border-brand-border rounded-lg p-2 text-sm focus:ring-2 focus:ring-brand-purple"
            >
              <option value="all">All Providers</option>
              {providers.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">Sort by</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full bg-black/20 border border-brand-border rounded-lg p-2 text-sm focus:ring-2 focus:ring-brand-purple"
            >
              <option value="profit">Highest Profit</option>
              <option value="name">Service Name</option>
              <option value="provider">Provider</option>
            </select>
          </div>

          {/* Stats */}
          <div className="flex items-end gap-2 text-xs">
            <span className="text-gray-400">Total Services: <span className="font-bold text-white">{filteredServices.length}</span></span>
          </div>
        </div>
      </div>

      {/* Services Grid */}
      {filteredServices.length === 0 ? (
        <Card className="p-8 text-center text-gray-400">
          No services found. Add providers and sync services first.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredServices.map((service) => {
            const providerRate = service.provider_rate || 0;
            const ourRate = service.our_rate || 0;
            const profit = calculateProfit(ourRate, providerRate);
            const marginPercent = calculateMarginPercent(ourRate, providerRate);
            const isEditing = editingId === service.id;

            return (
              <Card
                key={service.id}
                className={`p-4 border-l-4 ${
                  profit > 0 ? 'border-l-green-500' : profit < 0 ? 'border-l-red-500' : 'border-l-gray-500'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                  {/* Service Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-white">{service.name}</h3>
                      <Badge className={service.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}>
                        {service.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-400">
                      <div>
                        <span className="text-gray-500">Provider:</span>
                        <p className="text-white font-medium">{getProviderName(service.provider_id)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Category:</span>
                        <p className="text-white font-medium">{service.category || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Provider Cost:</span>
                        <p className="text-white font-medium">${providerRate.toFixed(4)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Your Price:</span>
                        <p className="text-white font-medium">${ourRate.toFixed(4)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Profit Display */}
                  <div className="bg-black/30 rounded-xl p-4 min-w-[200px]">
                    <div className="text-center mb-3">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <TrendingUp className={`w-4 h-4 ${profit > 0 ? 'text-green-400' : 'text-red-400'}`} />
                        <span className="text-xs text-gray-400">Profit per 1000</span>
                      </div>
                      <p className={`text-2xl font-bold ${profit > 0 ? 'text-green-400' : profit < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                        ${(profit * 1000).toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {marginPercent > 0 ? '+' : ''}{marginPercent.toFixed(1)}% margin
                      </p>
                    </div>

                    {/* Edit Button */}
                    <button
                      onClick={() => {
                        setEditingId(service.id);
                        setEditMargin(marginPercent);
                      }}
                      className="w-full text-xs py-2 px-3 bg-brand-accent/20 hover:bg-brand-accent/30 text-brand-accent rounded-lg transition-colors font-medium"
                    >
                      {isEditing ? 'Editing...' : 'Adjust Margin'}
                    </button>
                  </div>
                </div>

                {/* Edit Form */}
                {isEditing && (
                  <div className="mt-4 pt-4 border-t border-brand-border">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="text-xs text-gray-400">Target Margin %</label>
                        <Input
                          type="number"
                          value={editMargin}
                          onChange={(e) => setEditMargin(parseFloat(e.target.value) || 0)}
                          placeholder="e.g., 25"
                          className="mt-1"
                          min="0"
                          max="300"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400">Calculated Selling Price</label>
                        <div className="mt-1 bg-black/20 border border-brand-border rounded-lg p-2 text-sm font-semibold text-green-400">
                          ${(providerRate * (1 + editMargin / 100)).toFixed(4)}
                        </div>
                      </div>
                      <div className="flex items-end gap-2">
                        <Button
                          onClick={() => handleSaveMargin(service.id, editMargin)}
                          className="flex-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 py-2 px-3 rounded-lg text-sm font-medium"
                        >
                          Save
                        </Button>
                        <Button
                          onClick={() => setEditingId(null)}
                          className="flex-1 bg-gray-500/20 hover:bg-gray-500/30 text-gray-400 py-2 px-3 rounded-lg text-sm font-medium"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
