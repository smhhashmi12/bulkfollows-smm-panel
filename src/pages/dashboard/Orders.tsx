import React, { useState, useEffect } from 'react';
import { ordersAPI } from '../../lib/api';
import { getCachedAuthUser } from '../../lib/useAuthCheck';
import { withTimeout } from '../../lib/withTimeout';
import type { Order } from '../../lib/api';
import { useCurrency } from '../../lib/CurrencyContext';

const statusColors: { [key: string]: string } = {
  completed: 'bg-green-500/20 text-green-400',
  processing: 'bg-blue-500/20 text-blue-400',
  pending: 'bg-yellow-500/20 text-yellow-400',
  canceled: 'bg-red-500/20 text-red-400',
  failed: 'bg-red-500/20 text-red-400',
};

const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { formatAmount } = useCurrency();

  useEffect(() => {
    const loadOrders = async () => {
      try {
        console.log('[Orders] Loading orders...');
        
        // Check if user is authenticated using cached result
        const user = await getCachedAuthUser();
        if (!user) {
          console.log('[Orders] User not authenticated, redirecting to login');
          window.location.hash = '#/login';
          return;
        }
        
        const userOrders = await withTimeout(ordersAPI.getOrders(), 8000, [], 'orders page list');
        console.log('[Orders] Orders loaded:', userOrders);
        setOrders(userOrders as Order[]);
      } catch (err: any) {
        console.error('[Orders] Error loading orders:', err);
        setError(err?.message === 'User not authenticated' ? 'Please login to view your orders' : (err.message || 'Failed to load orders'));
      } finally {
        setLoading(false);
      }
    };
    loadOrders();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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
      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400 text-sm">
          {error}
        </div>
      )}
      {orders.length === 0 ? (
        <div className="bg-brand-container border border-brand-border rounded-2xl p-8 text-center">
          <p className="text-gray-400">No orders yet. Create your first order!</p>
        </div>
      ) : (
        <div className="bg-brand-container border border-brand-border rounded-2xl">
          <div className="overflow-x-auto ds-scrollbar">
          <table className="w-full text-sm text-left">
            <thead className="bg-black/20">
              <tr>
                <th className="p-4 font-semibold">Order ID</th>
                <th className="p-4 font-semibold">Date</th>
                <th className="p-4 font-semibold">Service</th>
                <th className="p-4 font-semibold">Link</th>
                <th className="p-4 font-semibold">Quantity</th>
                <th className="p-4 font-semibold">Charge</th>
                <th className="p-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {orders.map(order => {
                const displayStatus =
                  order.status === 'pending' && order.provider_order_id ? 'processing' : order.status;

                return (
                <tr key={order.id} className="hover:bg-black/10">
                  <td className="p-4">
                    <div>#{order.id.slice(0, 8)}</div>
                    {order.provider_order_id && (
                      <div className="text-xs text-gray-400 mt-1">Provider: {order.provider_order_id}</div>
                    )}
                  </td>
                  <td className="p-4 text-gray-300">{formatDate(order.created_at)}</td>
                  <td className="p-4">{order.service?.name || 'N/A'}</td>
                  <td className="p-4 text-gray-300 truncate max-w-xs">{order.link}</td>
                  <td className="p-4">{order.quantity.toLocaleString()}</td>
                  <td className="p-4 font-medium text-green-400">{formatAmount(order.charge)}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[displayStatus] || statusColors.pending}`}>
                      {displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}
                    </span>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersPage;
