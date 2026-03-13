import React, { useState, useEffect, useCallback } from 'react';
import { earningsAPI } from '../../lib/providerAndEarningsAPI';

interface EarningsSummary {
  totalRevenue: number;
  totalExpenses: number;
  platformProfit: number;
  orderCount: number;
  profitMargin: number;
}

interface FinancialData {
  date: string;
  revenue: number;
  expenses: number;
  profit: number;
  orders: number;
}

interface ProviderSplit {
  provider_id: string;
  provider_name: string;
  revenue: number;
  expenses: number;
  profit: number;
  orders: number;
}

const EarningsDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [summary, setSummary] = useState<EarningsSummary>({
    totalRevenue: 0,
    totalExpenses: 0,
    platformProfit: 0,
    orderCount: 0,
    profitMargin: 0,
  });
  const [reportData, setReportData] = useState<FinancialData[]>([]);
  const [providerSplit, setProviderSplit] = useState<ProviderSplit[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const report = await earningsAPI.getFinancialReport(dateRange.startDate, dateRange.endDate);
      const rows = (report.summaries || []).map((s: any) => ({
        date: s.date,
        revenue: Number(s.total_customer_charges || 0),
        expenses: Number(s.total_provider_costs || 0),
        profit: Number(s.net_profit || 0),
        orders: Number(s.total_orders || 0),
      }));
      setReportData(rows);
      setProviderSplit((report.providerBreakdown || []).map((row: any) => ({
        provider_id: String(row.provider_id),
        provider_name: String(row.provider_name || 'Unknown Provider'),
        revenue: Number(row.revenue || 0),
        expenses: Number(row.expenses || 0),
        profit: Number(row.profit || 0),
        orders: Number(row.orders || 0),
      })));

      const totalRevenue = Number(report?.totals?.totalCustomerCharges || 0);
      const totalExpenses = Number(report?.totals?.totalProviderCosts || 0);
      const totalProfit = Number(report?.totals?.totalProfit || 0);
      const totalOrders = Number(report?.totals?.totalOrders || 0);

      setSummary({
        totalRevenue,
        totalExpenses,
        platformProfit: totalProfit,
        orderCount: totalOrders,
        profitMargin: totalRevenue > 0 ? Number(((totalProfit / totalRevenue) * 100).toFixed(2)) : 0,
      });
    } catch (err: any) {
      console.error('[EarningsDashboard] Error:', err);
      setError(err.message || 'Failed to load earnings data');
    } finally {
      setLoading(false);
    }
  }, [dateRange.startDate, dateRange.endDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-purple"></div>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
          {error}
        </div>
      )}

      <div className="mb-8 bg-brand-container border border-brand-border rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="earnings-start-date" className="block text-sm font-medium text-gray-300 mb-2">Start Date</label>
            <input
              type="date"
              id="earnings-start-date"
              name="earningsStartDate"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="w-full px-3 py-2 border border-brand-border bg-brand-input text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-purple"
            />
          </div>
          <div>
            <label htmlFor="earnings-end-date" className="block text-sm font-medium text-gray-300 mb-2">End Date</label>
            <input
              type="date"
              id="earnings-end-date"
              name="earningsEndDate"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="w-full px-3 py-2 border border-brand-border bg-brand-input text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-purple"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={loadData}
              className="w-full bg-brand-accent hover:bg-brand-purple text-white px-4 py-2 rounded-lg transition"
            >
              Generate Report
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-brand-container border border-brand-border rounded-lg p-6">
          <h3 className="text-gray-400 text-sm font-medium mb-2">Total Revenue</h3>
          <p className="text-3xl font-bold text-green-400">${summary.totalRevenue.toFixed(2)}</p>
          <p className="text-gray-500 text-xs mt-2">From all customers</p>
        </div>
        <div className="bg-brand-container border border-brand-border rounded-lg p-6">
          <h3 className="text-gray-400 text-sm font-medium mb-2">Total Expenses</h3>
          <p className="text-3xl font-bold text-red-400">${summary.totalExpenses.toFixed(2)}</p>
          <p className="text-gray-500 text-xs mt-2">Paid to providers</p>
        </div>
        <div className="bg-brand-container border border-brand-border rounded-lg p-6">
          <h3 className="text-gray-400 text-sm font-medium mb-2">Platform Profit</h3>
          <p className="text-3xl font-bold text-brand-light-purple">${summary.platformProfit.toFixed(2)}</p>
          <p className="text-gray-500 text-xs mt-2">Net profit earned</p>
        </div>
        <div className="bg-brand-container border border-brand-border rounded-lg p-6">
          <h3 className="text-gray-400 text-sm font-medium mb-2">Profit Margin</h3>
          <p className="text-3xl font-bold text-brand-purple">{summary.profitMargin}%</p>
          <p className="text-gray-500 text-xs mt-2">Average margin</p>
        </div>
      </div>

      <div className="bg-brand-container border border-brand-border rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-brand-border">
          <h2 className="text-lg font-semibold text-white">Daily Financial Summary</h2>
          <p className="text-sm text-gray-400">({reportData.length} days)</p>
        </div>
        <div className="overflow-x-auto ds-scrollbar">
          <table className="w-full">
            <thead className="bg-black/30 border-b border-brand-border">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Date</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Revenue</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Expenses</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Profit</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Orders</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/50">
              {reportData.length > 0 ? (
                reportData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-white/5">
                    <td className="px-6 py-3 text-sm text-gray-300">{row.date}</td>
                    <td className="px-6 py-3 text-sm text-gray-300">${row.revenue.toFixed(2)}</td>
                    <td className="px-6 py-3 text-sm text-gray-300">${row.expenses.toFixed(2)}</td>
                    <td className="px-6 py-3 text-sm font-semibold text-green-400">${row.profit.toFixed(2)}</td>
                    <td className="px-6 py-3 text-sm text-gray-300">{row.orders}</td>
                    <td className="px-6 py-3 text-sm text-gray-300">
                      {row.revenue > 0 ? ((row.profit / row.revenue) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No data available for the selected date range
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8 bg-brand-container border border-brand-border rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-brand-border">
          <h2 className="text-lg font-semibold text-white">Provider-wise Earnings Split</h2>
          <p className="text-sm text-gray-400">({providerSplit.length} providers)</p>
        </div>
        <div className="overflow-x-auto ds-scrollbar">
          <table className="w-full">
            <thead className="bg-black/30 border-b border-brand-border">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Provider</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Revenue</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Provider Cost</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Profit</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Orders</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border/50">
              {providerSplit.length > 0 ? (
                providerSplit.map((row) => (
                  <tr key={row.provider_id} className="hover:bg-white/5">
                    <td className="px-6 py-3 text-sm text-gray-300">{row.provider_name}</td>
                    <td className="px-6 py-3 text-sm text-gray-300">${row.revenue.toFixed(2)}</td>
                    <td className="px-6 py-3 text-sm text-gray-300">${row.expenses.toFixed(2)}</td>
                    <td className="px-6 py-3 text-sm font-semibold text-green-400">${row.profit.toFixed(2)}</td>
                    <td className="px-6 py-3 text-sm text-gray-300">{row.orders}</td>
                    <td className="px-6 py-3 text-sm text-gray-300">
                      {row.revenue > 0 ? ((row.profit / row.revenue) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No provider-wise data available for selected range
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EarningsDashboard;
