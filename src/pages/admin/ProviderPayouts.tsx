import React, { useState, useEffect } from 'react';
import { earningsAPI, providerIntegrationAPI } from '../../lib/providerAndEarningsAPI';
import { adminAPI } from '../../lib/api';

interface Provider {
  id: string;
  name: string;
  balance: number;
  status: string;
  last_sync?: string;
}

interface Payout {
  id: string;
  provider_id: string;
  total_amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  payout_method: string;
  period_from: string;
  period_to: string;
  reference_number: string;
  created_at: string;
  processed_at?: string;
}

const ProviderPayoutsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [providers, setProviders] = useState<Provider[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutForm, setPayoutForm] = useState({
    payoutMethod: 'bank_transfer',
    payoutAccount: '',
    periodFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    periodTo: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('[ProviderPayouts] Loading providers and payouts...');
        const [providersData, payoutsData] = await Promise.all([
          adminAPI.getAllProviders(),
          earningsAPI.getProviderPayouts(), // Load all
        ]);

        setProviders(providersData || []);
        if (Array.isArray(payoutsData)) {
          setPayouts(payoutsData);
        }
      } catch (err: any) {
        console.error('[ProviderPayouts] Error:', err);
        setError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleCreatePayout = async () => {
    if (!selectedProvider) {
      setError('Please select a provider');
      return;
    }

    try {
      setError('');
      console.log('[ProviderPayouts] Creating payout...');

      const payout = await earningsAPI.createProviderPayout(
        selectedProvider,
        payoutForm.periodFrom,
        payoutForm.periodTo,
        payoutForm.payoutMethod,
        payoutForm.payoutAccount
      );

      setPayouts([payout, ...payouts]);
      setShowPayoutModal(false);
      setSelectedProvider('');
      setPayoutForm({
        payoutMethod: 'bank_transfer',
        payoutAccount: '',
        periodFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        periodTo: new Date().toISOString().split('T')[0],
      });
    } catch (err: any) {
      console.error('[ProviderPayouts] Error creating payout:', err);
      setError(err.message || 'Failed to create payout');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-purple"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-end items-start mb-8">
        <button
          onClick={() => setShowPayoutModal(true)}
          className="bg-brand-accent hover:bg-brand-purple text-white px-4 py-2 rounded-lg transition"
        >
          + Create Payout
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Create Payout Modal */}
      {showPayoutModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-brand-container border border-brand-border rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-white mb-4">Create New Payout</h2>

              {/* Provider Selection */}
              <div className="mb-4">
                <label htmlFor="payout-provider" className="block text-sm font-medium text-gray-300 mb-2">
                  Select Provider
                </label>
                <select
                  id="payout-provider"
                  name="payoutProvider"
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  className="w-full px-3 py-2 border border-brand-border bg-black/20 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-purple"
                >
                  <option value="">Choose a provider...</option>
                  {providers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} - Balance: ${Number(p.balance).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Period From */}
              <div className="mb-4">
                <label htmlFor="payout-period-from" className="block text-sm font-medium text-gray-300 mb-2">
                  Period From
                </label>
                <input
                  type="date"
                  id="payout-period-from"
                  name="payoutPeriodFrom"
                  value={payoutForm.periodFrom}
                  onChange={(e) =>
                    setPayoutForm({ ...payoutForm, periodFrom: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-brand-border bg-black/20 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-purple"
                />
              </div>

              {/* Period To */}
              <div className="mb-4">
                <label htmlFor="payout-period-to" className="block text-sm font-medium text-gray-300 mb-2">
                  Period To
                </label>
                <input
                  type="date"
                  id="payout-period-to"
                  name="payoutPeriodTo"
                  value={payoutForm.periodTo}
                  onChange={(e) =>
                    setPayoutForm({ ...payoutForm, periodTo: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-brand-border bg-black/20 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-purple"
                />
              </div>

              {/* Payout Method */}
              <div className="mb-4">
                <label htmlFor="payout-method" className="block text-sm font-medium text-gray-300 mb-2">
                  Payout Method
                </label>
                <select
                  id="payout-method"
                  name="payoutMethod"
                  value={payoutForm.payoutMethod}
                  onChange={(e) =>
                    setPayoutForm({ ...payoutForm, payoutMethod: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-brand-border bg-black/20 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-purple"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="paypal">PayPal</option>
                  <option value="crypto">Cryptocurrency</option>
                  <option value="check">Check</option>
                </select>
              </div>

              {/* Payout Account */}
              <div className="mb-6">
                <label htmlFor="payout-account" className="block text-sm font-medium text-gray-300 mb-2">
                  Account Details
                </label>
                <textarea
                  id="payout-account"
                  name="payoutAccount"
                  value={payoutForm.payoutAccount}
                  onChange={(e) =>
                    setPayoutForm({ ...payoutForm, payoutAccount: e.target.value })
                  }
                  placeholder="Bank details, PayPal email, or wallet address..."
                  className="w-full px-3 py-2 border border-brand-border bg-black/20 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-purple resize-none placeholder-gray-500"
                  rows={3}
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPayoutModal(false)}
                  className="flex-1 px-4 py-2 border border-brand-border text-gray-300 rounded-lg hover:bg-white/5 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreatePayout}
                  className="flex-1 px-4 py-2 bg-brand-accent hover:bg-brand-purple text-white rounded-lg transition"
                >
                  Create Payout
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Provider Balances Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {providers.slice(0, 4).map((provider) => (
            <div key={provider.id} className="bg-brand-container border border-brand-border rounded-lg p-6">
              <h3 className="text-gray-400 text-sm font-medium mb-2">{provider.name}</h3>
              <p className="text-2xl font-bold text-brand-light-purple">
                ${Number(provider.balance).toFixed(2)}
              </p>
              <p className="text-gray-500 text-xs mt-2">
                {provider.status === 'active' ? '✓ Active' : '✗ Inactive'}
              </p>
            </div>
          ))}
        </div>

        {/* Payouts Table */}
        <div className="bg-brand-container border border-brand-border rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-brand-border">
            <h2 className="text-lg font-semibold text-white">Payout History</h2>
          </div>

          <div className="overflow-x-auto ds-scrollbar">
            <table className="w-full">
              <thead className="bg-black/30 border-b border-brand-border">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                    Reference
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                    Provider
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/50">
                {payouts.length > 0 ? (
                  payouts.map((payout) => (
                    <tr key={payout.id} className="hover:bg-white/5">
                      <td className="px-6 py-3 text-sm font-mono text-gray-300">
                        {payout.reference_number}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-300">
                        {providers.find((p) => p.id === payout.provider_id)?.name || 'N/A'}
                      </td>
                      <td className="px-6 py-3 text-sm font-semibold text-green-400">
                        ${payout.total_amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-300">
                        {new Date(payout.period_from).toLocaleDateString()} to{' '}
                        {new Date(payout.period_to).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3 text-sm">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            payout.status === 'completed'
                              ? 'bg-green-500/20 text-green-400'
                              : payout.status === 'processing'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : payout.status === 'failed'
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-gray-500/20 text-gray-400'
                          }`}
                        >
                          {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-300">
                        {new Date(payout.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      No payouts created yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payout Methods Info */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-6">
            <h3 className="font-semibold text-blue-300 mb-2">🏦 Bank Transfer</h3>
            <p className="text-sm text-blue-200">Direct bank transfer - 2-3 business days</p>
          </div>
          <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-6">
            <h3 className="font-semibold text-green-300 mb-2">💳 PayPal</h3>
            <p className="text-sm text-green-200">PayPal wallet - Instant transfer</p>
          </div>
          <div className="bg-purple-500/20 border border-purple-500/50 rounded-lg p-6">
            <h3 className="font-semibold text-purple-300 mb-2">₿ Cryptocurrency</h3>
            <p className="text-sm text-purple-200">Blockchain transfer - Network dependent</p>
          </div>
        </div>
    </div>
  );
};

export default ProviderPayoutsPage;
