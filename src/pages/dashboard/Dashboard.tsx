import React, { useState, useEffect } from 'react';
import StatCard from '../../components/dashboard/StatCard';
import { authAPI, ordersAPI, servicesAPI, adminAPI } from '../../lib/api';
import { withTimeout } from '../../lib/withTimeout';
import type { UserProfile, Order, Service } from '../../lib/api';
import { useCurrency } from '../../lib/CurrencyContext';
import { Card, Button, Tabs, TabItem, Badge } from '../../design-system';

const DashboardPage: React.FC = () => {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [loading, setLoading] = useState(true);
    const { formatAmount } = useCurrency();

    const iconGrid = (className: string) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="2" />
            <rect x="14" y="3" width="7" height="7" rx="2" />
            <rect x="3" y="14" width="7" height="7" rx="2" />
            <rect x="14" y="14" width="7" height="7" rx="2" />
        </svg>
    );
    const iconInstagram = (className: string) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="5" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="17" cy="7" r="1" />
        </svg>
    );
    const iconTiktok = (className: string) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
            <path d="M9 13V5l8-2v8" />
            <circle cx="17" cy="11" r="2" />
        </svg>
    );
    const iconFacebook = (className: string) => (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <path d="M15 3h-3a4 4 0 0 0-4 4v3H6v4h2v7h4v-7h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
        </svg>
    );
    const iconYouTube = (className: string) => (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <rect x="3" y="6" width="18" height="12" rx="4" />
            <polygon points="10,9 16,12 10,15" fill="#0b0f1a" />
        </svg>
    );

    type PlatformTheme = {
        id: string;
        label: string;
        keywords: string[];
        gradient: string;
        chipClass: string;
        iconClass: string;
        icon: (className: string) => React.ReactNode;
    };

    const platformThemes: PlatformTheme[] = [
        {
            id: 'all',
            label: 'All',
            keywords: [],
            gradient: 'linear-gradient(135deg, rgba(99, 102, 241, 0.22), rgba(15, 23, 42, 0.95))',
            chipClass: 'bg-white/10 text-white ring-1 ring-white/10',
            iconClass: 'bg-white/10 text-white ring-1 ring-white/10',
            icon: iconGrid,
        },
        {
            id: 'instagram',
            label: 'Instagram',
            keywords: ['instagram', 'insta', 'ig'],
            gradient: 'linear-gradient(135deg, rgba(236, 72, 153, 0.28), rgba(124, 58, 237, 0.55))',
            chipClass: 'bg-pink-500/20 text-pink-200 ring-1 ring-pink-500/30',
            iconClass: 'bg-pink-500/20 text-pink-200 ring-1 ring-pink-500/30',
            icon: iconInstagram,
        },
        {
            id: 'tiktok',
            label: 'TikTok',
            keywords: ['tiktok', 'tik tok', 'tt'],
            gradient: 'linear-gradient(135deg, rgba(20, 184, 166, 0.3), rgba(59, 130, 246, 0.5))',
            chipClass: 'bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-500/30',
            iconClass: 'bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-500/30',
            icon: iconTiktok,
        },
        {
            id: 'facebook',
            label: 'Facebook',
            keywords: ['facebook', 'fb', 'meta'],
            gradient: 'linear-gradient(135deg, rgba(59, 130, 246, 0.35), rgba(37, 99, 235, 0.6))',
            chipClass: 'bg-blue-500/20 text-blue-200 ring-1 ring-blue-500/30',
            iconClass: 'bg-blue-500/20 text-blue-200 ring-1 ring-blue-500/30',
            icon: iconFacebook,
        },
        {
            id: 'youtube',
            label: 'YouTube',
            keywords: ['youtube', 'yt'],
            gradient: 'linear-gradient(135deg, rgba(239, 68, 68, 0.3), rgba(153, 27, 27, 0.7))',
            chipClass: 'bg-red-500/20 text-red-200 ring-1 ring-red-500/30',
            iconClass: 'bg-red-500/20 text-red-200 ring-1 ring-red-500/30',
            icon: iconYouTube,
        },
        {
            id: 'other',
            label: 'Other',
            keywords: [],
            gradient: 'linear-gradient(135deg, rgba(71, 85, 105, 0.35), rgba(15, 23, 42, 0.95))',
            chipClass: 'bg-white/10 text-gray-200 ring-1 ring-white/10',
            iconClass: 'bg-white/10 text-gray-200 ring-1 ring-white/10',
            icon: iconGrid,
        },
    ];

    const platformById = new Map(platformThemes.map(platform => [platform.id, platform]));

    const getPlatformForService = (service: Service): PlatformTheme => {
        const haystack = `${service.category || ''} ${service.name || ''} ${service.description || ''}`.toLowerCase();
        for (const platform of platformThemes) {
            if (platform.id === 'all' || platform.id === 'other') continue;
            if (platform.keywords.some(keyword => haystack.includes(keyword))) {
                return platform;
            }
        }
        return platformById.get('other')!;
    };

    useEffect(() => {
        const loadData = async () => {
            try {
                console.log('[Dashboard] Loading dashboard data...');
                
                const [userProfile, userOrders, allServices, allAnnouncements] = await Promise.all([
                    withTimeout(authAPI.getUserProfile(), 8000, null, 'dashboard profile'),
                    withTimeout(ordersAPI.getOrders(), 8000, [], 'dashboard orders'),
                    withTimeout(servicesAPI.getServices(), 8000, [], 'dashboard services'),
                    withTimeout(
                        adminAPI.getPublishedAnnouncements().catch(() => []),
                        8000,
                        [],
                        'dashboard announcements'
                    ),
                ]);
                setProfile(userProfile);
                setOrders(userOrders);
                const orderCounts = new Map<string, number>();
                (userOrders || []).forEach((order: any) => {
                    const serviceId = String(order.service_id || order.service?.id || '').trim();
                    if (!serviceId) return;
                    orderCounts.set(serviceId, (orderCounts.get(serviceId) || 0) + 1);
                });

                const trending = [...(allServices || [])]
                    .sort((a: Service, b: Service) => {
                        const aCount = orderCounts.get(a.id) || 0;
                        const bCount = orderCounts.get(b.id) || 0;
                        if (bCount !== aCount) return bCount - aCount;
                        return Number(a.rate_per_1000 || 0) - Number(b.rate_per_1000 || 0);
                    })
                    .slice(0, 4);

                setServices(trending);
                setAnnouncements(allAnnouncements || []);
            } catch (error) {
                console.error('[Dashboard] Failed to load dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-purple"></div>
            </div>
        );
    }

    const categoryTabs: TabItem[] = platformThemes
        .filter(platform => platform.id !== 'other')
        .map(platform => ({
            id: platform.id,
            label: platform.label,
            icon: (
                <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${platform.chipClass}`}>
                    {platform.icon('h-3.5 w-3.5')}
                </span>
            ),
        }));
    const visibleServices =
        activeCategory === 'all'
            ? services
            : services.filter(service => getPlatformForService(service).id === activeCategory);

    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <StatCard 
                    title="Account Balance" 
                    numericValue={profile?.balance || 0}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
                    color="green"
                />
                <StatCard 
                    title="Total Spent" 
                    numericValue={profile?.total_spent || 0}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>}
                    color="blue"
                />
                <StatCard 
                    title="Total Orders" 
                    value={orders.length.toString()}
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>}
                    color="purple"
                />
            </div>

            {/* Featured Services Section */}
            <div className="mb-8">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                    <h2 className="text-xl sm:text-2xl font-bold">Popular Services</h2>
                    <a href="#/dashboard/new-order" className="text-brand-accent hover:text-brand-accent/80 transition-colors text-sm font-semibold">
                        View All
                    </a>
                </div>
                <Tabs
                    items={categoryTabs}
                    value={activeCategory}
                    onChange={setActiveCategory}
                    className="mb-6"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {visibleServices.map(service => {
                        const platform = getPlatformForService(service);
                        return (
                        <div 
                            key={service.id}
                            className="ds-card ds-card-hover p-5 group relative overflow-hidden border border-white/10"
                            style={{ background: platform.gradient }}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${platform.iconClass}`}>
                                    {platform.icon('h-5 w-5')}
                                </div>
                                <Badge variant="info" className={platform.chipClass}>{formatAmount(service.rate_per_1000)}/1k</Badge>
                            </div>
                            
                            <h3 className="font-bold text-white group-hover:text-brand-accent transition-colors mb-2">
                                {service.name}
                            </h3>
                            
                            <p className="text-xs text-gray-400 mb-4 line-clamp-2">
                                {service.description || 'High-quality service for social media growth'}
                            </p>
                            
                            <div className="space-y-2 mb-4">
                                <div className="flex justify-between text-xs text-gray-400">
                                    <span>Min Order:</span>
                                    <span className="text-gray-300 font-semibold">{service.min_quantity.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-xs text-gray-400">
                                    <span>Max Order:</span>
                                    <span className="text-gray-300 font-semibold">{service.max_quantity.toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-white/10">
                                <span className="text-xs font-semibold text-gray-300 uppercase">
                                    {platform.label}
                                </span>
                                <Button size="sm" variant="secondary" onClick={() => (window.location.hash = '#/dashboard/new-order')}>
                                    Order Now
                                </Button>
                            </div>
                        </div>
                    )})}
                </div>
            </div>

            <Card className="p-6">
                <h2 className="text-xl font-bold mb-4">Recent Announcements</h2>
                {announcements.length === 0 ? (
                    <p className="text-gray-400 text-sm">No announcements at this time. Check back later for updates!</p>
                ) : (
                    <div className="space-y-4">
                        {announcements.slice(0, 5).map((announcement) => (
                            <div key={announcement.id} className="ds-glass rounded-lg p-4">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <h3 className="font-semibold text-white flex-1">{announcement.subject}</h3>
                                    <span className={`text-xs font-semibold px-2 py-1 rounded whitespace-nowrap ${
                                        announcement.status === 'open' ? 'bg-blue-500/20 text-blue-400' :
                                        announcement.status === 'in-progress' ? 'bg-yellow-500/20 text-yellow-400' :
                                        announcement.status === 'resolved' ? 'bg-green-500/20 text-green-400' :
                                        'bg-gray-500/20 text-gray-400'
                                    }`}>
                                        {announcement.status}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-400 mb-2">{announcement.message}</p>
                                <p className="text-xs text-gray-500">{new Date(announcement.created_at).toLocaleDateString()}</p>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    );
};

export default DashboardPage;


