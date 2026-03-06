import React, { useState, useEffect } from 'react';
import Sidebar from '../components/admin/Sidebar';
import AdminHeader from '../components/admin/Header';
import { DashboardLayout } from '../design-system';
import AdminDashboardPage from './admin/Dashboard';
import UserManagementPage from './admin/UserManagement';
import ServiceManagementPage from './admin/ServiceManagement';
import ProviderManagementPage from './admin/ProviderManagement';
import ProviderServiceManagementPage from './admin/ProviderServiceManagement';
import SettingsPage from './admin/SettingsPanel';
import OrderManagementPage from './admin/OrderManagement';
import PaymentLogsPage from './admin/PaymentLogs';
import SupportTicketsPage from './admin/SupportTickets';
import AnnouncementsPage from './admin/Announcements';
import EarningsDashboardPage from './admin/EarningsDashboard';
import ProviderPayoutsPage from './admin/ProviderPayouts';
import AdminChatPage from './admin/Chat';


const AdminDashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
    const [page, setPage] = useState('dashboard');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    
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
            {renderPage()}
        </DashboardLayout>
    );
};
export default AdminDashboard;
