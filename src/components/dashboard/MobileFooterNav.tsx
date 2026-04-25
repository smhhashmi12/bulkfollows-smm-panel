import React, { useEffect, useState } from 'react';
import { MessageSquare, Phone, User, Hexagon, Plus, Home, List, Wallet2 } from 'lucide-react';



const NavItem = ({ icon, label, isActive, href, badge }) => (
  <a
    href={href}
    className="flex flex-col items-center justify-center relative flex-1 h-full gap-1 transition-all"
    id={`nav-item-${label.toLowerCase()}`}
  >
    <div className={`p-1 rounded-lg transition-colors duration-300 ${isActive ? 'bg-gradient-to-r from-brand-accent to-brand-purple shadow-[0_0_50px_rgba(59,130,246,0.35)]' : 'text-text-muted hover:bg-gradient-to-r from-brand-accent to-brand-purple  hover:text-text-muted'}`}>
      {React.cloneElement(icon, { size: 20 })}
    </div>
    <span className={`text-[11px] font-semibold tracking-wide ${isActive ? 'text-primary' : 'text-text-muted'}`}>
      {label}
    </span>
    {badge && (
      <span className="absolute top-2 right-4 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
        {badge}
      </span>
    )}
  </a>
);

const MobileFooterNav = () => {
  const [activeTab, setActiveTab] = useState('menu');

  useEffect(() => {
    const updateActiveItem = () => {
      const route = window.location.hash.split('/')[2] || 'dashboard';
      if (route === 'dashboard') {
        setActiveTab('menu');
        return;
      }
      // Map 'add-funds' route to 'wallet' tab
      if (route === 'add-funds') {
        setActiveTab('wallet');
        return;
      }
      setActiveTab(route || 'menu');
    };

    updateActiveItem();
    window.addEventListener('hashchange', updateActiveItem);
    return () => window.removeEventListener('hashchange', updateActiveItem);
  }, []);

  return (
    <div className="fixed -bottom-1 left-0 right-0 flex justify-center  pointer-events-none z-[100]">
      <div className="relative w-full max-w-[600px] h-[72px] bg-gray-900   shadow-nav rounded-t-[16px]   pointer-events-auto flex items-center justify-around px-5">

        {/* Nav Items */}
        <NavItem
          icon={<Home />}
          label="Home"
          href="#/dashboard"
          isActive={activeTab === 'menu'}
        />
        <NavItem
          icon={<List />}
          label="Orders"
          href="#/dashboard/orders"
          isActive={activeTab === 'orders'}
        />

        {/* Center action button */}
        <div className="relative z-100 flex items-center justify-center p-4">
          <a
            href="#/dashboard/new-order"
            className="absolute -top-12 w-16 h-16  rounded-full flex items-center justify-center border-blue-500/40 text-blue-200 bg-gradient-to-r from-brand-accent to-brand-purple shadow-[0_0_50px_rgba(59,130,246,0.35)]"
            id="fab-button"
          >
            <Plus size={32} strokeWidth={2.5} />
          </a>
        </div>

        <NavItem
          icon={<User />}
          label="Support"
          href="#/dashboard/support"
          isActive={activeTab === 'support'}
        />
        <NavItem
          icon={<Wallet2 />}
          label="Wallet"
          href="#/dashboard/add-funds"
          isActive={activeTab === 'wallet'}
        />
      </div>
    </div>
  );
};

export default MobileFooterNav;
