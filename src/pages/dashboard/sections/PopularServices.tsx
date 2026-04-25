import React from 'react';
import type { Service } from '../../../lib/api';
import { Button, Tabs, type TabItem, Badge } from '../../../design-system';
import { SocialPlatformIcon } from '../../../components/social/SocialIcon';

type PopularServicesProps = {
  services: Service[];
  activeCategory: string;
  onCategoryChange: (value: string) => void;
  formatAmount: (value: number) => string;
};

type PlatformTheme = {
  id: string;
  label: string;
  keywords: string[];
  gradient: string;
  chipClass: string;
  icon: (className: string) => React.ReactNode;
};

const iconGrid = (className: string) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="2" />
    <rect x="14" y="3" width="7" height="7" rx="2" />
    <rect x="3" y="14" width="7" height="7" rx="2" />
    <rect x="14" y="14" width="7" height="7" rx="2" />
  </svg>
);

const iconInstagram = (className: string) => (
  <SocialPlatformIcon platform="instagram" className={className} />
);

const iconTiktok = (className: string) => (
  <SocialPlatformIcon platform="tiktok" className={className} />
);

const iconFacebook = (className: string) => (
  <SocialPlatformIcon platform="facebook" className={className} />
);

const iconYouTube = (className: string) => (
  <SocialPlatformIcon platform="youtube" className={className} />
);

const platformThemes: PlatformTheme[] = [
  {
    id: 'all',
    label: 'All',
    keywords: [],
    gradient: 'linear-gradient(135deg, rgba(99, 102, 241, 0.22), rgba(15, 23, 42, 0.95))',
    chipClass: 'bg-white/10 text-white ring-1 ring-white/10',
    icon: iconGrid,
  },
  {
    id: 'instagram',
    label: 'Instagram',
    keywords: ['instagram', 'insta', 'ig'],
    gradient: 'linear-gradient(135deg, rgba(236, 72, 153, 0.28), rgba(124, 58, 237, 0.55))',
    chipClass: 'bg-pink-500/20 text-pink-200 ring-1 ring-pink-500/30',
    icon: iconInstagram,
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    keywords: ['tiktok', 'tik tok', 'tt'],
    gradient: 'linear-gradient(135deg, rgba(20, 184, 166, 0.3), rgba(59, 130, 246, 0.5))',
    chipClass: 'bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-500/30',
    icon: iconTiktok,
  },
  {
    id: 'facebook',
    label: 'Facebook',
    keywords: ['facebook', 'fb', 'meta'],
    gradient: 'linear-gradient(135deg, rgba(59, 130, 246, 0.35), rgba(37, 99, 235, 0.6))',
    chipClass: 'bg-blue-500/20 text-blue-200 ring-1 ring-blue-500/30',
    icon: iconFacebook,
  },
  {
    id: 'youtube',
    label: 'YouTube',
    keywords: ['youtube', 'yt'],
    gradient: 'linear-gradient(135deg, rgba(239, 68, 68, 0.3), rgba(153, 27, 27, 0.7))',
    chipClass: 'bg-red-500/20 text-red-200 ring-1 ring-red-500/30',
    icon: iconYouTube,
  },
  {
    id: 'other',
    label: 'Other',
    keywords: [],
    gradient: 'linear-gradient(135deg, rgba(71, 85, 105, 0.35), rgba(15, 23, 42, 0.95))',
    chipClass: 'bg-white/10 text-gray-200 ring-1 ring-white/10',
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

const PopularServices: React.FC<PopularServicesProps> = ({ services, activeCategory, onCategoryChange, formatAmount }) => {
  const categoryTabs: TabItem[] = platformThemes
    .filter(platform => platform.id !== 'other')
    .map(platform => ({
      id: platform.id,
      label: platform.label,
      icon: platform.icon('h-5 w-5'),
    }));

  const visibleServices =
    activeCategory === 'all'
      ? services
      : services.filter(service => getPlatformForService(service).id === activeCategory);

  return (
    <div className="mb-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <h2 className="text-xl sm:text-2xl font-bold">Popular Services</h2>
        <a href="#/dashboard/new-order" className="text-brand-accent hover:text-brand-accent/80 transition-colors text-sm font-semibold">
          View All
        </a>
      </div>
      <Tabs items={categoryTabs} value={activeCategory} onChange={onCategoryChange} className="mb-6" />
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
                <div className="flex h-8 w-8 items-center justify-center shrink-0">
                  {platform.icon('h-8 w-8')}
                </div>
                <Badge variant="info" className={platform.chipClass}>
                  {formatAmount(service.rate_per_1000)}/1k
                </Badge>
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
          );
        })}
      </div>
    </div>
  );
};

export default PopularServices;
