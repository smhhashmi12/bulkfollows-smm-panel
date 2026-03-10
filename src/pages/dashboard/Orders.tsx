import React, { useRef, useState, useEffect } from 'react';
import { ordersAPI } from '../../lib/api';
import { withTimeout } from '../../lib/withTimeout';
import type { Order } from '../../lib/api';
import { useCurrency } from '../../lib/CurrencyContext';
import { supabase } from '../../lib/supabase';

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
  const ordersRef = useRef<Order[]>([]);

  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  useEffect(() => {
    const loadOrders = async () => {
      try {
        console.log('[Orders] Loading orders...');
        
        const userOrders = await withTimeout(ordersAPI.getOrders(), 8000, [], 'orders page list');
        console.log('[Orders] Orders loaded:', userOrders);
        setOrders(userOrders as Order[]);

        // Fire-and-forget: pull provider status into local orders (status/start_count/remains).
        void syncProviderStatuses(userOrders as Order[]);
      } catch (err: any) {
        console.error('[Orders] Error loading orders:', err);
        setError(err?.message === 'User not authenticated' ? 'Please login to view your orders' : (err.message || 'Failed to load orders'));
      } finally {
        setLoading(false);
      }
    };
    loadOrders();
  }, []);

  const syncProviderStatuses = async (ordersSnapshot: Order[]) => {
    try {
      const terminal = new Set(['completed', 'failed', 'canceled']);
      const orderIdsToSync = ordersSnapshot
        .filter((order) => {
          if (!order.provider_id || !order.provider_order_id) return false;
          const status = String(order.status || '').toLowerCase();
          const needsProgressFields =
            order.start_count === null ||
            order.start_count === undefined ||
            order.remains === null ||
            order.remains === undefined;
          return !terminal.has(status) || needsProgressFields;
        })
        .map((order) => order.id);

      if (orderIdsToSync.length === 0) return;

      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 12000);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (session?.access_token) {
          headers.Authorization = `Bearer ${session.access_token}`;
        }

        const resp = await fetch('/api/provider/sync-local-orders', {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({ order_ids: orderIdsToSync }),
          signal: controller.signal,
        });

        if (!resp.ok) {
          console.warn('[Orders] provider sync failed:', resp.status, resp.statusText);
          return;
        }

        const payload = await resp.json();
        const updatedOrders = Array.isArray(payload?.updatedOrders) ? payload.updatedOrders : [];
        if (updatedOrders.length === 0) return;

        const updatesById = new Map<string, Partial<Order>>(
          updatedOrders
            .filter((entry: any) => entry?.id)
            .map((entry: any) => [
              String(entry.id),
              {
                status: entry.status,
                provider_id: entry.provider_id ?? null,
                provider_order_id: entry.provider_order_id ?? null,
                start_count: entry.start_count ?? null,
                remains: entry.remains ?? null,
              } as Partial<Order>,
            ])
        );

        setOrders((prev) =>
          prev.map((order) => {
            const patch = updatesById.get(order.id);
            return patch ? { ...order, ...patch } : order;
          })
        );
      } finally {
        window.clearTimeout(timeoutId);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        console.warn('[Orders] provider sync timed out');
        return;
      }
      console.warn('[Orders] provider sync error:', err);
    }
  };

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void syncProviderStatuses(ordersRef.current);
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
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
    <div >
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
          <table className="w-full table-fixed text-sm text-left">
            <thead className="bg-black/20">
              <tr>
                <th className="px-4 py-3 font-semibold w-40">Order ID</th>
                <th className="px-4 py-3 font-semibold w-28">Date</th>
                <th className="px-4 py-3 font-semibold w-72">Service</th>
                <th className="px-4 py-3 font-semibold w-80">Link</th>
                <th className="px-4 py-3 font-semibold w-20">Start</th>
                <th className="px-4 py-3 font-semibold w-24">Quantity</th>
                <th className="px-4 py-3 font-semibold w-24">Remains</th>
                <th className="px-4 py-3 font-semibold w-24">Charge</th>
                <th className="px-4 py-3 font-semibold w-28">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {orders.map(order => {
                const displayStatus =
                  order.status === 'pending' && order.provider_order_id ? 'processing' : order.status;

                return (
                <tr key={order.id} className="hover:bg-black/10">
                  <td className="px-4 py-3">
                    <div>#{order.id.slice(0, 8)}</div>
                    {order.provider_order_id && (
                      <div className="text-xs text-gray-400 mt-1">Provider: {order.provider_order_id}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-300 ">{formatDate(order.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="w-full truncate" title={order.service?.name || ''}>
                      {order.service?.name || 'N/A'}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    <div className="w-full truncate" title={order.link}>
                      {order.link}
                    </div>
                  </td>
                  <td className="px-4  text-gray-200">
                    {order.start_count === null || order.start_count === undefined
                      ? '-'
                      : Number(order.start_count).toLocaleString()}
                  </td>
                  <td className="px-4 ">{order.quantity.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-200">
                    {order.remains === null || order.remains === undefined
                      ? '-'
                      : Number(order.remains).toLocaleString()}
                  </td>
                  <td className="px-4  font-medium text-green-400 ">{formatAmount(order.charge)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
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
