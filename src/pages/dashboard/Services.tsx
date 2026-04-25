import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { servicesAPI } from '../../lib/api';
import { withTimeout } from '../../lib/withTimeout';
import type { Service } from '../../lib/api';
import { useCurrency } from '../../lib/CurrencyContext';
import { storePendingOrderServiceId } from '../../lib/pendingOrderService';
import { renderSocialPlatformIcon } from '../../components/social/SocialIcon';

type SortOption = 'recommended' | 'price' | 'speed';

const platformMatchers = [
  { key: 'instagram', label: 'Instagram', aliases: ['instagram', 'insta', 'ig'] },
  { key: 'facebook', label: 'Facebook', aliases: ['facebook', 'fb'] },
  { key: 'youtube', label: 'YouTube', aliases: ['youtube', 'yt'] },
  { key: 'twitter', label: 'Twitter', aliases: ['twitter', 'tweet'] },
  { key: 'spotify', label: 'Spotify', aliases: ['spotify'] },
  { key: 'tiktok', label: 'TikTok', aliases: ['tiktok', 'tik tok', 'tt'] },
  { key: 'linkedin', label: 'LinkedIn', aliases: ['linkedin', 'li'] },
  { key: 'soundcloud', label: 'SoundCloud', aliases: ['soundcloud'] },
  { key: 'telegram', label: 'Telegram', aliases: ['telegram', 'tg'] },
  { key: 'traffic', label: 'Website Traffic', aliases: ['traffic', 'website'] },
  { key: 'snapchat', label: 'Snapchat', aliases: ['snapchat', 'snap'] },
  { key: 'discord', label: 'Discord', aliases: ['discord'] },
  { key: 'reddit', label: 'Reddit', aliases: ['reddit'] },
  { key: 'threads', label: 'Threads', aliases: ['threads', 'thread'] },
  { key: 'whatsapp', label: 'WhatsApp', aliases: ['whatsapp', 'wa'] },
  { key: 'twitch', label: 'Twitch', aliases: ['twitch'] },
];

const getEstimatedTimeHours = (service: Service | null): number | null => {
  if (!service) return null;
  if (service.completion_time && Number.isFinite(service.completion_time)) {
    return Number(service.completion_time);
  }

  const description = service.description || '';
  const explicitMatch = description.match(/Time:\s*(\d+)h/i);
  if (explicitMatch) return Number.parseInt(explicitMatch[1], 10);

  const genericHoursMatch = description.match(/(\d+)\s*hour/i);
  if (genericHoursMatch) return Number.parseInt(genericHoursMatch[1], 10);

  return null;
};

const getCategoryPlatform = (category: string) => {
  const value = category.toLowerCase();
  const match = platformMatchers.find((platform) => platform.aliases.some((alias) => value.includes(alias)));
  return match?.key || null;
};

const renderCategoryIcon = (category: string, className = 'w-4 h-4') => {
  const value = category.toLowerCase();
  const socialIcon = renderSocialPlatformIcon(category, { className });

  if (socialIcon) {
    return socialIcon;
  }

  if (value.includes('soundcloud')) {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M8 17h9a3 3 0 0 0 0-6 4.5 4.5 0 0 0-8.7-1.5A3.5 3.5 0 0 0 8 17z" />
      </svg>
    );
  }

  if (value.includes('traffic') || value.includes('website')) {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="8" />
        <path d="M4 12h16M12 4a14 14 0 0 1 0 16M12 4a14 14 0 0 0 0 16" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M8 9h8M8 13h8M8 17h5" />
    </svg>
  );
};

const getPlatformInfo = (category: string) => {
  const value = category.toLowerCase();
  let accent = 'from-slate-500/20 to-slate-600/20 border-slate-400/20 text-slate-200';
  if (value.includes('instagram')) accent = 'from-pink-500/20 to-orange-500/20 border-pink-400/30 text-pink-200';
  if (value.includes('facebook')) accent = 'from-blue-500/20 to-indigo-500/20 border-blue-400/30 text-blue-200';
  if (value.includes('youtube')) accent = 'from-red-500/20 to-rose-500/20 border-red-400/30 text-red-200';
  if (value.includes('twitter')) accent = 'from-sky-500/20 to-cyan-500/20 border-sky-400/30 text-sky-200';
  if (value.includes('spotify')) accent = 'from-emerald-500/20 to-green-500/20 border-emerald-400/30 text-emerald-200';
  if (value.includes('tiktok')) accent = 'from-cyan-500/20 to-fuchsia-500/20 border-cyan-400/30 text-cyan-200';
  if (value.includes('linkedin')) accent = 'from-blue-500/20 to-sky-500/20 border-blue-400/30 text-blue-200';
  if (value.includes('telegram')) accent = 'from-sky-500/20 to-cyan-500/20 border-sky-400/30 text-sky-200';
  if (value.includes('discord')) accent = 'from-indigo-500/20 to-violet-500/20 border-indigo-400/30 text-indigo-200';
  if (value.includes('soundcloud')) accent = 'from-orange-500/20 to-amber-500/20 border-orange-400/30 text-orange-200';
  if (value.includes('traffic') || value.includes('website')) accent = 'from-violet-500/20 to-fuchsia-500/20 border-violet-400/30 text-violet-200';
  return { icon: renderCategoryIcon(category, 'w-5 h-5'), accent };
};

const ServicesPage: React.FC = () => {
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState('');
  const [categoryTypeFilter, setCategoryTypeFilter] = useState<'all' | 'social' | 'private'>('all');
  const [serviceSearch, setServiceSearch] = useState('');
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('recommended');
  const [loading, setLoading] = useState(true);
  const searchBoxRef = useRef<HTMLDivElement | null>(null);
  const deferredSearch = useDeferredValue(serviceSearch);
  const { formatAmount } = useCurrency();

  useEffect(() => {
    const loadServices = async () => {
      setLoading(true);
      try {
        const services = await withTimeout(servicesAPI.getMergedServices(), 20000, [], 'services directory');
        setAllServices(services);
      } finally {
        setLoading(false);
      }
    };

    loadServices();
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!searchBoxRef.current) return;
      if (!searchBoxRef.current.contains(event.target as Node)) {
        setShowSearchSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const platformServiceStats = useMemo(() => {
    const counts = new Map<string, number>();
    allServices.forEach((service) => {
      const platform = getCategoryPlatform(service.category);
      if (!platform) return;
      counts.set(platform, (counts.get(platform) || 0) + 1);
    });
    return counts;
  }, [allServices]);

  const visiblePlatforms = useMemo(
    () => platformMatchers.filter((platform) => (platformServiceStats.get(platform.key) || 0) > 0).slice(0, 12),
    [platformServiceStats]
  );

  const filteredServices = useMemo(() => {
    return allServices.filter((service) => {
      const categoryValue = service.category.toLowerCase();
      if (categoryTypeFilter === 'social' && getCategoryPlatform(service.category) === null) return false;
      if (categoryTypeFilter === 'private' && !categoryValue.includes('private')) return false;
      if (selectedPlatform && getCategoryPlatform(service.category) !== selectedPlatform && !categoryValue.includes('private')) return false;
      return true;
    });
  }, [allServices, categoryTypeFilter, selectedPlatform]);

  const searchedServices = useMemo(() => {
    const term = deferredSearch.trim().toLowerCase();
    if (!term) return filteredServices;
    return filteredServices.filter((service) =>
      service.name.toLowerCase().includes(term) || service.category.toLowerCase().includes(term)
    );
  }, [deferredSearch, filteredServices]);

  const searchSuggestions = useMemo(() => {
    const term = serviceSearch.trim().toLowerCase();
    if (!term) return [];
    return allServices
      .filter((service) =>
        service.name.toLowerCase().includes(term) || service.category.toLowerCase().includes(term)
      )
      .slice(0, 8);
  }, [allServices, serviceSearch]);

  const sortedServices = useMemo(() => {
    const services = [...searchedServices];

    if (sortBy === 'price') {
      return services.sort((a, b) => Number(a.rate_per_1000 || 0) - Number(b.rate_per_1000 || 0));
    }

    if (sortBy === 'speed') {
      return services.sort((a, b) => (getEstimatedTimeHours(a) || 9999) - (getEstimatedTimeHours(b) || 9999));
    }

    return services.sort((a, b) => {
      const aTime = getEstimatedTimeHours(a) || 48;
      const bTime = getEstimatedTimeHours(b) || 48;
      if (aTime !== bTime) return aTime - bTime;
      return Number(a.rate_per_1000 || 0) - Number(b.rate_per_1000 || 0);
    });
  }, [searchedServices, sortBy]);

  const activePlatformLabel = useMemo(() => {
    if (!selectedPlatform) return 'All Services';
    return visiblePlatforms.find((platform) => platform.key === selectedPlatform)?.label || 'Filtered Platform';
  }, [selectedPlatform, visiblePlatforms]);

  const handleSuggestionSelect = (service: Service) => {
    setServiceSearch(service.name);
    setSelectedService(service);
    setSelectedPlatform(getCategoryPlatform(service.category) || '');
    setShowSearchSuggestions(false);
  };

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
  };

  const handleOrderNow = (service: Service) => {
    storePendingOrderServiceId(service.id);
    window.location.hash = '#/dashboard/new-order';
  };

  useEffect(() => {
    if (sortedServices.length === 0) {
      setSelectedService(null);
      return;
    }

    if (!selectedService || !sortedServices.some((service) => service.id === selectedService.id)) {
      setSelectedService(sortedServices[0]);
    }
  }, [sortedServices, selectedService]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-purple"></div>
      </div>
    );
  }

  return (
    <div className="max-w-[1480px] mx-auto min-w-0 space-y-5">
      <section className="bg-brand-container border border-brand-border rounded-[28px] p-4 sm:p-5 md:p-6 overflow-hidden">
        <div className="mb-5">
          <p className="text-xs uppercase tracking-[0.24em] text-brand-accent font-semibold">Services Explorer</p>
          <h2 className="mt-2 text-2xl font-bold text-white">Browse services by platform</h2>
          <p className="mt-2 text-sm text-gray-400">
            Platform icons stay on top, search stays below them, and the full services list stays under the search area.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => setSelectedPlatform('')}
            className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 text-left transition ${
              selectedPlatform === ''
                ? 'border-brand-purple/60 bg-gradient-to-r from-brand-accent/20 to-brand-purple/20 text-white shadow-purple-glow-sm'
                : 'border-white/10 bg-white/[0.03] text-gray-200 hover:border-brand-purple/40 hover:bg-white/[0.05]'
            }`}
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                {renderCategoryIcon('all', 'w-6 h-6')}
              </span>
              <span className="truncate font-semibold">All Services</span>
            </div>
            <span className="shrink-0 text-sm text-gray-400">{allServices.length}</span>
          </button>

          {visiblePlatforms.map((platform) => (
            <button
              key={platform.key}
              type="button"
              onClick={() => setSelectedPlatform(platform.key)}
              className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 text-left transition ${
                selectedPlatform === platform.key
                  ? 'border-brand-purple/60 bg-gradient-to-r from-brand-accent/20 to-brand-purple/20 text-white shadow-purple-glow-sm'
                  : 'border-white/10 bg-white/[0.03] text-gray-200 hover:border-brand-purple/40 hover:bg-white/[0.05]'
              }`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                  {renderCategoryIcon(platform.label, 'w-6 h-6')}
                </span>
                <span className="truncate font-semibold">{platform.label}</span>
              </div>
              <span className="shrink-0 text-sm text-gray-400">{platformServiceStats.get(platform.key) || 0}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="bg-brand-container border border-brand-border rounded-[24px] p-4 sm:p-5 overflow-visible">
        <div ref={searchBoxRef} className="relative min-w-0">
          <label htmlFor="serviceSearch" className="block text-sm font-semibold text-gray-300 mb-2">
            Search Services
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-gray-500">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
            </span>
            <input
              id="serviceSearch"
              type="text"
              value={serviceSearch}
              onChange={(e) => {
                setServiceSearch(e.target.value);
                setShowSearchSuggestions(true);
              }}
              onFocus={() => setShowSearchSuggestions(true)}
              placeholder="Search service, platform, or category..."
              className="w-full rounded-2xl border border-white/10 bg-black/30 py-3.5 pl-12 pr-14 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-purple"
            />
            {serviceSearch && (
              <button
                type="button"
                onClick={() => {
                  setServiceSearch('');
                  setShowSearchSuggestions(false);
                }}
                className="absolute inset-y-0 right-2 my-1 inline-flex items-center justify-center rounded-xl px-3 text-sm font-semibold text-gray-300 transition hover:bg-white/10 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>

          {showSearchSuggestions && searchSuggestions.length > 0 && (
            <div className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-2xl border border-brand-border bg-[#120a25] shadow-xl">
              {searchSuggestions.map((service) => (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => handleSuggestionSelect(service)}
                  className="w-full border-b border-brand-border px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-white/5"
                >
                  <p className="text-sm font-medium text-white truncate">{service.name}</p>
                  <p className="text-xs text-gray-400 truncate">{service.category}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={categoryTypeFilter}
              onChange={(e) => setCategoryTypeFilter(e.target.value as 'all' | 'social' | 'private')}
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-purple"
            >
              <option value="all">All Categories</option>
              <option value="social">Social Categories</option>
              <option value="private">Private Categories</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-purple"
            >
              <option value="recommended">Recommended</option>
              <option value="price">Lowest Price</option>
              <option value="speed">Fastest Delivery</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-gray-300">
              Platform: {activePlatformLabel}
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-gray-300">
              {sortedServices.length} services
            </span>
          </div>
        </div>
      </section>

      {selectedService && (
        <section className="bg-brand-container border border-brand-border rounded-[24px] p-4 sm:p-5 overflow-hidden">
          <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-gray-300">
                <span className="text-brand-accent">{getPlatformInfo(selectedService.category).icon}</span>
                <span className="truncate">{selectedService.category}</span>
              </div>
              <h3 className="mt-4 text-xl font-bold text-white break-words">{selectedService.name}</h3>
              <p className="mt-3 text-sm leading-6 text-gray-400 break-words">
                {selectedService.description || 'This service is ready for ordering. Review the details below or open New Order directly.'}
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 xl:w-[520px] xl:shrink-0">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-gray-500">Rate</p>
                <p className="mt-2 font-semibold text-brand-accent">{formatAmount(selectedService.rate_per_1000)}/1k</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-gray-500">Min / Max</p>
                <p className="mt-2 font-semibold text-white break-words">
                  {selectedService.min_quantity.toLocaleString()} / {selectedService.max_quantity.toLocaleString()}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="text-[11px] uppercase tracking-[0.16em] text-gray-500">Avg. Time</p>
                <p className="mt-2 font-semibold text-white">
                  {getEstimatedTimeHours(selectedService) ? `${getEstimatedTimeHours(selectedService)} hours` : 'Standard'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleOrderNow(selectedService)}
                className="rounded-2xl bg-gradient-to-r from-brand-accent to-brand-purple px-4 py-4 text-sm font-semibold text-white shadow-purple-glow-sm transition hover:opacity-90"
              >
                Order Now
              </button>
            </div>
          </div>
        </section>
      )}

      <section className="bg-brand-container border border-brand-border rounded-[24px] p-4 sm:p-5 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-gray-500">Services List</p>
            <h3 className="mt-1 text-xl font-semibold text-white">Available services</h3>
          </div>
          <span className="text-sm text-gray-400">Sorted by {sortBy}</span>
        </div>

        <div className="hidden lg:grid lg:grid-cols-[minmax(0,2.2fr)_140px_170px_130px_180px] gap-4 px-4 py-3 rounded-2xl border border-white/10 bg-white/[0.03] text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
          <span>Service</span>
          <span>Rate Per 1000</span>
          <span>Min / Max</span>
          <span>Avg. Time</span>
          <span className="text-right">Action</span>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3">
          {sortedServices.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-10 text-center text-sm text-gray-400">
              No services found for the current platform or search.
            </div>
          ) : (
            sortedServices.slice(0, 24).map((service) => (
              <div
                key={service.id}
                className={`rounded-2xl border p-4 transition ${
                  selectedService?.id === service.id
                    ? 'border-brand-purple/50 bg-brand-purple/10'
                    : 'border-white/10 bg-black/20 hover:border-brand-purple/30'
                }`}
              >
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2.2fr)_140px_170px_130px_180px] gap-4 items-start">
                  <div className="min-w-0">
                    <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-gray-400">
                      <span className="text-brand-accent">{getPlatformInfo(service.category).icon}</span>
                      <span className="truncate">{service.category}</span>
                    </div>
                    <h4 className="mt-3 text-base font-semibold text-white break-words line-clamp-3">{service.name}</h4>
                    <p className="mt-2 text-sm text-gray-400 break-words line-clamp-2">
                      {service.description || 'Stable service with clear quantity limits and direct order support.'}
                    </p>
                  </div>

                  <div className="lg:pt-8">
                    <p className="text-xs uppercase tracking-[0.14em] text-gray-500 lg:hidden">Rate Per 1000</p>
                    <p className="mt-1 font-semibold text-brand-accent">{formatAmount(service.rate_per_1000)}</p>
                  </div>

                  <div className="lg:pt-8">
                    <p className="text-xs uppercase tracking-[0.14em] text-gray-500 lg:hidden">Min / Max</p>
                    <p className="mt-1 font-semibold text-white break-words">
                      {service.min_quantity.toLocaleString()} / {service.max_quantity.toLocaleString()}
                    </p>
                  </div>

                  <div className="lg:pt-8">
                    <p className="text-xs uppercase tracking-[0.14em] text-gray-500 lg:hidden">Avg. Time</p>
                    <p className="mt-1 font-semibold text-white">
                      {getEstimatedTimeHours(service) ? `${getEstimatedTimeHours(service)} hours` : 'Standard'}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row lg:flex-col gap-2 lg:items-stretch lg:pt-6">
                    <button
                      type="button"
                      onClick={() => handleServiceSelect(service)}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
                    >
                      Details
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOrderNow(service)}
                      className="w-full rounded-xl bg-gradient-to-r from-brand-accent to-brand-purple px-4 py-2.5 text-sm font-semibold text-white shadow-purple-glow-sm transition hover:opacity-90"
                    >
                      Order Now
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default ServicesPage;
