import React, { Suspense, lazy, useEffect, useState } from 'react';
import Sidebar from '../components/admin/Sidebar';
import AdminHeader from '../components/admin/Header';
import { DashboardLayout } from '../design-system';
const AdminDashboardPage = lazy(() => import('./admin/Dashboard'));
const UserManagementPage = lazy(() => import('./admin/UserManagement'));
const ServiceManagementPage = lazy(() => import('./admin/ServiceManagement'));
const ProviderManagementPage = lazy(() => import('./admin/ProviderManagement'));
const ProviderServiceManagementPage = lazy(() => import('./admin/ProviderServiceManagement'));
const SettingsPage = lazy(() => import('./admin/SettingsPanel'));
const OrderManagementPage = lazy(() => import('./admin/OrderManagement'));
const PaymentLogsPage = lazy(() => import('./admin/PaymentLogs'));
const SupportTicketsPage = lazy(() => import('./admin/SupportTickets'));
const AnnouncementsPage = lazy(() => import('./admin/Announcements'));
const EarningsDashboardPage = lazy(() => import('./admin/EarningsDashboard'));
const ProviderPayoutsPage = lazy(() => import('./admin/ProviderPayouts'));
const AdminChatPage = lazy(() => import('./admin/Chat'));


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

    const renderPage = () => {
        switch(page) {
            case 'users': return <UserManagementPage />;
            case 'services': return <ServiceManagementPage />;
            case 'providers': return <ProviderManagementPage />;
            case 'provider-services': return <ProviderServiceManagementPage />;
            case 'orders': return <OrderManagementPage />;
            case 'payments': return <PaymentLogsPage />;
            case 'support': return <SupportTicketsPage />;
            case 'announcements': return <AnnouncementsPage />;
            case 'earnings': return <EarningsDashboardPage />;
            case 'payouts': return <ProviderPayoutsPage />;
            case 'chat': return <AdminChatPage />;
            case 'settings': return <SettingsPage />;
            case 'dashboard':
            default: 
                return <AdminDashboardPage />;
        }
    };

    return (
        <DashboardLayout
            sidebar={<Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />}
            navbar={<AdminHeader onLogout={onLogout} onToggleSidebar={() => setSidebarOpen(true)} />}
        >
            <Suspense fallback={pageFallback}>
                {renderPage()}
            </Suspense>
        </DashboardLayout>
    );
};
export default AdminDashboard;
