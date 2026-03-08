import React, { useState, useEffect } from 'react';

const Logo: React.FC = () => (
    <div className="flex items-center space-x-2 px-4">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" fill="url(#grad1)"/>
        <path d="M12 2L12 12L22 7L12 2Z" fill="url(#grad2)"/>
        <path d="M2 7L12 12L12 22L2 17V7Z" fill="url(#grad3)"/>
        <path d="M12 12L22 17L22 7L12 12Z" fill="url(#grad4)"/>
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
const NavLink: React.FC<{ href: string; icon: React.ReactNode; children: React.ReactNode; active: boolean; onClick?: () => void }> = ({ href, icon, children, active, onClick }) => (
    <a href={href} onClick={onClick} className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors duration-200 ${active ? 'bg-gradient-to-r from-brand-accent to-brand-purple text-white shadow-purple-glow-sm' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}>
        {icon}
        <span className="font-medium">{children}</span>
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
        { id: 'dashboard', href: '#/dashboard', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>, label: 'Dashboard' },
        { id: 'services', href: '#/dashboard/services', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm2 3h8a1 1 0 110 2H6a1 1 0 010-2zm0 4h8a1 1 0 110 2H6a1 1 0 010-2zm0 4h5a1 1 0 110 2H6a1 1 0 110-2z" /></svg>, label: 'Services' },
        { id: 'new-order', href: '#/dashboard/new-order', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>, label: 'New Order' },
        { id: 'add-funds', href: '#/dashboard/add-funds', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" /><path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" /></svg>, label: 'Add Funds' },
        { id: 'orders', href: '#/dashboard/orders', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h.01a1 1 0 100-2H10zm3 0a1 1 0 000 2h.01a1 1 0 100-2H13z" clipRule="evenodd" /></svg>, label: 'Orders' },
        { id: 'api', href: '#/dashboard/api', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>, label: 'API' },
        { id: 'support', href: '#/dashboard/support', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2.003 5.884L10 2.006l7.997 3.878A2 2 0 0119 7.616V16a2 2 0 01-2 2H3a2 2 0 01-2-2V7.616a2 2 0 011.003-1.732zM10 13a3 3 0 100-6 3 3 0 000 6z" /><path d="M10 13a3 3 0 100-6 3 3 0 000 6z" /></svg>, label: 'Support Tickets' },
    ];

    const handleLinkClick = () => {
        if (onClose) onClose();
    };

    return (
        <>
            <aside className="w-64 ds-sidebar rounded-2xl m-3 p-4 hidden md:flex flex-col">
                <div className="py-4 mb-4">
                    <Logo />
                </div>
                <nav className="flex-1 flex flex-col space-y-2">
                    {navItems.map(item => (
                        <NavLink key={item.id} href={item.href} icon={item.icon} active={activePage === item.id}>
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
                    <nav className="flex-1 flex flex-col space-y-2">
                        {navItems.map(item => (
                            <NavLink key={item.id} href={item.href} icon={item.icon} active={activePage === item.id} onClick={handleLinkClick}>
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
