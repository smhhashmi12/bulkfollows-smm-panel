import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/dashboard/Sidebar';
import DashboardHeader from '../components/dashboard/Header';
import MobileFooterNav from '../components/dashboard/MobileFooterNav';
import { DashboardLayout } from '../design-system';
import type { User } from '../App';
import { ServerHealthBanner } from '../components/admin/ServerHealthBanner';

const DashboardPage = lazy(() => import('./dashboard/Dashboard'));

const loadUserPage = (page: string) => {
    switch (page) {
        case 'services':
            return lazy(() => import('./dashboard/Services'));
        case 'new-order':
            return lazy(() => import('./dashboard/NewOrder'));
        case 'add-funds':
            return lazy(() => import('./dashboard/AddFunds'));
        case 'orders':
            return lazy(() => import('./dashboard/Orders'));
        case 'api':
            return lazy(() => import('./dashboard/Api'));
        case 'support':
            return lazy(() => import('./dashboard/Support'));
        case 'dashboard':
        default:
            return DashboardPage;
    }
};

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

    const PageComponent = useMemo(() => loadUserPage(page), [page]);

    return (
        <DashboardLayout
            sidebar={<Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />}
            bottomNav={<MobileFooterNav />}
            navbar={<DashboardHeader user={user} onLogout={onLogout} onToggleSidebar={() => setSidebarOpen(true)} />}
            bottomNav={<MobileFooterNav />}
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
export default UserDashboard;
