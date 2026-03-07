import React, { useState, useEffect, useMemo, useRef } from 'react';
import { servicesAPI, authAPI, paymentsAPI } from '../../lib/api';
import useOrderManagement from '../../lib/useOrderManagement';
import { withTimeout } from '../../lib/withTimeout';
import type { Service, UserProfile } from '../../lib/api';
import { useCurrency } from '../../lib/CurrencyContext';

const NewOrderPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [link, setLink] = useState('');
  const [quantity, setQuantity] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');
  const [categoryTypeFilter, setCategoryTypeFilter] = useState<'all' | 'social' | 'private'>('all');
  const [serviceSearch, setServiceSearch] = useState<string>('');
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingServices, setLoadingServices] = useState(true);
  const [paymentInProgress, setPaymentInProgress] = useState(false);
  const categorySliderRef = useRef<HTMLDivElement | null>(null);
  const searchBoxRef = useRef<HTMLDivElement | null>(null);
  const { formatAmount } = useCurrency();

  // Use the new order management hook
  const {
    loading,
    error: orderError,
    success: orderSuccess,
    orderStatus,
    isCheckingStatus,
    createOrder,
    retryOrder,
    clearMessages,
    validateOrder,
    calculateCharge: hookCalculateCharge,
  } = useOrderManagement();

  // Platform/category visuals
  const renderCategoryIcon = (category: string, className = 'w-4 h-4') => {
    const value = category.toLowerCase();

    if (value.includes('instagram')) {
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="4" y="4" width="16" height="16" rx="5" />
          <circle cx="12" cy="12" r="3.4" />
          <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    }
    if (value.includes('youtube')) {
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="6" width="18" height="12" rx="4" />
          <path d="M10 9.5l5 2.5-5 2.5v-5z" fill="currentColor" stroke="none" />
        </svg>
      );
    }
    if (value.includes('tiktok') || value.includes('spotify') || value.includes('music')) {
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M14 4v10a3 3 0 1 1-2-2.83V6.5c.9 1.1 2.1 1.8 3.7 2" />
        </svg>
      );
    }
    if (value.includes('twitter') || value.includes('x ')) {
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M5 5l14 14M19 5L5 19" />
        </svg>
      );
    }
    if (value.includes('facebook')) {
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M13 8h2V4h-2a4 4 0 0 0-4 4v3H7v4h2v5h4v-5h2.3l.7-4H13V8a1 1 0 0 1 1-1z" />
        </svg>
      );
    }
    if (value.includes('telegram')) {
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M21 4L3 11l6 2 2 6 10-15z" />
        </svg>
      );
    }
    if (value.includes('followers')) {
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="8" cy="8" r="3" />
          <circle cx="16" cy="10" r="2.5" />
          <path d="M3 18c0-2.3 2.2-4 5-4s5 1.7 5 4" />
          <path d="M13 18c.3-1.8 1.9-3 4-3 2.2 0 4 1.3 4 3" />
        </svg>
      );
    }
    if (value.includes('likes')) {
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 20s-7-4.35-7-9a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 4.65-7 9-7 9z" />
        </svg>
      );
    }
    if (value.includes('views')) {
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" />
          <circle cx="12" cy="12" r="2.5" />
        </svg>
      );
    }
    if (value.includes('comments')) {
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 5h16v11H9l-5 4V5z" />
        </svg>
      );
    }
    if (value.includes('subscribers') || value.includes('notification')) {
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 3a4 4 0 0 0-4 4v3.5L6 14h12l-2-3.5V7a4 4 0 0 0-4-4z" />
          <path d="M10 17a2 2 0 0 0 4 0" />
        </svg>
      );
    }
    if (value.includes('shares')) {
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="18" cy="5" r="2.5" />
          <circle cx="6" cy="12" r="2.5" />
          <circle cx="18" cy="19" r="2.5" />
          <path d="M8.2 11l7.6-4.2M8.2 13l7.6 4.2" />
        </svg>
      );
    }
    if (value.includes('engagement') || value.includes('traffic')) {
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 15l4-5 4 3 4-6 4 3" />
          <path d="M20 7v5h-5" />
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
    if (value.includes('youtube')) accent = 'from-red-500/20 to-rose-500/20 border-red-400/30 text-red-200';
    if (value.includes('tiktok')) accent = 'from-cyan-500/20 to-fuchsia-500/20 border-cyan-400/30 text-cyan-200';
    if (value.includes('facebook')) accent = 'from-blue-500/20 to-indigo-500/20 border-blue-400/30 text-blue-200';
    if (value.includes('twitter') || value.includes('x ')) accent = 'from-zinc-500/20 to-zinc-300/20 border-zinc-300/20 text-zinc-100';
    if (value.includes('telegram')) accent = 'from-sky-500/20 to-cyan-500/20 border-sky-400/30 text-sky-200';
    if (value.includes('likes')) accent = 'from-rose-500/20 to-pink-500/20 border-rose-400/30 text-rose-200';
    if (value.includes('followers')) accent = 'from-violet-500/20 to-fuchsia-500/20 border-violet-400/30 text-violet-200';
    if (value.includes('views')) accent = 'from-emerald-500/20 to-teal-500/20 border-emerald-400/30 text-emerald-200';
    return { label: category, icon: renderCategoryIcon(category, 'w-3.5 h-3.5'), accent };
  };

  const scrollCategorySlider = (direction: 'left' | 'right') => {
    if (!categorySliderRef.current) return;
    const amount = Math.max(240, Math.floor(categorySliderRef.current.clientWidth * 0.6));
    categorySliderRef.current.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
  };
  useEffect(() => {
    const loadData = async () => {
      setLoadingServices(true);
      try {
        console.log('[NewOrder] Loading services and profile...');
        
        const [servicesData, userProfile] = await Promise.all([
          withTimeout(servicesAPI.getMergedServices(), 8000, [], 'new order services'),
          withTimeout(authAPI.getUserProfile(), 8000, null, 'new order profile'),
        ]);
        setAllServices(servicesData);
        setProfile(userProfile);
      } catch (err: any) {
        console.error('[NewOrder] Failed to load services:', err);
      } finally {
        setLoadingServices(false);
      }
    };
    loadData();
  }, []);

  // Memoize categories to prevent unnecessary recalculations
  const categories = useMemo(() => {
    return [...new Set(allServices.map(s => s.category))].sort();
  }, [allServices]);

  const platformMatchers = useMemo(
    () => [
      { key: 'instagram', label: 'Instagram', aliases: ['instagram', 'insta', 'ig'] },
      { key: 'facebook', label: 'Facebook', aliases: ['facebook', 'fb'] },
      { key: 'tiktok', label: 'TikTok', aliases: ['tiktok', 'tik tok', 'tt'] },
      { key: 'youtube', label: 'YouTube', aliases: ['youtube', 'yt'] },
      { key: 'twitter', label: 'Twitter/X', aliases: ['twitter', 'x', 'tweet'] },
      { key: 'telegram', label: 'Telegram', aliases: ['telegram', 'tg'] },
      { key: 'snapchat', label: 'Snapchat', aliases: ['snapchat', 'snap'] },
      { key: 'linkedin', label: 'LinkedIn', aliases: ['linkedin', 'li'] },
      { key: 'pinterest', label: 'Pinterest', aliases: ['pinterest', 'pin'] },
      { key: 'reddit', label: 'Reddit', aliases: ['reddit'] },
      { key: 'discord', label: 'Discord', aliases: ['discord'] },
      { key: 'threads', label: 'Threads', aliases: ['threads', 'thread'] },
      { key: 'whatsapp', label: 'WhatsApp', aliases: ['whatsapp', 'wa'] },
      { key: 'spotify', label: 'Spotify', aliases: ['spotify'] },
      { key: 'twitch', label: 'Twitch', aliases: ['twitch'] },
      { key: 'quora', label: 'Quora', aliases: ['quora'] },
      { key: 'tumblr', label: 'Tumblr', aliases: ['tumblr'] },
    ],
    []
  );

  const getCategoryPlatform = (category: string) => {
    const value = category.toLowerCase();
    const match = platformMatchers.find((p) => p.aliases.some((alias) => value.includes(alias)));
    return match?.key || null;
  };

  const platformServiceStats = useMemo(() => {
    const counts = new Map<string, number>();
    allServices.forEach((service) => {
      const platform = getCategoryPlatform(service.category);
      if (!platform) return;
      counts.set(platform, (counts.get(platform) || 0) + 1);
    });
    return counts;
  }, [allServices]);

  const socialPlatforms = useMemo(() => platformMatchers, [platformMatchers]);

  const visibleCategories = useMemo(() => {
    let filtered = categories;
    if (categoryTypeFilter === 'social') {
      filtered = filtered.filter((category) => getCategoryPlatform(category) !== null);
    } else if (categoryTypeFilter === 'private') {
      filtered = filtered.filter((category) => category.toLowerCase().includes('private'));
    }

    if (!selectedPlatform) return filtered;
    const byPlatform = filtered.filter((category) => {
      if (category.toLowerCase().includes('private')) return true;
      return getCategoryPlatform(category) === selectedPlatform;
    });
    return byPlatform.length > 0 ? byPlatform : filtered;
  }, [categories, selectedPlatform, categoryTypeFilter]);

  // Calculate charge for display
  const calculateChargeForDisplay = () => {
    if (!selectedService || !quantity) return 0;
    const qty = parseInt(quantity) || 0;
    const actualDeliveryTime = getEstimatedTimeHours(selectedService) || 24;
    return hookCalculateCharge(selectedService, qty, actualDeliveryTime);
  };

  // Memoize filtered services to prevent unnecessary array filtering
  const filteredServices = useMemo(() => {
    return allServices.filter((service) => {
      const categoryValue = service.category.toLowerCase();
      if (categoryTypeFilter === 'social' && getCategoryPlatform(service.category) === null) return false;
      if (categoryTypeFilter === 'private' && !categoryValue.includes('private')) return false;
      if (
        selectedPlatform &&
        getCategoryPlatform(service.category) !== selectedPlatform &&
        !categoryValue.includes('private')
      ) return false;
      if (selectedCategory && service.category !== selectedCategory) return false;
      return true;
    });
  }, [selectedPlatform, selectedCategory, allServices, categoryTypeFilter]);

  const searchedServices = useMemo(() => {
    const term = serviceSearch.trim().toLowerCase();
    if (!term) return filteredServices;
    return filteredServices.filter((service) =>
      service.name.toLowerCase().includes(term) || service.category.toLowerCase().includes(term)
    );
  }, [filteredServices, serviceSearch]);

  const searchSuggestions = useMemo(() => {
    const term = serviceSearch.trim().toLowerCase();
    if (!term) return [];
    return allServices
      .filter((service) =>
        service.name.toLowerCase().includes(term) || service.category.toLowerCase().includes(term)
      )
      .slice(0, 8);
  }, [allServices, serviceSearch]);

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

  useEffect(() => {
    if (!selectedPlatform || !selectedCategory) return;
    if (getCategoryPlatform(selectedCategory) !== selectedPlatform) {
      setSelectedCategory('');
      setSelectedService(null);
    }
  }, [selectedPlatform, selectedCategory]);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!searchBoxRef.current) return;
      if (!searchBoxRef.current.contains(event.target as Node)) {
        setShowSearchSuggestions(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  /**
   * Handle payment initiation - called after order is created
   */
  const handlePaymentRequest = async (amount: number): Promise<void> => {
    if (amount === 0) {
      console.log('[NewOrder] No payment needed (free order)');
      return;
    }

    setPaymentInProgress(true);
    try {
      console.log('[NewOrder] Initiating payment for:', amount);
      
      // Create payment record in database
      const payment = await paymentsAPI.createPayment(amount, 'fastpay');
      
      if (payment.fastpay_order_id) {
        // TODO: Redirect to FastPay payment page
        console.log('[NewOrder] Payment initiated, fastpay_order_id:', payment.fastpay_order_id);
        // window.location.href = `https://fastpay.com/checkout?order_id=${payment.fastpay_order_id}`;
      }
    } catch (err) {
      console.error('[NewOrder] Payment initiation failed:', err);
      throw err; // Re-throw so the hook can handle it
    } finally {
      setPaymentInProgress(false);
    }
  };

  /**
   * Handle order form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!selectedService || !profile) {
      return;
    }

    const actualDeliveryTime = getEstimatedTimeHours(selectedService) || 24;
    const orderData = {
      serviceId: selectedService.id,
      link,
      quantity: parseInt(quantity) || 0,
      deliveryTime: actualDeliveryTime,
    };

    // Create order with payment callback
    const result = await createOrder(
      selectedService,
      orderData,
      profile,
      handlePaymentRequest
    );

    if (result.status === 'processing' || result.status === 'completed') {
      // Clear form on success
      setLink('');
      setQuantity('');
      setSelectedService(null);
      setSelectedCategory('');
      setSelectedPlatform('');
      setServiceSearch('');

      // Reload profile to update balance
      const updatedProfile = await authAPI.getUserProfile();
      setProfile(updatedProfile);
    }
  };

  // Retry handler
  const handleRetry = async () => {
    if (!selectedService || !profile) return;

    const actualDeliveryTime = getEstimatedTimeHours(selectedService) || 24;
    const orderData = {
      serviceId: selectedService.id,
      link,
      quantity: parseInt(quantity) || 0,
      deliveryTime: actualDeliveryTime,
    };

    await retryOrder(selectedService, orderData, profile, handlePaymentRequest);
  };

  if (loadingServices) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-purple"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Status Messages */}
      {orderError && (
        <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400 text-sm flex items-start justify-between">
          <span>{orderError}</span>
          {orderError.includes('Failed') && (
            <button
              onClick={handleRetry}
              disabled={loading}
              className="ml-4 px-3 py-1 bg-red-500/20 hover:bg-red-500/30 rounded text-xs font-semibold"
            >
              Retry
            </button>
          )}
        </div>
      )}
      
      {orderSuccess && (
        <div className="mb-4 bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-green-400 text-sm">
          {orderSuccess}
        </div>
      )}

      {/* Order Status Tracking */}
      {orderStatus && (
        <div className="mb-4 bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-blue-300">
              <p className="font-semibold">Order #{orderStatus.orderId}</p>
              <p>Status: <span className="text-blue-400 font-bold capitalize">{orderStatus.status}</span></p>
              {orderStatus.providerOrderId && (
                <p>Provider Order: <span className="text-gray-400">{orderStatus.providerOrderId}</span></p>
              )}
            </div>
            {isCheckingStatus && (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                <span className="text-xs text-blue-400">Checking...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment Status */}
      {paymentInProgress && (
        <div className="mb-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 text-yellow-400 text-sm flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400"></div>
          Processing payment...
        </div>
      )}

      {/* Global Search + Filters */}
      <div className="bg-brand-container border border-brand-border rounded-2xl p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div ref={searchBoxRef} className="md:col-span-2 relative">
            <label htmlFor="serviceSearchTop" className="block text-sm font-semibold text-gray-300 mb-2">
              Search Service
            </label>
            <input
              id="serviceSearchTop"
              type="text"
              value={serviceSearch}
              onChange={(e) => {
                setServiceSearch(e.target.value);
                setSelectedService(null);
                setShowSearchSuggestions(true);
              }}
              onFocus={() => setShowSearchSuggestions(true)}
              placeholder="Search by service or category..."
              className="w-full bg-brand-input border border-brand-border rounded-lg p-3 text-white placeholder-slate-400 focus:ring-2 focus:ring-brand-purple focus:outline-none"
            />
            {showSearchSuggestions && searchSuggestions.length > 0 && (
              <div className="absolute z-30 left-0 right-0 mt-1 bg-[#120a25] border border-brand-border rounded-lg shadow-xl overflow-hidden">
                {searchSuggestions.map((service) => (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => {
                      const platform = getCategoryPlatform(service.category) || '';
                      setServiceSearch(service.name);
                      setSelectedPlatform(platform);
                      setSelectedCategory(service.category);
                      setSelectedService(service);
                      setShowSearchSuggestions(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-white/5 transition-colors border-b border-brand-border last:border-b-0"
                  >
                    <p className="text-sm text-white font-medium truncate">{service.name}</p>
                    <p className="text-xs text-gray-400 truncate">{service.category}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label htmlFor="categoryTypeFilter" className="block text-sm font-semibold text-gray-300 mb-2">
              Filter
            </label>
            <select
              id="categoryTypeFilter"
              value={categoryTypeFilter}
              onChange={(e) => {
                setCategoryTypeFilter(e.target.value as 'all' | 'social' | 'private');
                setSelectedService(null);
              }}
              className="w-full bg-brand-input border border-brand-border rounded-lg p-3 text-white focus:ring-2 focus:ring-brand-purple focus:outline-none cursor-pointer"
            >
              <option value="all">All Categories</option>
              <option value="social">Social Categories</option>
              <option value="private">Private Categories</option>
            </select>
          </div>
        </div>
      </div>

      {/* Platform Slider */}
      <div className="bg-brand-container border border-brand-border rounded-2xl p-4 md:p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-200 tracking-wide">Browse Social Platforms</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => scrollCategorySlider('left')}
              className="h-8 w-8 rounded-full border border-brand-border bg-black/30 text-gray-300 hover:text-white hover:bg-black/50 transition-colors"
              aria-label="Scroll categories left"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => scrollCategorySlider('right')}
              className="h-8 w-8 rounded-full border border-brand-border bg-black/30 text-gray-300 hover:text-white hover:bg-black/50 transition-colors"
              aria-label="Scroll categories right"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        </div>

        <div
          ref={categorySliderRef}
          className="flex items-center gap-2 overflow-x-auto ds-scrollbar pb-2 scroll-smooth"
        >
          <button
            type="button"
            onClick={() => {
              setSelectedPlatform('');
              setSelectedCategory('');
              setSelectedService(null);
            }}
            className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition ${
              selectedPlatform === '' && selectedCategory === ''
                ? 'ds-btn-primary text-white'
                : 'ds-pill text-gray-300 hover:text-white'
            }`}
            title="All Services"
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/10">
              {renderCategoryIcon('all', 'w-3.5 h-3.5')}
            </span>
            <span>All</span>
          </button>

          {socialPlatforms.map((platform) => {
            const platInfo = getPlatformInfo(platform.label);
            return (
              <button
                key={platform.key}
                type="button"
                onClick={() => {
                  setSelectedPlatform(platform.key);
                  const firstCategory = categories.find((category) => getCategoryPlatform(category) === platform.key) || '';
                  setSelectedCategory(firstCategory);
                  setSelectedService(null);
                  setServiceSearch('');
                }}
                className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition ${
                  selectedPlatform === platform.key
                    ? 'ds-btn-primary text-white'
                    : 'ds-pill text-gray-300 hover:text-white'
                }`}
                title={platInfo.label}
              >
                <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full border bg-gradient-to-br ${platInfo.accent}`}>
                  {platInfo.icon}
                </span>
                <span>{platform.label}</span>
              </button>
            );
          })}
        </div>
      </div>
{/* Order Form Section - Clean Casper Style */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-brand-container border border-brand-border rounded-2xl p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Category Dropdown */}
              <div>
                <label htmlFor="category" className="block text-sm font-semibold text-gray-300 mb-2">
                  Category
                </label>
                <select
                  id="category"
                  value={selectedCategory}
                  onChange={(e) => {
                    const nextCategory = e.target.value;
                    setSelectedCategory(nextCategory);
                    setSelectedPlatform(nextCategory ? (getCategoryPlatform(nextCategory) || '') : '');
                    setSelectedService(null);
                    setServiceSearch('');
                  }}
                  className="w-full bg-brand-input border border-brand-border rounded-lg p-3 text-white focus:ring-2 focus:ring-brand-purple focus:outline-none cursor-pointer"
                >
                  <option value="">Select a category...</option>
                  {visibleCategories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Service Dropdown */}
              <div>
                <label htmlFor="service" className="block text-sm font-semibold text-gray-300 mb-2">
                  Service
                </label>
                {selectedCategory || serviceSearch || selectedPlatform ? (
                  <>
                    <select
                      id="service"
                      value={selectedService?.id || ''}
                      onChange={(e) => {
                        const service = searchedServices.find(s => s.id === e.target.value);
                        if (service && !selectedCategory) {
                          setSelectedCategory(service.category);
                          setSelectedPlatform(getCategoryPlatform(service.category) || '');
                        }
                        setSelectedService(service || null);
                      }}
                      className="w-full bg-brand-input border border-brand-border rounded-lg p-3 text-white focus:ring-2 focus:ring-brand-purple focus:outline-none cursor-pointer"
                    >
                      <option value="">
                        {searchedServices.length === 0 ? 'No service found for search' : 'Select a service...'}
                      </option>
                      {searchedServices.map(service => (
                        <option key={service.id} value={service.id}>
                          {service.name} | {formatAmount(service.rate_per_1000)}/1k | Min {service.min_quantity} | Max {service.max_quantity}
                        </option>
                      ))}
                    </select>
                  </>
                ) : (
                  <div className="w-full bg-black/20 border border-brand-border rounded-lg p-3 text-gray-400 text-sm">
                    Select platform/category or search service first
                  </div>
                )}
              </div>

              {/* Link Input */}
              <div>
                <label htmlFor="link" className="block text-sm font-semibold text-gray-300 mb-2">
                  Link
                </label>
                <input
                  type="url"
                  id="link"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="https://www.instagram.com/username"
                  required
                  className="w-full bg-brand-input border border-brand-border rounded-lg p-3 text-white placeholder-slate-400 focus:ring-2 focus:ring-brand-purple focus:outline-none"
                />
              </div>

              {/* Quantity Input */}
              <div>
                <label htmlFor="quantity" className="block text-sm font-semibold text-gray-300 mb-2">
                  Quantity
                </label>
                <input
                  type="number"
                  id="quantity"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="500"
                  required
                  min={selectedService?.min_quantity || 0}
                  max={selectedService?.max_quantity || 100000}
                  className="w-full bg-brand-input border border-brand-border rounded-lg p-3 text-white placeholder-slate-400 focus:ring-2 focus:ring-brand-purple focus:outline-none"
                />
                {selectedService && (
                  <p className="text-xs text-gray-400 mt-2">
                    Min: {selectedService.min_quantity.toLocaleString()} - Max: {selectedService.max_quantity.toLocaleString()}
                  </p>
                )}
              </div>

              {/* Charge Calculation */}
              {selectedService && quantity && (
                <div className="bg-black/40 border border-brand-border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between text-sm text-gray-300">
                    <span>Service Rate:</span>
                    <span>{formatAmount(selectedService.rate_per_1000)}/1k</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-300">
                    <span>Quantity:</span>
                    <span>{parseInt(quantity).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-300">
                    <span>Estimated Delivery:</span>
                    <span className="text-brand-accent">
                      {getEstimatedTimeHours(selectedService) ? `${getEstimatedTimeHours(selectedService)} hours` : 'Standard'}
                    </span>
                  </div>
                  <div className="border-t border-brand-border pt-3 flex justify-between items-center">
                    <span className="font-semibold text-gray-300">Charge</span>
                    <span className="text-2xl font-bold text-brand-accent">{formatAmount(calculateChargeForDisplay())}</span>
                  </div>
                  {profile && profile.balance < calculateChargeForDisplay() && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded p-2 text-xs text-red-400 mt-2">
                      Insufficient balance (${profile.balance.toFixed(2)} available)
                    </div>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || paymentInProgress || !selectedService || !quantity || !link}
                className="w-full bg-gradient-to-r from-brand-accent to-brand-purple hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-white font-bold py-3 rounded-lg shadow-purple-glow-sm flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Creating Order...
                  </>
                ) : paymentInProgress ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Processing Payment...
                  </>
                ) : (
                  'Submit Order'
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Service Details Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-brand-container border border-brand-border rounded-2xl p-6 sticky top-6">
            <h2 className="text-lg font-bold mb-4 text-white">Service Details</h2>
            {selectedService ? (
              <div className="space-y-4 text-sm text-gray-300">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Service Name</p>
                  <p className="font-semibold text-white">{selectedService.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Category</p>
                  <p className="font-semibold text-white flex items-center gap-2">
                    <span>{getPlatformInfo(selectedService.category).icon}</span>
                    {selectedService.category.charAt(0).toUpperCase() + selectedService.category.slice(1)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Rate</p>
                  <p className="font-semibold text-brand-accent">{formatAmount(selectedService.rate_per_1000)}/1000</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Estimated Time</p>
                  <p className="font-semibold text-white">
                    {getEstimatedTimeHours(selectedService) ? `${getEstimatedTimeHours(selectedService)} hours` : 'Standard'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Quantity Limits</p>
                  <p className="font-semibold text-white">
                    {selectedService.min_quantity.toLocaleString()} - {selectedService.max_quantity.toLocaleString()}
                  </p>
                </div>
                {selectedService.description && (
                  <>
                    <hr className="border-brand-border" />
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Description</p>
                      <p>{selectedService.description}</p>
                    </div>
                  </>
                )}
                <hr className="border-brand-border" />
                <div className="bg-black/30 rounded-lg p-3 border border-brand-border/50">
                  <p className="text-xs font-semibold text-brand-accent mb-2">Delivery Rate Guide</p>
                  <ul className="text-xs space-y-1 text-gray-400">
                    <li>6h: <span className="text-red-400 font-semibold">2.0x</span></li>
                    <li>12h: <span className="text-orange-400 font-semibold">1.5x</span></li>
                    <li>24h: <span className="text-green-400 font-semibold">1.0x</span></li>
                    <li>48h: <span className="text-green-500 font-semibold">0.8x</span></li>
                    <li>72h: <span className="text-green-600 font-semibold">0.7x</span> (Best)</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400 text-sm">Select a service to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewOrderPage;



