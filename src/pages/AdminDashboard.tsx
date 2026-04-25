import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
const AdminSidebar = lazy(() => import('../components/admin/Sidebar'));
const AdminHeader = lazy(() => import('../components/admin/Header'));

import { DashboardLayout } from '../design-system';
import { ServerHealthBanner } from '../components/admin/ServerHealthBanner';
const AdminDashboardPage = lazy(() => import('./admin/Dashboard'));

const loadAdminPage = (page: string) => {
    switch (page) {
        case 'users':
            return lazy(() => import('./admin/UserManagement'));
        case 'services':
            return lazy(() => import('./admin/ServiceManagement'));
        case 'pricing':
            return lazy(() => import('./admin/ServicePricingDashboard'));
        case 'providers':
            return lazy(() => import('./admin/ProviderManagement'));
        case 'provider-margins':
            return lazy(() => import('./admin/ProviderMarginManager'));
        case 'orders':
            return lazy(() => import('./admin/OrderManagement'));
        case 'payments':
            return lazy(() => import('./admin/PaymentLogs'));
        case 'support':
            return lazy(() => import('./admin/SupportTickets'));
        case 'announcements':
            return lazy(() => import('./admin/Announcements'));
        case 'earnings':
            return lazy(() => import('./admin/EarningsDashboard'));
        case 'payouts':
            return lazy(() => import('./admin/ProviderPayouts'));
        case 'chat':
            return lazy(() => import('./admin/Chat'));
        case 'settings':
            return lazy(() => import('./admin/SettingsPanel'));
        case 'dashboard':
        default:
            return AdminDashboardPage;
    }
};


const AdminDashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
    const [page, setPage] = useState('dashboard');
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const pageFallback = (
        <div className="bg-brand-container border border-brand-border rounded-2xl p-8 text-center text-gray-300">
            Loading page...
        </div>
    );
    
    useEffect(() => {
        const handleHashChange = () => {
            const currentHash = window.location.hash.split('/')[2] || 'dashboard';
            setPage(currentHash);
            setSidebarOpen(false);
        };
        window.addEventListener('hashchange', handleHashChange);
        handleHashChange(); // Initial load
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    const PageComponent = useMemo(() => loadAdminPage(page), [page]);

    return (
        <DashboardLayout
            sidebar={
                <Suspense fallback={null}>
                    <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
                </Suspense>
            }
            navbar={
                <Suspense fallback={null}>
                    <AdminHeader onLogout={onLogout} onToggleSidebar={() => setSidebarOpen(true)} />
                </Suspense>
            }
            
        >
            <div className="space-y-4">
                <ServerHealthBanner />
                <Suspense fallback={pageFallback}>
                    <PageComponent />
                </Suspense>
            </div>
        </DashboardLayout>
    );
};
export default AdminDashboard;
