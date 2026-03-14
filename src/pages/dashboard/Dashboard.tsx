import React, { Suspense, useEffect, useState } from 'react';
import { authAPI, ordersAPI, servicesAPI, adminAPI } from '../../lib/api';
import { withTimeout } from '../../lib/withTimeout';
import type { UserProfile, Order, Service } from '../../lib/api';
import { useCurrency } from '../../lib/CurrencyContext';
import { Card } from '../../design-system';
import StatsGridSkeleton from './sections/StatsGridSkeleton';
import PopularServicesSkeleton from './sections/PopularServicesSkeleton';
import AnnouncementsSkeleton from './sections/AnnouncementsSkeleton';

const StatsGrid = React.lazy(() => import('./sections/StatsGrid'));
const PopularServicesSection = React.lazy(() => import('./sections/PopularServices'));
const AnnouncementsSection = React.lazy(() => import('./sections/Announcements'));

const DashboardPage: React.FC = () => {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [loading, setLoading] = useState(true);
    const { formatAmount } = useCurrency();

    useEffect(() => {
        let cancelled = false;

        const scheduleIdleTask = (task: () => void) => {
            if (typeof window === 'undefined') return;
            if ('requestIdleCallback' in window) {
                (window as Window).requestIdleCallback(() => task(), { timeout: 2000 });
                return;
            }
            window.setTimeout(task, 350);
        };

        const loadData = async () => {
            try {
                console.log('[Dashboard] Loading dashboard data...');

                const [userProfile, userOrders, allAnnouncements] = await Promise.all([
                    withTimeout(authAPI.getUserProfile(), 8000, null, 'dashboard profile'),
                    withTimeout(ordersAPI.getOrders(), 8000, [], 'dashboard orders'),
                    withTimeout(
                        adminAPI.getPublishedAnnouncements().catch(() => []),
                        8000,
                        [],
                        'dashboard announcements'
                    ),
                ]);

                if (cancelled) return;

                const trimmedOrders = (userOrders || []).slice(0, 200);
                setProfile(userProfile);
                setOrders(trimmedOrders);
                setAnnouncements(allAnnouncements || []);

                scheduleIdleTask(async () => {
                    try {
                        const allServices = await withTimeout(
                            servicesAPI.getServices(),
                            20000,
                            [],
                            'dashboard services'
                        );
                        if (cancelled) return;

                        const orderCounts = new Map<string, number>();
                        trimmedOrders.forEach((order: any) => {
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
                    } catch (error) {
                        console.warn('[Dashboard] Services fetch deferred failed:', error);
                    }
                });
            } catch (error) {
                console.error('[Dashboard] Failed to load dashboard data:', error);
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        loadData();

        return () => {
            cancelled = true;
        };
    }, []);

    if (loading) {
        return (
            <div>
                <StatsGridSkeleton />
                <PopularServicesSkeleton />
                <Card className="p-6">
                    <AnnouncementsSkeleton />
                </Card>
            </div>
        );
    }

    return (
        <div>
            <Suspense fallback={<StatsGridSkeleton />}>
                <StatsGrid profile={profile} orderCount={orders.length} />
            </Suspense>

            <Suspense fallback={<PopularServicesSkeleton />}>
                <PopularServicesSection
                    services={services}
                    formatAmount={formatAmount}
                    activeCategory={activeCategory}
                    onCategoryChange={setActiveCategory}
                />
            </Suspense>

            <Card className="p-6">
                <Suspense fallback={<AnnouncementsSkeleton />}>
                    <AnnouncementsSection announcements={announcements} />
                </Suspense>
            </Card>
        </div>
    );
};

export default DashboardPage;
