import React, { useState, useEffect } from 'react';
import StatCard from '../../components/dashboard/StatCard';
import { authAPI, ordersAPI, paymentsAPI, adminAPI } from '../../lib/api';
import type { UserProfile, Order, Payment } from '../../lib/api';
import { useCurrency } from '../../lib/CurrencyContext';
import { Card, Badge } from '../../design-system';

interface AdminStats {
    totalEarnings: number;
    totalUsers: number;
    totalOrders: number;
    pendingTickets: number;
    recentOrders: Order[];
}

const AdminDashboardPage: React.FC = () => {
    const [stats, setStats] = useState<AdminStats>({
        totalEarnings: 0,
        totalUsers: 0,
        totalOrders: 0,
        pendingTickets: 0,
        recentOrders: [],
    });
    const [loading, setLoading] = useState(true);
    const { formatAmount } = useCurrency();

    useEffect(() => {
        const loadData = async () => {
            try {
                console.log('[AdminDashboard] Loading admin data...');
                
                const [allOrders, adminProfile, totalUsers, pendingTickets] = await Promise.all([
                    adminAPI.getAllOrders(),
                    authAPI.getUserProfile(),
                    adminAPI.getUsersCount(),
                    adminAPI.getSupportTicketsCount(),
                ]);

                // Calculate stats from real data
                const totalEarnings = allOrders.reduce((sum, order) => sum + (order.charge || 0), 0);
                const recentOrders = allOrders.slice(0, 5);

                setStats({
                    totalEarnings,
                    totalUsers,
                    totalOrders: allOrders.length,
                    pendingTickets,
                    recentOrders,
                });
            } catch (error) {
                console.error('[AdminDashboard] Failed to load admin dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-purple"></div>
            </div>
        );
    }
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title="Total Earnings" 
                    numericValue={stats.totalEarnings}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01" /></svg>}
                    color="green"
                />
                <StatCard 
                    title="Total Orders" 
                    value={stats.totalOrders.toString()}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>}
                    color="purple"
                />
                <StatCard 
                    title="Active Users" 
                    value={stats.totalUsers.toString()}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
                    color="blue"
                />
                <StatCard 
                    title="Support Tickets" 
                    value={stats.pendingTickets.toString()}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
                    color="red"
                />
            </div>

            <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold">Recent Orders</h2>
                    <Badge variant="default">{stats.recentOrders.length}</Badge>
                </div>
                {stats.recentOrders.length === 0 ? (
                    <p className="text-gray-400">No orders yet.</p>
                ) : (
                    <div className="overflow-x-auto ds-scrollbar">
                        <table className="w-full text-sm">
                            <thead className="border-b border-brand-border">
                                <tr>
                                    <th className="text-left py-3 px-4 font-semibold">Order ID</th>
                                    <th className="text-left py-3 px-4 font-semibold">Amount</th>
                                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                                    <th className="text-left py-3 px-4 font-semibold">Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.recentOrders.map(order => (
                                    <tr key={order.id} className="border-b border-brand-border/30 hover:bg-black/20">
                                        <td className="py-3 px-4 font-mono text-xs">{order.id.substring(0, 8)}...</td>
                                        <td className="py-3 px-4 text-green-400 font-semibold">{formatAmount(order.charge)}</td>
                                        <td className="py-3 px-4">
                                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                                order.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                                order.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                                'bg-red-500/20 text-red-400'
                                            }`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-gray-400 text-xs">{new Date(order.created_at).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default AdminDashboardPage;
