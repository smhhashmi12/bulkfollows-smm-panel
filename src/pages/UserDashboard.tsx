import React, { Suspense, lazy, useEffect, useState } from 'react';
import Sidebar from '../components/dashboard/Sidebar';
import DashboardHeader from '../components/dashboard/Header';
import { DashboardLayout } from '../design-system';
import type { User } from '../App';

const DashboardPage = lazy(() => import('./dashboard/Dashboard'));
const NewOrderPage = lazy(() => import('./dashboard/NewOrder'));
const AddFundsPage = lazy(() => import('./dashboard/AddFunds'));
const OrdersPage = lazy(() => import('./dashboard/Orders'));
const ApiPage = lazy(() => import('./dashboard/Api'));
const SupportPage = lazy(() => import('./dashboard/Support'));

interface UserDashboardProps {
    user: User;
    onLogout: () => void;
}

const UserDashboard: React.FC<UserDashboardProps> = ({ user, onLogout }) => {
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
            case 'new-order': return <NewOrderPage />;
            case 'add-funds': return <AddFundsPage />;
            case 'orders': return <OrdersPage />;
            case 'api': return <ApiPage />;
            case 'support': return <SupportPage />;
            case 'dashboard':
            default: 
                return <DashboardPage />;
        }
    };

    return (
        <DashboardLayout
            sidebar={<Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />}
            navbar={<DashboardHeader user={user} onLogout={onLogout} onToggleSidebar={() => setSidebarOpen(true)} />}
        >
            <Suspense fallback={pageFallback}>
                {renderPage()}
            </Suspense>
        </DashboardLayout>
    );
};
export default UserDashboard;
