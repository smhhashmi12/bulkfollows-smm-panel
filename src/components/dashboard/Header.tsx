import React, { useEffect, useRef, useState } from 'react';
import type { User } from '../../App';
import { useCurrency, currencies } from '../../lib/CurrencyContext';
import { useNotifications } from '../../lib/NotificationContext';
import { getAvatarDataUri } from '../../lib/avatar';
import { authAPI } from '../../lib/api';

interface DashboardHeaderProps {
    user: User;
    onLogout: () => void;
    onToggleSidebar?: () => void;
}

const CurrencyIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-brand-light-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <circle cx="12" cy="12" r="8" strokeWidth="1.8" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 7v10M9.5 9.5c0-1 1-1.7 2.4-1.7 1.5 0 2.6.7 2.6 1.9 0 2.7-5 1.3-5 4 0 1.1 1 1.9 2.7 1.9 1.6 0 2.7-.8 2.9-2" />
    </svg>
);

const BalanceIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-brand-light-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <rect x="3.5" y="6.5" width="17" height="11" rx="2.5" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="2.2" strokeWidth="1.8" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M6.5 9.5h.01M17.5 14.5h.01" />
    </svg>
);

const BALANCE_CACHE_KEY = 'app.currentBalance';

const readCachedBalance = () => {
    try {
        const raw = window.localStorage.getItem(BALANCE_CACHE_KEY);
        if (!raw) return null;
        const parsed = Number.parseFloat(raw);
        return Number.isFinite(parsed) ? parsed : null;
    } catch {
        return null;
    }
};

const writeCachedBalance = (value: number | null) => {
    try {
        if (value === null || !Number.isFinite(value)) {
            window.localStorage.removeItem(BALANCE_CACHE_KEY);
            return;
        }

        window.localStorage.setItem(BALANCE_CACHE_KEY, String(value));
    } catch {
        // Ignore local storage failures for balance cache.
    }
};

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ user, onLogout, onToggleSidebar }) => {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false);
    const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
    const [balance, setBalance] = useState<number | null>(() => readCachedBalance());
    const [balanceLoading, setBalanceLoading] = useState(() => readCachedBalance() === null);
    const { currency, setCurrency, formatAmount } = useCurrency();
    const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
    const retryTimeoutRef = useRef<number | null>(null);

    const routeSegment = window.location.hash.split('/')[2] || 'new-order';
    const currentPageTitle = routeSegment
        .split('-')
        .filter(Boolean)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ') || 'New Order';

    useEffect(() => {
        let cancelled = false;

        const clearRetry = () => {
            if (retryTimeoutRef.current !== null) {
                window.clearTimeout(retryTimeoutRef.current);
                retryTimeoutRef.current = null;
            }
        };

        const loadBalance = async (attempt = 0) => {
            try {
                setBalanceLoading(true);
                const profile = await authAPI.getUserProfile();

                if (typeof profile?.balance === 'number' && Number.isFinite(profile.balance)) {
                    if (!cancelled) {
                        setBalance(profile.balance);
                        writeCachedBalance(profile.balance);
                    }
                    return;
                }

                throw new Error('Balance unavailable');
            } catch (error) {
                console.error('[DashboardHeader] Failed to load balance:', error);

                if (!cancelled && attempt < 3) {
                    const delay = [300, 900, 1800][attempt] ?? 1800;
                    clearRetry();
                    retryTimeoutRef.current = window.setTimeout(() => {
                        loadBalance(attempt + 1);
                    }, delay);
                    return;
                }
            } finally {
                if (!cancelled) {
                    setBalanceLoading(false);
                }
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                loadBalance();
            }
        };

        const handleWindowFocus = () => {
            loadBalance();
        };

        loadBalance();
        window.addEventListener('focus', handleWindowFocus);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            cancelled = true;
            clearRetry();
            window.removeEventListener('focus', handleWindowFocus);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [routeSegment]);

    const balanceLabel = balanceLoading && balance === null ? '...' : formatAmount(balance ?? 0);

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

                <div className="hidden min-w-0 md:block">
                    <h1 className="truncate text-lg font-bold sm:text-xl">{currentPageTitle}</h1>
                    <p className="text-xs text-gray-400 sm:text-sm">Welcome back, {user.username}!</p>
                </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
                <div className="inline-flex h-9 max-w-[96px] min-w-0 items-center gap-1.5 rounded-full border border-brand-border bg-white/5 px-2 text-[11px] font-semibold text-white sm:h-10 sm:max-w-none sm:gap-2 sm:px-3 sm:text-sm">
                    <BalanceIcon />
                    <span className="truncate">{balanceLabel}</span>
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
                        <div className="ds-dropdown absolute right-0 z-20 mt-2 w-48 max-w-[90vw] rounded-lg py-1 shadow-lg">
                            <div className="border-b border-brand-border px-4 py-2 text-xs font-semibold uppercase text-gray-400">
                                Select Currency
                            </div>
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

                <a
                    href="#/dashboard/add-funds"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-brand-border bg-white/5 text-white transition hover:bg-white/10 sm:h-11 sm:w-11"
                    aria-label="Add Funds"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v14m7-7H5" />
                    </svg>
                </a>

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
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-brand-border bg-white/5 transition hover:opacity-80 sm:h-11 sm:w-11"
                        aria-label="User menu"
                    >
                        <img src={getAvatarDataUri(user.username)} alt="User Avatar" className="h-8 w-8 rounded-full border-2 border-brand-purple sm:h-9 sm:w-9" />
                    </button>

                    {dropdownOpen && (
                        <div className="ds-dropdown absolute right-0 z-20 mt-2 w-48 max-w-[90vw] rounded-lg py-1 shadow-lg">
                            <div className="border-b border-brand-border px-4 py-2 text-sm text-gray-400">
                                Signed in as <br />
                                <strong className="text-white">{user.username}</strong>
                            </div>
                            <a href="#/dashboard/profile" onClick={() => setDropdownOpen(false)} className="block px-4 py-2 text-sm text-gray-300 transition hover:bg-white/10">
                                Profile Settings
                            </a>
                            <a href="#/dashboard/support" onClick={() => setDropdownOpen(false)} className="block px-4 py-2 text-sm text-gray-300 transition hover:bg-white/10">
                                Support
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

export default DashboardHeader;
