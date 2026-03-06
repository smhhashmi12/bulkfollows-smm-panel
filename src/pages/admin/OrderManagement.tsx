import React, { useState, useEffect } from 'react';
import { adminAPI, Order, Service, UserProfile } from '../../lib/api';
import { isTimeoutError } from '../../lib/utils';

const statusColors: { [key: string]: string } = {
  completed: 'bg-green-500/20 text-green-400',
  processing: 'bg-blue-500/20 text-blue-400',
  pending: 'bg-yellow-500/20 text-yellow-400',
  canceled: 'bg-red-500/20 text-red-400',
  failed: 'bg-purple-500/20 text-purple-400',
};

const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'canceled', label: 'Canceled' },
  { value: 'failed', label: 'Failed' },
];

interface OrderWithDetails extends Order {
  service?: Service;
  user?: UserProfile;
}

const OrderManagementPage: React.FC = () => {
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch orders on component mount and when filters change
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await adminAPI.getAllOrders();
        
        // In a real app, you might want to fetch user and service details for each order
        // For now, we'll just set the basic order data
        setOrders(data);
    } catch (err: any) {
        console.error('Error fetching orders:', err);
        setError(isTimeoutError(err) ? 'Request timed out. Please refresh.' : 'Failed to load orders. Please try again later.');
    } finally {
        setLoading(false);
    }
  };

  fetchOrders();
}, []);

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    if (!confirm(`Are you sure you want to update this order's status to ${newStatus}?`)) {
      return;
    }

    try {
      setIsUpdating(true);
      await adminAPI.updateOrderStatus(orderId, newStatus as any);
      
      // Update local state to reflect the change
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId ? { ...order, status: newStatus as any } : order
        )
      );
      
      // If we're viewing the order details, update that too
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, status: newStatus as any } : null);
      }
    } catch (err: any) {
      console.error('Error updating order status:', err);
      setError('Failed to update order status. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleViewDetails = (order: OrderWithDetails) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const filteredOrders = orders.filter(order => {
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesSearch = searchQuery === '' || 
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.user?.username?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (order.service?.name?.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesStatus && matchesSearch;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadge = (status: string) => (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status] || 'bg-gray-500/20 text-gray-400'}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-end mb-6 gap-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search orders..."
              className="bg-brand-input border border-brand-border rounded-lg px-4 py-2 pl-10 w-full sm:w-64 text-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <select
            className="bg-brand-input border border-brand-border rounded-lg px-4 py-2 text-white"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            {statusOptions.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {error && (
        <div className="mb-4 p-4 bg-red-500/20 text-red-400 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-brand-container border border-brand-border rounded-2xl">
        <div className="overflow-x-auto ds-scrollbar">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
              <p className="mt-2">Loading orders...</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
            <thead className="bg-black/20">
              <tr>
                <th className="p-4 font-semibold">Order ID</th>
                <th className="p-4 font-semibold">User</th>
                <th className="p-4 font-semibold">Service</th>
                <th className="p-4 font-semibold">Quantity</th>
                <th className="p-4 font-semibold">Amount</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold">Date</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-black/10">
                    <td className="p-4 font-mono text-xs">#{order.id.substring(0, 8)}...</td>
                    <td className="p-4">{order.user?.username || 'N/A'}</td>
                    <td className="p-4 text-gray-300">{order.service?.name || 'Service not found'}</td>
                    <td className="p-4">{order.quantity.toLocaleString()}</td>
                    <td className="p-4 font-mono text-green-400">${order.charge.toFixed(2)}</td>
                    <td className="p-4">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="p-4 text-gray-300 text-sm">
                      {formatDate(order.created_at)}
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleViewDetails(order)}
                          className="text-blue-400 hover:text-white p-1 rounded hover:bg-blue-500/20"
                          title="View Details"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                          </svg>
                        </button>
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                          className="bg-brand-input border border-brand-border rounded px-2 py-1 text-xs text-white"
                          disabled={isUpdating}
                        >
                          {statusOptions.map((status) => (
                            <option key={status.value} value={status.value}>
                              {status.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400">
                    No orders found{searchQuery ? ' matching your search' : ''}.
                  </td>
                </tr>
              )}
            </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Order Details Modal */}
      {isModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-brand-container border border-brand-border rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto ds-scrollbar">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold">Order Details</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Order Information</h3>
                <div className="space-y-2">
                  <p><span className="text-gray-400">Order ID:</span> <span className="font-mono">{selectedOrder.id}</span></p>
                  <p><span className="text-gray-400">Status:</span> {getStatusBadge(selectedOrder.status)}</p>
                  <p><span className="text-gray-400">Date:</span> {formatDate(selectedOrder.created_at)}</p>
                  <p><span className="text-gray-400">Last Updated:</span> {formatDate(selectedOrder.updated_at || selectedOrder.created_at)}</p>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">User Information</h3>
                <div className="space-y-2">
                  <p><span className="text-gray-400">Username:</span> {selectedOrder.user?.username || 'N/A'}</p>
                  <p><span className="text-gray-400">Email:</span> {selectedOrder.user?.email || 'N/A'}</p>
                  <p><span className="text-gray-400">User ID:</span> <span className="font-mono text-xs">{selectedOrder.user_id}</span></p>
                </div>
              </div>
              
              <div className="md:col-span-2">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Service Details</h3>
                <div className="bg-black/20 p-4 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-lg font-medium">{selectedOrder.service?.name || 'Service not found'}</p>
                      <p className="text-gray-400 text-sm">{selectedOrder.service?.category || 'N/A'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-400">${selectedOrder.charge.toFixed(2)}</p>
                      <p className="text-sm text-gray-400">{selectedOrder.quantity.toLocaleString()} × ${(selectedOrder.charge / selectedOrder.quantity).toFixed(4)} each</p>
                    </div>
                  </div>
                  {selectedOrder.service?.description && (
                    <p className="mt-3 text-sm text-gray-300">{selectedOrder.service.description}</p>
                  )}
                </div>
              </div>
              
              <div className="md:col-span-2">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Order Link</h3>
                <div className="bg-black/20 p-3 rounded-lg overflow-x-auto ds-scrollbar">
                  <code className="text-sm break-all">{selectedOrder.link}</code>
                </div>
              </div>
              
              <div className="md:col-span-2">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Update Status</h3>
                <div className="flex flex-wrap gap-2">
                  {statusOptions.map((status) => (
                    <button
                      key={status.value}
                      onClick={() => handleStatusUpdate(selectedOrder.id, status.value)}
                      disabled={isUpdating || selectedOrder.status === status.value}
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        selectedOrder.status === status.value
                          ? 'bg-blue-600 text-white'
                          : 'bg-brand-input hover:bg-blue-500/20 text-blue-400'
                      }`}
                    >
                      {status.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-brand-border">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Order Notes</h3>
              <textarea
                className="w-full bg-brand-input border border-brand-border rounded-lg p-3 text-white"
                rows={3}
                placeholder="Add internal notes about this order..."
              />
              <div className="mt-3 flex justify-end">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Save Notes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderManagementPage;
