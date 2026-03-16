import React, { useState, useEffect } from 'react';

const Logo: React.FC = () => (
    <div className="flex items-center space-x-2 px-2">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" fill="url(#grad1)"/><path d="M12 2L12 12L22 7L12 2Z" fill="url(#grad2)"/><path d="M2 7L12 12L12 22L2 17V7Z" fill="url(#grad3)"/><path d="M12 12L22 17L22 7L12 12Z" fill="url(#grad4)"/>
        <defs>
          <linearGradient id="grad1" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse"><stop stopColor="#A855F7"/><stop offset="1" stopColor="#6D28D9"/></linearGradient>
          <linearGradient id="grad2" x1="17" y1="2" x2="17" y2="12" gradientUnits="userSpaceOnUse"><stop stopColor="#F472B6"/><stop offset="1" stopColor="#EC4899"/></linearGradient>
          <linearGradient id="grad3" x1="7" y1="7" x2="7" y2="22" gradientUnits="userSpaceOnUse"><stop stopColor="#60A5FA"/><stop offset="1" stopColor="#3B82F6"/></linearGradient>
          <linearGradient id="grad4" x1="17" y1="7" x2="17" y2="17" gradientUnits="userSpaceOnUse"><stop stopColor="#A78BFA"/><stop offset="1" stopColor="#8B5CF6"/></linearGradient>
        </defs>
      </svg>
      <a href="/#"><span className="text-xl font-bold">BulkFollows</span></a>
    </div>
  );
  

// Fix: Changed JSX.Element to React.ReactNode to resolve namespace error.
const NavLink: React.FC<{
    href: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    active: boolean;
    onClick?: () => void;
    onHover?: () => void;
}> = ({ href, icon, children, active, onClick, onHover }) => (
 <a
    href={href}
    onClick={onClick}
    onMouseEnter={onHover}
    className="flex items-center space-x-3 rounded-xl"
 >
        <div className={`w-[13rem] h-10 flex items-center gap-3 px-4 ${active ? 'bg-gradient-to-r from-brand-accent to-brand-purple text-white shadow-purple-glow-sm' : 'text-gray-300 hover:bg-white/10 hover:text-white'} rounded-lg transition-colors duration-200`}>
            {icon}
        <span className="font-medium">{children}</span>
        </div>
    </a>
)

const Sidebar: React.FC<{ isOpen?: boolean; onClose?: () => void }> = ({ isOpen = false, onClose }) => {
    const [activePage, setActivePage] = useState('dashboard');
    
    useEffect(() => {
        const handleHashChange = () => {
            setActivePage(window.location.hash.split('/')[2] || 'dashboard');
        };
        window.addEventListener('hashchange', handleHashChange);
        handleHashChange();
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    const navItems = [
        { id: 'dashboard', href: '#/admin/dashboard', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>, label: 'Dashboard' },
        { id: 'users', href: '#/admin/users', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg>, label: 'Users' },
        { id: 'services', href: '#/admin/services', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>, label: 'Services' },
        { id: 'pricing', href: '#/admin/pricing', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M8.16 2.3a1 1 0 00-.96 0l-5 2.6A1 1 0 001 5.89v8.22a1 1 0 00.84 1.99l5-2.6a1 1 0 00.96 0l5 2.6a1 1 0 00.84-.99V5.89a1 1 0 00-.84-1.99l-5-2.6z" /></svg>, label: 'Pricing Control' },
        { id: 'providers', href: '#/admin/providers', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M11 17a1 1 0 001.447.894l4-2A1 1 0 0017 15V5a1 1 0 00-1.447-.894l-4 2A1 1 0 0011 7v10zM4 17a1 1 0 001.447.894l4-2A1 1 0 0010 15V5a1 1 0 00-1.447-.894l-4 2A1 1 0 004 7v10z" /></svg>, label: 'Providers' },
        { id: 'provider-margins', href: '#/admin/provider-margins', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M11 3a1 1 0 10-2 0v1H7a1 1 0 000 2h2v2H7a1 1 0 000 2h2v2H7a1 1 0 000 2h2v1a1 1 0 102 0v-1h2a1 1 0 100-2h-2v-2h2a1 1 0 100-2h-2V6h2a1 1 0 100-2h-2V3z" /></svg>, label: 'Provider Margins' },
        { id: 'orders', href: '#/admin/orders', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h.01a1 1 0 100-2H10zm3 0a1 1 0 000 2h.01a1 1 0 100-2H13z" clipRule="evenodd" /></svg>, label: 'Orders' },
        { id: 'earnings', href: '#/admin/earnings', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M8.16 2.3a1 1 0 00-.96 0l-5 2.6A1 1 0 001 5.89v8.22a1 1 0 00.84 1.99l5-2.6a1 1 0 00.96 0l5 2.6a1 1 0 00.84-.99V5.89a1 1 0 00-.84-1.99l-5-2.6zM9 5.41v7.78l4 2.05V7.46L9 5.41z" /></svg>, label: 'Earnings' },
        { id: 'payouts', href: '#/admin/payouts', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM15.657 14.243a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM11 17a1 1 0 102 0v-1a1 1 0 10-2 0v1zM4.343 14.243a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM2 10a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM4.343 5.757a1 1 0 000-1.414L3.636 3.636a1 1 0 00-1.414 1.414l.707.707zM10 5a1 1 0 011 1v5a1 1 0 11-2 0V6a1 1 0 011-1z" /></svg>, label: 'Payouts' },
        { id: 'payments', href: '#/admin/payments', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" /><path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" /></svg>, label: 'Payment Logs' },
        { id: 'support', href: '#/admin/support', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" /></svg>, label: 'Support Tickets' },
        { id: 'chat', href: '#/admin/chat', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H8l-4 3v-3H4a2 2 0 01-2-2V5z" /></svg>, label: 'Live Chat' },
        { id: 'announcements', href: '#/admin/announcements', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5.951-1.429 5.951 1.429a1 1 0 001.169-1.409l-7-14z" /></svg>, label: 'Announcements' },
        { id: 'settings', href: '#/admin/settings', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M11.3 1.046a1 1 0 00-2.6 0l-.2.69a6.966 6.966 0 00-1.9.86l-.66-.34a1 1 0 00-1.08.18l-.5.5a1 1 0 00.18 1.5l.66.5a7.02 7.02 0 000 1.72l-.66.5a1 1 0 00-.18 1.5l.5.5a1 1 0 001.08.18l.66-.34c.6.38 1.27.68 1.95.86l.2.69a1 1 0 002.6 0l.2-.69c.68-.18 1.35-.48 1.95-.86l.66.34a1 1 0 001.08-.18l.5-.5a1 1 0 00-.18-1.5l-.66-.5a7.02 7.02 0 000-1.72l.66-.5a1 1 0 00.18-1.5l-.5-.5a1 1 0 00-1.08-.18l-.66.34a6.966 6.966 0 00-1.95-.86l-.2-.69zM10 13a3 3 0 110-6 3 3 0 010 6z" /></svg>, label: 'Settings' },
    ];

    const handleLinkClick = () => {
        if (onClose) onClose();
    };

    const prefetchAdminRoute = (id: string) => {
        switch (id) {
            case 'users':
                void import('../../pages/admin/UserManagement');
                break;
            case 'services':
                void import('../../pages/admin/ServiceManagement');
                break;
            case 'pricing':
                void import('../../pages/admin/ServicePricingDashboard');
                break;
            case 'providers':
                void import('../../pages/admin/ProviderManagement');
                break;
            case 'provider-margins':
                void import('../../pages/admin/ProviderMarginManager');
                break;
            case 'orders':
                void import('../../pages/admin/OrderManagement');
                break;
            case 'payments':
                void import('../../pages/admin/PaymentLogs');
                break;
            case 'support':
                void import('../../pages/admin/SupportTickets');
                break;
            case 'announcements':
                void import('../../pages/admin/Announcements');
                break;
            case 'earnings':
                void import('../../pages/admin/EarningsDashboard');
                break;
            case 'payouts':
                void import('../../pages/admin/ProviderPayouts');
                break;
            case 'chat':
                void import('../../pages/admin/Chat');
                break;
            case 'settings':
                void import('../../pages/admin/SettingsPanel');
                break;
            default:
                void import('../../pages/admin/Dashboard');
                break;
        }
    };

    return (
        <>
            <aside className="w-[15rem] ds-sidebar rounded-2xl m-3 py-4 hidden md:flex flex-col">
                <div className="py-2 mb-4 flex items-center justify-center gap-1">
                    <Logo />
                    <span className="bg-red-500/20 text-red-400 text-xs  px-2 py-1 rounded-md">ADMIN</span>
                </div>
                <nav className="flex-1 flex flex-col space-y-2">
                    {navItems.map(item => (
                        <NavLink
                            key={item.id}
                            href={item.href}
                            icon={item.icon}
                            active={activePage === item.id}
                            onHover={() => prefetchAdminRoute(item.id)}
                        >
                            {item.label}
                        </NavLink>
                    ))}
                </nav>
            </aside>

            <div className={`fixed inset-0 z-40 md:hidden ${isOpen ? 'block' : 'pointer-events-none'}`}>
                <div
                    className={`absolute inset-0 bg-black/60 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0'}`}
                    onClick={onClose}
                />
                <aside
                    className={`absolute left-0 top-0 h-full w-72 max-w-[80%] ds-sidebar p-4 transition-transform ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
                >
                    <div className="py-4 mb-4 flex items-center justify-between">
                        <Logo />
                        <div className="flex items-center gap-2">
                            <span className="bg-red-500/20 text-red-400 text-xs font-bold px-2 py-1 rounded-md">ADMIN</span>
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-white transition"
                                aria-label="Close menu"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    <nav className="flex-1 flex flex-col space-y-2">
                        {navItems.map(item => (
                            <NavLink
                                key={item.id}
                                href={item.href}
                                icon={item.icon}
                                active={activePage === item.id}
                                onClick={handleLinkClick}
                                onHover={() => prefetchAdminRoute(item.id)}
                            >
                                {item.label}
                            </NavLink>
                        ))}
                    </nav>
                </aside>
            </div>
        </>
    );
};

export default Sidebar;
