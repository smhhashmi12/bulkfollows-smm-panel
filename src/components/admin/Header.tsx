import React, { useState } from 'react';
import { useCurrency, currencies } from '../../lib/CurrencyContext';
import { useNotifications } from '../../lib/NotificationContext';

const AdminHeader: React.FC<{ onLogout: () => void; onToggleSidebar?: () => void }> = ({ onLogout, onToggleSidebar }) => {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false);
    const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
    const { currency, setCurrency } = useCurrency();
    const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();

    return (
        <header className="ds-topbar px-4 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto">
                <button
                    onClick={onToggleSidebar}
                    className="md:hidden text-gray-400 hover:text-white transition"
                    aria-label="Open menu"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 5h14a1 1 0 010 2H3a1 1 0 110-2zm0 4h14a1 1 0 110 2H3a1 1 0 110-2zm0 4h14a1 1 0 110 2H3a1 1 0 110-2z" clipRule="evenodd" />
                    </svg>
                </button>
                <div className="relative w-full md:w-72">
                     <input type="search" placeholder="Search users, orders..." className="w-full ds-glass rounded-lg p-2 pl-10 focus:ring-2 focus:ring-brand-purple focus:outline-none text-sm" />
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
                </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-4 w-full md:w-auto md:ml-auto md:justify-end">
                 <div className="relative">
                    <button 
                        onClick={() => setNotificationDropdownOpen(!notificationDropdownOpen)}
                        className="relative text-gray-400 hover:text-white transition"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-brand-dark flex items-center justify-center text-xs font-bold text-white">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>
                    {notificationDropdownOpen && (
                        <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-[20rem] sm:w-80 sm:max-w-[90vw] ds-dropdown rounded-lg shadow-lg z-20 max-h-96 overflow-y-auto ds-scrollbar">
                            <div className="sticky top-0 bg-[#0b0f1a]/95 border-b border-brand-border px-4 py-3 flex justify-between items-center">
                                <h3 className="font-bold text-white">Notifications</h3>
                                {unreadCount > 0 && (
                                    <button 
                                        onClick={() => {
                                            markAllAsRead();
                                        }}
                                        className="text-xs text-brand-purple hover:text-brand-accent transition"
                                    >
                                        Mark all as read
                                    </button>
                                )}
                            </div>
                            {notifications.length === 0 ? (
                                <div className="px-4 py-8 text-center text-gray-400">
                                    <p>No notifications</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-brand-border">
                                    {notifications.slice(0, 10).map(notification => (
                                        <div 
                                            key={notification.id}
                                            onClick={() => !notification.read && markAsRead(notification.id)}
                                            className={`px-4 py-3 cursor-pointer transition hover:bg-white/5 ${
                                                !notification.read ? 'bg-white/5' : ''
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-semibold text-white text-sm">{notification.title}</h4>
                                                        {!notification.read && (
                                                            <span className="w-2 h-2 bg-brand-accent rounded-full"></span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-400 mt-1">{notification.message}</p>
                                                    <span className="text-xs text-gray-500 mt-1 block">
                                                        {notification.timestamp.toLocaleDateString()} {notification.timestamp.toLocaleTimeString()}
                                                    </span>
                                                </div>
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteNotification(notification.id);
                                                    }}
                                                    className="text-gray-500 hover:text-red-400 transition"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <div className="relative">
                    <button 
                        onClick={() => setCurrencyDropdownOpen(!currencyDropdownOpen)} 
                        className="ds-pill px-3 py-2 text-xs sm:text-sm font-semibold text-gray-200 hover:text-white transition"
                    >
                        {currency}
                    </button>
                    {currencyDropdownOpen && (
                        <div className="absolute right-0 mt-2 w-56 max-w-[90vw] ds-dropdown rounded-lg shadow-lg py-1 z-20">
                            <div className="px-4 py-2 text-xs text-gray-400 border-b border-brand-border font-semibold uppercase">Select Currency</div>
                            {currencies.map((curr) => (
                                <button
                                    key={curr.code}
                                    onClick={() => {
                                        setCurrency(curr.code);
                                        setCurrencyDropdownOpen(false);
                                    }}
                                    className={`w-full text-left block px-4 py-2 text-sm transition ${
                                        currency === curr.code
                                            ? 'bg-brand-purple/30 text-white font-semibold'
                                            : 'text-gray-300 hover:bg-white/10'
                                    }`}
                                >
                                    <span className="font-semibold">{curr.code}</span> - {curr.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <div className="relative">
                    <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition">
                        <img src="https://i.pravatar.cc/150?u=admin" alt="Admin Avatar" className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-brand-purple" />
                        <div className="hidden sm:block">
                            <p className="font-semibold text-sm text-left">Admin</p>
                            <p className="text-xs text-gray-400">Superuser</p>
                        </div>
                    </button>
                    {dropdownOpen && (
                         <div className="absolute right-0 mt-2 w-48 max-w-[90vw] ds-dropdown rounded-lg shadow-lg py-1 z-20">
                            <a href="#/admin/settings" onClick={() => setDropdownOpen(false)} className="block px-4 py-2 text-sm text-gray-300 hover:bg-white/10 transition">
                                ⚙️ Settings
                            </a>
                            <a href="#/admin/dashboard" onClick={() => setDropdownOpen(false)} className="block px-4 py-2 text-sm text-gray-300 hover:bg-white/10 transition">
                                📊 Dashboard
                            </a>
                            <button 
                                onClick={() => {
                                    setDropdownOpen(false);
                                    onLogout();
                                }}
                                className="w-full text-left block px-4 py-2 text-sm text-red-400 hover:bg-white/10 transition"
                            >
                                🚪 Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default AdminHeader;
