import React, { useState, useEffect } from 'react';
import Sidebar from '../components/dashboard/Sidebar';
import DashboardHeader from '../components/dashboard/Header';
import { DashboardLayout } from '../design-system';
import DashboardPage from './dashboard/Dashboard';
import NewOrderPage from './dashboard/NewOrder';
import AddFundsPage from './dashboard/AddFunds';
import OrdersPage from './dashboard/Orders';
import ApiPage from './dashboard/Api';
import SupportPage from './dashboard/Support';
import { User } from '../App';

interface UserDashboardProps {
    user: User;
    onLogout: () => void;
}

const UserDashboard: React.FC<UserDashboardProps> = ({ user, onLogout }) => {
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
            {renderPage()}
        </DashboardLayout>
    );
};
export default UserDashboard;
