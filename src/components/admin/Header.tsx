import React, { useState } from 'react';
import { useCurrency, currencies } from '../../lib/CurrencyContext';
import { useNotifications } from '../../lib/NotificationContext';
import { getAvatarDataUri } from '../../lib/avatar';

const CurrencyIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-brand-light-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <circle cx="12" cy="12" r="8" strokeWidth="1.8" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 7v10M9.5 9.5c0-1 1-1.7 2.4-1.7 1.5 0 2.6.7 2.6 1.9 0 2.7-5 1.3-5 4 0 1.1 1 1.9 2.7 1.9 1.6 0 2.7-.8 2.9-2" />
    </svg>
);

const AdminHeader: React.FC<{ onLogout: () => void; onToggleSidebar?: () => void }> = ({ onLogout, onToggleSidebar }) => {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false);
    const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
    const { currency, setCurrency } = useCurrency();
    const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();

    return (
        <header className="ds-topbar flex items-center justify-between gap-2 px-3 py-3 sm:gap-3 sm:px-4 sm:py-4">
            <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                <button
                    onClick={onToggleSidebar}
                    className="shrink-0 text-gray-400 transition hover:text-white md:hidden"
                    aria-label="Open menu"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 5h14a1 1 0 010 2H3a1 1 0 110-2zm0 4h14a1 1 0 110 2H3a1 1 0 110-2zm0 4h14a1 1 0 110 2H3a1 1 0 110-2z" clipRule="evenodd" />
                    </svg>
                </button>

                <div className="relative hidden w-full max-w-sm md:block">
                    <input type="search" placeholder="Search users, orders..." className="w-full ds-glass rounded-lg p-2 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple" />
                    <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
                <div className="relative">
                    <button
                        onClick={() => setNotificationDropdownOpen(!notificationDropdownOpen)}
                        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-brand-border bg-white/5 text-gray-400 transition hover:text-white sm:h-11 sm:w-11"
                        aria-label="Notifications"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-brand-dark bg-red-500 text-xs font-bold text-white">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {notificationDropdownOpen && (
                        <div className="ds-dropdown ds-scrollbar fixed left-3 right-3 top-[4.5rem] z-20 max-h-[min(26rem,calc(100vh-6rem))] overflow-y-auto rounded-lg shadow-lg sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80 sm:max-h-96 sm:max-w-[90vw]">
                            <div className="sticky top-0 flex items-center justify-between gap-3 border-b border-brand-border bg-[#0b0f1a]/95 px-4 py-3">
                                <h3 className="font-bold text-white">Notifications</h3>
                                {unreadCount > 0 && (
                                    <button
                                        onClick={() => {
                                            markAllAsRead();
                                        }}
                                        className="shrink-0 text-[11px] text-brand-purple transition hover:text-brand-accent sm:text-xs"
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
                                            className={`cursor-pointer px-4 py-3 transition hover:bg-white/5 ${
                                                !notification.read ? 'bg-white/5' : ''
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="truncate text-sm font-semibold text-white">{notification.title}</h4>
                                                        {!notification.read && <span className="h-2 w-2 rounded-full bg-brand-accent"></span>}
                                                    </div>
                                                    <p className="mt-1 break-words text-xs text-gray-400">{notification.message}</p>
                                                    <span className="mt-1 block text-xs text-gray-500">
                                                        {notification.timestamp.toLocaleDateString()} {notification.timestamp.toLocaleTimeString()}
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        deleteNotification(notification.id);
                                                    }}
                                                    className="text-gray-500 transition hover:text-red-400"
                                                    aria-label="Delete notification"
                                                >
                                                    x
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
                        className="inline-flex h-9 w-9 items-center justify-center gap-2 rounded-full border border-brand-border bg-white/5 text-xs font-semibold text-gray-200 transition hover:text-white sm:h-11 sm:w-auto sm:px-3 sm:text-sm"
                        aria-label="Change currency"
                    >
                        <CurrencyIcon />
                        <span className="hidden sm:inline">{currency}</span>
                    </button>

                    {currencyDropdownOpen && (
                        <div className="ds-dropdown absolute right-0 z-20 mt-2 w-56 max-w-[90vw] rounded-lg py-1 shadow-lg">
                            <div className="border-b border-brand-border px-4 py-2 text-xs font-semibold uppercase text-gray-400">Select Currency</div>
                            {currencies.map((curr) => (
                                <button
                                    key={curr.code}
                                    onClick={() => {
                                        setCurrency(curr.code);
                                        setCurrencyDropdownOpen(false);
                                    }}
                                    className={`block w-full px-4 py-2 text-left text-sm transition ${
                                        currency === curr.code
                                            ? 'bg-brand-purple/30 font-semibold text-white'
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
                    <button
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-brand-border bg-white/5 transition hover:opacity-80 sm:h-11 sm:w-11"
                        aria-label="Admin menu"
                    >
                        <img src={getAvatarDataUri('admin')} alt="Admin Avatar" className="h-8 w-8 rounded-full border-2 border-brand-purple sm:h-9 sm:w-9" />
                    </button>

                    {dropdownOpen && (
                        <div className="ds-dropdown absolute right-0 z-20 mt-2 w-48 max-w-[90vw] rounded-lg py-1 shadow-lg">
                            <a href="#/admin/settings" onClick={() => setDropdownOpen(false)} className="block px-4 py-2 text-sm text-gray-300 transition hover:bg-white/10">
                                Settings
                            </a>
                            <a href="#/admin/dashboard" onClick={() => setDropdownOpen(false)} className="block px-4 py-2 text-sm text-gray-300 transition hover:bg-white/10">
                                Dashboard
                            </a>
                            <button
                                onClick={() => {
                                    setDropdownOpen(false);
                                    onLogout();
                                }}
                                className="block w-full px-4 py-2 text-left text-sm text-red-400 transition hover:bg-white/10"
                            >
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default AdminHeader;
