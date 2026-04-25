import React, { useState, useEffect, useMemo, useRef } from "react";
import { servicesAPI, authAPI, paymentsAPI } from "../../lib/api";
import useOrderManagement from "../../lib/useOrderManagement";
import { withTimeout } from "../../lib/withTimeout";
import type { Service, UserProfile } from "../../lib/api";
import { useCurrency } from "../../lib/CurrencyContext";
import { consumePendingOrderServiceId } from "../../lib/pendingOrderService";
import { renderSocialPlatformIcon } from "../../components/social/SocialIcon";
import { getServicesFromCache, setServicesCache } from "../../lib/servicesCache";


const NewOrderPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [link, setLink] = useState("");
  const [quantity, setQuantity] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("");
  const [categoryTypeFilter, setCategoryTypeFilter] = useState<
    "all" | "social" | "private"
  >("all");
  const [serviceSearch, setServiceSearch] = useState<string>("");
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingServices, setLoadingServices] = useState(true);
  const [paymentInProgress, setPaymentInProgress] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [serviceDropdownOpen, setServiceDropdownOpen] = useState(false);
  const categorySliderRef = useRef<HTMLDivElement | null>(null);
  const searchBoxRef = useRef<HTMLDivElement | null>(null);
  const categoryPickerRef = useRef<HTMLDivElement | null>(null);
  const servicePickerRef = useRef<HTMLDivElement | null>(null);
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
  const renderCategoryIcon = (category: string, className = "w-4 h-4") => {
    const value = category.toLowerCase();
    const socialIcon = renderSocialPlatformIcon(category, { className });

    if (socialIcon) {
      return socialIcon;
    }

    if (value.includes("followers")) {
      return (
        <svg
          viewBox="0 0 24 24"
          className={className}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <circle cx="8" cy="8" r="3" />
          <circle cx="16" cy="10" r="2.5" />
          <path d="M3 18c0-2.3 2.2-4 5-4s5 1.7 5 4" />
          <path d="M13 18c.3-1.8 1.9-3 4-3 2.2 0 4 1.3 4 3" />
        </svg>
      );
    }
    if (value.includes("likes")) {
      return (
        <svg
          viewBox="0 0 24 24"
          className={className}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M12 20s-7-4.35-7-9a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 4.65-7 9-7 9z" />
        </svg>
      );
    }
    if (value.includes("views")) {
      return (
        <svg
          viewBox="0 0 24 24"
          className={className}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" />
          <circle cx="12" cy="12" r="2.5" />
        </svg>
      );
    }
    if (value.includes("comments")) {
      return (
        <svg
          viewBox="0 0 24 24"
          className={className}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M4 5h16v11H9l-5 4V5z" />
        </svg>
      );
    }
    if (value.includes("subscribers") || value.includes("notification")) {
      return (
        <svg
          viewBox="0 0 24 24"
          className={className}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M12 3a4 4 0 0 0-4 4v3.5L6 14h12l-2-3.5V7a4 4 0 0 0-4-4z" />
          <path d="M10 17a2 2 0 0 0 4 0" />
        </svg>
      );
    }
    if (value.includes("shares")) {
      return (
        <svg
          viewBox="0 0 24 24"
          className={className}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <circle cx="18" cy="5" r="2.5" />
          <circle cx="6" cy="12" r="2.5" />
          <circle cx="18" cy="19" r="2.5" />
          <path d="M8.2 11l7.6-4.2M8.2 13l7.6 4.2" />
        </svg>
      );
    }
    if (value.includes("engagement") || value.includes("traffic")) {
      return (
        <svg
          viewBox="0 0 24 24"
          className={className}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M4 15l4-5 4 3 4-6 4 3" />
          <path d="M20 7v5h-5" />
        </svg>
      );
    }
    return (
      <svg
        viewBox="0 0 24 24"
        className={className}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <rect x="4" y="4" width="16" height="16" rx="3" />
        <path d="M8 9h8M8 13h8M8 17h5" />
      </svg>
    );
  };

  const getPlatformInfo = (category: string) => {
    const value = category.toLowerCase();
    let accent =
      "from-slate-500/20 to-slate-600/20 border-slate-400/20 text-slate-200";
    if (value.includes("instagram"))
      accent =
        "from-pink-500/20 to-orange-500/20 border-pink-400/30 text-pink-200";
    if (value.includes("youtube"))
      accent = "from-red-500/20 to-rose-500/20 border-red-400/30 text-red-200";
    if (value.includes("tiktok"))
      accent =
        "from-cyan-500/20 to-fuchsia-500/20 border-cyan-400/30 text-cyan-200";
    if (value.includes("facebook"))
      accent =
        "from-blue-500/20 to-indigo-500/20 border-blue-400/30 text-blue-200";
    if (value.includes("twitter") || value.includes("x "))
      accent =
        "from-zinc-500/20 to-zinc-300/20 border-zinc-300/20 text-zinc-100";
    if (value.includes("telegram"))
      accent = "from-sky-500/20 to-cyan-500/20 border-sky-400/30 text-sky-200";
    if (value.includes("likes"))
      accent =
        "from-rose-500/20 to-pink-500/20 border-rose-400/30 text-rose-200";
    if (value.includes("followers"))
      accent =
        "from-violet-500/20 to-fuchsia-500/20 border-violet-400/30 text-violet-200";
    if (value.includes("views"))
      accent =
        "from-emerald-500/20 to-teal-500/20 border-emerald-400/30 text-emerald-200";
    return {
      label: category,
      icon: renderCategoryIcon(category, "w-5 h-5"),
      accent,
    };
  };

  const parseDurationToHours = (
    value: string | number | null | undefined,
  ): number | null => {
    if (value === null || value === undefined) return null;
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
      return Math.max(1, Math.ceil(value));
    }

    const text = String(value).trim().toLowerCase();
    if (!text) return null;

    const convertToHours = (amount: string, unit: string) => {
      const numericAmount = Number.parseFloat(amount);
      if (!Number.isFinite(numericAmount) || numericAmount <= 0) return null;

      if (unit.startsWith("day")) {
        return Math.max(1, Math.ceil(numericAmount * 24));
      }

      if (unit.startsWith("min")) {
        return Math.max(1, Math.ceil(numericAmount / 60));
      }

      return Math.max(1, Math.ceil(numericAmount));
    };

    const rangeMatch = text.match(
      /(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)\s*(minutes?|mins?|min|hours?|hrs?|hr|days?|day)\b/i,
    );
    if (rangeMatch) {
      return convertToHours(rangeMatch[2], rangeMatch[3]);
    }

    const directMatch = text.match(
      /(\d+(?:\.\d+)?)\s*(minutes?|mins?|min|hours?|hrs?|hr|days?|day)\b/i,
    );
    if (directMatch) {
      return convertToHours(directMatch[1], directMatch[2]);
    }

    if (/^\d+(?:\.\d+)?$/.test(text)) {
      return Math.max(1, Math.ceil(Number.parseFloat(text)));
    }

    return null;
  };

  const formatEstimatedTimeValue = (
    hours: number | null | undefined,
  ): string => {
    if (!hours || !Number.isFinite(hours) || hours <= 0) {
      return "Standard";
    }

    const normalizedHours = Math.max(1, Math.ceil(hours));
    if (normalizedHours >= 24 && normalizedHours % 24 === 0) {
      const days = normalizedHours / 24;
      return `${days} day${days === 1 ? "" : "s"}`;
    }

    return `${normalizedHours} hour${normalizedHours === 1 ? "" : "s"}`;
  };

  const getDisplayDescription = (raw: string | null | undefined) => {
    const text = String(raw || "").trim();
    if (!text) return "";

    const markerIndex = text.search(/Provider ID:\s*/i);
    if (markerIndex === 0) {
      // Metadata-only description from sync: hide it from users.
      return "";
    }

    if (markerIndex > 0) {
      const trimmed = text.slice(0, markerIndex).trim();
      return trimmed || text;
    }

    return text;
  };

  useEffect(() => {
    if (!categoryDropdownOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (categoryPickerRef.current?.contains(target)) return;
      setCategoryDropdownOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setCategoryDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [categoryDropdownOpen]);

  useEffect(() => {
    if (!serviceDropdownOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (servicePickerRef.current?.contains(target)) return;
      setServiceDropdownOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setServiceDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [serviceDropdownOpen]);

  const scrollCategorySlider = (direction: "left" | "right") => {
    if (!categorySliderRef.current) return;
    const amount = Math.max(
      240,
      Math.floor(categorySliderRef.current.clientWidth * 0.6),
    );
    categorySliderRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };
  useEffect(() => {
    const loadData = async () => {
      setLoadingServices(true);
      try {
        console.log("[NewOrder] Loading services and profile...");

        // Load profile first (faster)
        const userProfile = await withTimeout(
          authAPI.getUserProfile(),
          5000,
          null,
          "new order profile",
        );
        setProfile(userProfile);

        // Try to load from cache first
        let servicesData = getServicesFromCache();
        if (servicesData) {
          console.log("[NewOrder] Using cached services");
          setAllServices(servicesData);
        } else {
          // Load services with shorter timeout
          servicesData = await withTimeout(
            servicesAPI.getMergedServices(),
            12000,
            [],
            "new order services",
          );
          setAllServices(servicesData);
          if (servicesData.length > 0) {
            setServicesCache(servicesData);
          }
        }

        const pendingServiceId = consumePendingOrderServiceId();
        if (pendingServiceId && servicesData) {
          const pendingService =
            servicesData.find((service) => service.id === pendingServiceId) ||
            null;
          if (pendingService) {
            setSelectedCategory(pendingService.category);
            setSelectedPlatform(
              getCategoryPlatform(pendingService.category) || "",
            );
            setSelectedService(pendingService);
            setServiceSearch(pendingService.name);
          }
        }
      } catch (err: any) {
        console.error("[NewOrder] Failed to load services:", err);
      } finally {
        setLoadingServices(false);
      }
    };
    loadData();
  }, []);

  // Memoize categories to prevent unnecessary recalculations
  const categories = useMemo(() => {
    return [...new Set(allServices.map((s) => s.category))].sort();
  }, [allServices]);

  const platformMatchers = useMemo(
    () => [
      {
        key: "instagram",
        label: "Instagram",
        aliases: ["instagram", "insta", "ig"],
      },
      { key: "facebook", label: "Facebook", aliases: ["facebook", "fb"] },
      { key: "tiktok", label: "TikTok", aliases: ["tiktok", "tik tok", "tt"] },
      { key: "youtube", label: "YouTube", aliases: ["youtube", "yt"] },
      {
        key: "twitter",
        label: "Twitter/X",
        aliases: ["twitter", "x", "tweet"],
      },
      { key: "telegram", label: "Telegram", aliases: ["telegram", "tg"] },
      { key: "snapchat", label: "Snapchat", aliases: ["snapchat", "snap"] },
      { key: "linkedin", label: "LinkedIn", aliases: ["linkedin", "li"] },
      { key: "pinterest", label: "Pinterest", aliases: ["pinterest", "pin"] },
      { key: "reddit", label: "Reddit", aliases: ["reddit"] },
      { key: "discord", label: "Discord", aliases: ["discord"] },
      { key: "threads", label: "Threads", aliases: ["threads", "thread"] },
      { key: "whatsapp", label: "WhatsApp", aliases: ["whatsapp", "wa"] },
      { key: "spotify", label: "Spotify", aliases: ["spotify"] },
      { key: "twitch", label: "Twitch", aliases: ["twitch"] },
      { key: "quora", label: "Quora", aliases: ["quora"] },
      { key: "tumblr", label: "Tumblr", aliases: ["tumblr"] },
    ],
    [],
  );

  const getCategoryPlatform = (category: string) => {
    const value = category.toLowerCase();
    const match = platformMatchers.find((p) =>
      p.aliases.some((alias) => value.includes(alias)),
    );
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

  const visiblePlatforms = useMemo(
    () =>
      socialPlatforms
        .filter((platform) => (platformServiceStats.get(platform.key) || 0) > 0)
        .slice(0, 12),
    [platformServiceStats, socialPlatforms],
  );

  const visibleCategories = useMemo(() => {
    let filtered = categories;
    if (categoryTypeFilter === "social") {
      filtered = filtered.filter(
        (category) => getCategoryPlatform(category) !== null,
      );
    } else if (categoryTypeFilter === "private") {
      filtered = filtered.filter((category) =>
        category.toLowerCase().includes("private"),
      );
    }

    if (!selectedPlatform) return filtered;
    const byPlatform = filtered.filter((category) => {
      if (category.toLowerCase().includes("private")) return true;
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
      if (
        categoryTypeFilter === "social" &&
        getCategoryPlatform(service.category) === null
      )
        return false;
      if (
        categoryTypeFilter === "private" &&
        !categoryValue.includes("private")
      )
        return false;
      if (
        selectedPlatform &&
        getCategoryPlatform(service.category) !== selectedPlatform &&
        !categoryValue.includes("private")
      )
        return false;
      if (selectedCategory && service.category !== selectedCategory)
        return false;
      return true;
    });
  }, [selectedPlatform, selectedCategory, allServices, categoryTypeFilter]);

  const searchedServices = useMemo(() => {
    const term = serviceSearch.trim().toLowerCase();
    if (!term) return filteredServices;
    return filteredServices.filter(
      (service) =>
        service.name.toLowerCase().includes(term) ||
        service.category.toLowerCase().includes(term),
    );
  }, [filteredServices, serviceSearch]);

  const searchSuggestions = useMemo(() => {
    const term = serviceSearch.trim().toLowerCase();
    if (!term) return [];
    return allServices
      .filter(
        (service) =>
          service.name.toLowerCase().includes(term) ||
          service.category.toLowerCase().includes(term),
      )
      .slice(0, 8);
  }, [allServices, serviceSearch]);

  const getEstimatedTimeHours = (service: Service | null): number | null => {
    if (!service) return null;
    const directHours = parseDurationToHours(service.completion_time);
    if (directHours) {
      return directHours;
    }

    const description = service.description || "";
    const labeledMatch = description.match(
      /(?:estimated\s+time|estimated\s+delivery|delivery\s+time|completion\s+time|avg(?:\.|erage)?\s*time|time)\s*[:\-]?\s*([^\n|]+)/i,
    );
    if (labeledMatch) {
      const labeledHours = parseDurationToHours(labeledMatch[1]);
      if (labeledHours) return labeledHours;
    }

    return parseDurationToHours(description);
  };

  const formatEstimatedTimeLabel = (service: Service | null): string => {
    return formatEstimatedTimeValue(getEstimatedTimeHours(service));
  };

  const getEstimatedCurrentCount = (): number | null => {
    if (orderStatus?.startCount === null || orderStatus?.startCount === undefined) {
      return null;
    }

    const startCount = Number(orderStatus.startCount);
    if (!Number.isFinite(startCount)) return null;

    if (
      orderStatus.quantity === null ||
      orderStatus.quantity === undefined ||
      orderStatus.remains === null ||
      orderStatus.remains === undefined
    ) {
      return startCount;
    }

    const orderedQuantity = Number(orderStatus.quantity);
    const remains = Number(orderStatus.remains);
    if (!Number.isFinite(orderedQuantity) || !Number.isFinite(remains)) {
      return startCount;
    }

    const delivered = Math.max(orderedQuantity - remains, 0);
    return Math.max(startCount + delivered, startCount);
  };

  const formatCountValue = (
    value: number | null | undefined,
    fallback = "Updating...",
  ): string => {
    if (value === null || value === undefined) return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed.toLocaleString() : fallback;
  };

  useEffect(() => {
    if (selectedCategory || serviceSearch || selectedPlatform) return;
    setServiceDropdownOpen(false);
  }, [selectedCategory, serviceSearch, selectedPlatform]);

  useEffect(() => {
    if (!selectedPlatform || !selectedCategory) return;
    if (getCategoryPlatform(selectedCategory) !== selectedPlatform) {
      setSelectedCategory("");
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
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  /**
   * Handle payment initiation - called after order is created
   */
  const handlePaymentRequest = async (amount: number): Promise<void> => {
    if (amount === 0) {
      console.log("[NewOrder] No payment needed (free order)");
      return;
    }

    setPaymentInProgress(true);
    try {
      console.log("[NewOrder] Initiating payment for:", amount);

      // Create payment record in database
      const payment = await paymentsAPI.createPayment(amount, "fastpay");

      if (payment.fastpay_order_id) {
        // TODO: Redirect to FastPay payment page
        console.log(
          "[NewOrder] Payment initiated, fastpay_order_id:",
          payment.fastpay_order_id,
        );
        // window.location.href = `https://fastpay.com/checkout?order_id=${payment.fastpay_order_id}`;
      }
    } catch (err) {
      console.error("[NewOrder] Payment initiation failed:", err);
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
      handlePaymentRequest,
    );

    if (result.status === "processing" || result.status === "completed") {
      // Clear form on success
      setLink("");
      setQuantity("");
      setSelectedService(null);
      setSelectedCategory("");
      setSelectedPlatform("");
      setServiceSearch("");

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
      <div className="max-w-6xl mx-auto pb-28 md:pb-0">
        <div className="space-y-4">
          {/* Skeleton Platform Filter */}
          <div className="bg-brand-container border border-brand-border rounded-[24px] p-3 sm:p-4 mb-6">
            <div className="flex gap-3 overflow-x-auto pb-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-10 w-24 rounded-2xl bg-white/5 animate-pulse" />
              ))}
            </div>
          </div>

          {/* Skeleton Search */}
          <div className="bg-brand-container border border-brand-border rounded-[24px] p-3 sm:p-4 mb-6">
            <div className="h-12 rounded-2xl bg-white/5 animate-pulse" />
          </div>

          {/* Skeleton Form */}
          <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_0.95fr] gap-6">
            <div className="bg-brand-container border border-brand-border rounded-2xl p-6 space-y-6">
              <div className="space-y-3">
                <div className="h-4 w-20 bg-white/5 rounded animate-pulse" />
                <div className="h-10 w-full bg-white/5 rounded-lg animate-pulse" />
              </div>
              <div className="space-y-3">
                <div className="h-4 w-20 bg-white/5 rounded animate-pulse" />
                <div className="h-10 w-full bg-white/5 rounded-lg animate-pulse" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="h-4 w-20 bg-white/5 rounded animate-pulse" />
                  <div className="h-10 w-full bg-white/5 rounded-lg animate-pulse" />
                </div>
                <div className="space-y-3">
                  <div className="h-4 w-20 bg-white/5 rounded animate-pulse" />
                  <div className="h-10 w-full bg-white/5 rounded-lg animate-pulse" />
                </div>
              </div>
              <div className="h-12 w-full bg-gradient-to-r from-brand-accent/20 to-brand-purple/20 rounded-lg animate-pulse" />
            </div>

            {/* Sidebar Skeleton */}
            <div className="hidden lg:block bg-brand-container border border-brand-border rounded-2xl p-4 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-3 w-16 bg-white/5 rounded animate-pulse" />
                  <div className="h-4 w-full bg-white/5 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center mt-8">
          <div className="text-center">
            <div className="inline-flex items-center gap-3 mb-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-purple"></div>
              <span className="text-sm text-gray-400">Loading services...</span>
            </div>
            <p className="text-xs text-gray-500">This may take a moment on first load</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto scroll-mt-0 pb-28 md:pb-0">
      {/* Status Messages */}
      {orderError && (
        <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400 text-sm flex items-start justify-between">
          <span>{orderError}</span>
          {orderError.includes("Failed") && (
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
              <p>
                Status:{" "}
                <span className="text-blue-400 font-bold capitalize">
                  {orderStatus.status}
                </span>
              </p>
              {orderStatus.providerOrderId && (
                <p>
                  Provider Order:{" "}
                  <span className="text-gray-400">
                    {orderStatus.providerOrderId}
                  </span>
                </p>
              )}
            </div>
            {isCheckingStatus && (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                <span className="text-xs text-blue-400">Checking...</span>
              </div>
            )}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-blue-400/20 bg-black/20 px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-blue-200/70">
                Estimated Time
              </p>
              <p className="mt-1 text-sm font-semibold text-white">
                {formatEstimatedTimeValue(orderStatus.estimatedCompletionHours)}
              </p>
            </div>
            <div className="rounded-xl border border-blue-400/20 bg-black/20 px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-blue-200/70">
                Starting Count
              </p>
              <p className="mt-1 text-sm font-semibold text-white">
                {formatCountValue(orderStatus.startCount)}
              </p>
            </div>
            <div className="rounded-xl border border-blue-400/20 bg-black/20 px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-blue-200/70">
                Current Count
              </p>
              <p className="mt-1 text-sm font-semibold text-white">
                {formatCountValue(getEstimatedCurrentCount())}
              </p>
            </div>
            <div className="rounded-xl border border-blue-400/20 bg-black/20 px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-blue-200/70">
                Remaining
              </p>
              <p className="mt-1 text-sm font-semibold text-white">
                {formatCountValue(orderStatus.remains)}
              </p>
            </div>
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

      <section className="bg-brand-container border border-brand-border rounded-[24px] p-3 sm:p-4 mb-6 overflow-visible">
        <div className="overflow-x-auto ds-scrollbar pb-1">
          <div className="flex min-w-max items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setSelectedPlatform("");
                setSelectedCategory("");
                setSelectedService(null);
                setServiceSearch("");
              }}
              className={`inline-flex h-[40px] items-center gap-3 rounded-2xl border px-4 text-[10px] font-[300] transition ${
                selectedPlatform === ""
                  ? "border-brand-purple/60 bg-gradient-to-r from-brand-accent/20 to-brand-purple/20 text-white shadow-purple-glow-sm"
                  : "border-white/10 bg-white/[0.03] text-gray-200 hover:border-brand-purple/40 hover:bg-white/[0.05]"
              }`}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                {renderCategoryIcon("all", "w-6 h-6")}
              </span>
              <span>All</span>
            </button>

            {visiblePlatforms.map((platform) => (
              <button
                key={platform.key}
                type="button"
                onClick={() => {
                  setSelectedPlatform(platform.key);
                  setSelectedCategory("");
                  setSelectedService(null);
                }}
                className={`inline-flex h-[40px] items-center gap-3 rounded-2xl border px-4 text-[10px] font-[300]  transition ${
                  selectedPlatform === platform.key
                    ? "border-brand-purple/60 bg-gradient-to-r from-brand-accent/20 to-brand-purple/20 text-white shadow-purple-glow-sm"
                    : "border-white/10 bg-white/[0.03] text-gray-200 hover:border-brand-purple/40 hover:bg-white/[0.05]"
                }`}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                  {renderCategoryIcon(platform.label, "w-6 h-6")}
                </span>
                <span className="whitespace-nowrap">{platform.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div ref={searchBoxRef} className="relative mt-3">
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-gray-500">
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
            </span>
            <input
              type="text"
              value={serviceSearch}
              onChange={(e) => {
                setServiceSearch(e.target.value);
                setShowSearchSuggestions(true);
              }}
              onFocus={() => setShowSearchSuggestions(true)}
              placeholder="Search service..."
              className="h-[50px] w-full rounded-2xl border border-white/10 bg-black/30 pl-12 pr-14 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-purple"
            />
            {serviceSearch && (
              <button
                type="button"
                onClick={() => {
                  setServiceSearch("");
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
                  onClick={() => {
                    setServiceSearch(service.name);
                    setSelectedService(service);
                    setSelectedCategory(service.category);
                    setSelectedPlatform(
                      getCategoryPlatform(service.category) || "",
                    );
                    setServiceDropdownOpen(false);
                    setShowSearchSuggestions(false);
                  }}
                  className="w-full border-b border-brand-border px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-white/5"
                >
                  <p className="text-sm font-medium text-white truncate">
                    {service.name}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {service.category}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
      <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_0.95fr] gap-6">
        <div>
          <div className="bg-brand-container border border-brand-border rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-brand-accent font-semibold">
                  Order Placement
                </p>
                <h2 className="mt-2 text-xl font-bold text-white">
                  Select service and place order
                </h2>
              </div>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex flex-col gap-4 lg:grid lg:grid-cols-1">
                <div>
                  <label
                    htmlFor="category"
                    className="block text-sm font-semibold text-gray-300 mb-2"
                  >
                    Category
                  </label>
                  <div className="relative" ref={categoryPickerRef}>
                    <button
                      id="category"
                      type="button"
                      aria-haspopup="listbox"
                      aria-expanded={categoryDropdownOpen}
                      onClick={() => {
                        setServiceDropdownOpen(false);
                        setCategoryDropdownOpen((prev) => !prev);
                      }}
                      className="w-full bg-brand-input border border-brand-border rounded-lg p-3 text-white focus:ring-2 focus:ring-brand-purple focus:outline-none cursor-pointer flex items-center justify-between gap-3"
                    >
                      <span className="min-w-0 flex items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                          {renderCategoryIcon(selectedCategory || "Other", "w-6 h-6")}
                        </span>
                        <span className="truncate">
                          {selectedCategory || "Select a category..."}
                        </span>
                      </span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className={`h-4 w-4 shrink-0 text-gray-300 transition-transform ${categoryDropdownOpen ? "rotate-180" : ""}`}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>

                    {categoryDropdownOpen && (
                      <div
                        role="listbox"
                        className="absolute left-0 right-0 z-30 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-brand-border bg-[#120a25] shadow-xl ds-scrollbar"
                      >
                        {visibleCategories.length === 0 ? (
                          <div className="px-4 py-3 text-lg text-gray-400">
                            No categories found.
                          </div>
                        ) : (
                          visibleCategories.map((cat) => {
                            const platform = getPlatformInfo(cat);
                            const selected = cat === selectedCategory;
                            return (
                              <button
                                key={cat}
                                type="button"
                                role="option"
                                aria-selected={selected}
                                onClick={() => {
                                  setSelectedCategory(cat);
                                  setSelectedPlatform(
                                    cat ? getCategoryPlatform(cat) || "" : "",
                                  );
                                  setSelectedService(null);
                                  setServiceSearch("");
                                  setServiceDropdownOpen(false);
                                  setCategoryDropdownOpen(false);
                                }}
                                className={`w-full border-b border-brand-border px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-white/5 flex items-center gap-3 ${
                                  selected ? "bg-white/5" : ""
                                }`}
                              >
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                                  {renderCategoryIcon(cat, "w-6 h-6")}
                                </span>
                                <span className="min-w-0 truncate whitespace-normal text-sm font-semibold text-white">
                                  {cat}
                                </span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="service"
                    className="block text-sm font-semibold text-gray-300 mb-2"
                  >
                    Service
                  </label>
                  {selectedCategory || serviceSearch || selectedPlatform ? (
                    <div className="relative" ref={servicePickerRef}>
                      <button
                        id="service"
                        type="button"
                        aria-haspopup="listbox"
                        aria-expanded={serviceDropdownOpen}
                        onClick={() => {
                          setCategoryDropdownOpen(false);
                          setServiceDropdownOpen((prev) => !prev);
                        }}
                        className="w-full rounded-lg border border-brand-border bg-brand-input px-4 py-3 text-left text-white transition focus:outline-none focus:ring-2 focus:ring-brand-purple"
                      >
                        <span className="flex items-center justify-between gap-3">
                          <span className="min-w-0 flex items-center gap-3">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center text-gray-200">
                              {renderCategoryIcon(
                                selectedService?.category ||
                                  selectedCategory ||
                                  "Other",
                                "h-6 w-6",
                              )}
                            </span>
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold text-white break-words">
                                {selectedService
                                  ? selectedService.name
                                  : searchedServices.length === 0
                                    ? "No service found"
                                    : "Select a service..."}
                              </span>
                              <span className="mt-1 block text-xs text-gray-400 break-words leading-relaxed">
                                {selectedService
                                  ? `${formatAmount(selectedService.rate_per_1000)}/1k • Min ${selectedService.min_quantity.toLocaleString()} • Max ${selectedService.max_quantity.toLocaleString()} • ${formatEstimatedTimeLabel(selectedService)}`
                                  : "Choose from synced provider services"}
                              </span>
                            </span>
                          </span>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            className={`h-4 w-4 shrink-0 text-gray-300 transition-transform ${serviceDropdownOpen ? "rotate-180" : ""}`}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </span>
                      </button>

                      {serviceDropdownOpen && (
                        <div
                          role="listbox"
                          className="absolute w-full left-0 right-0 z-30 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-brand-border bg-[#120a25] shadow-xl ds-scrollbar"
                        >
                          {searchedServices.length === 0 ? (
                            <div className="px-4 py-3 text-sm text-gray-400">
                              No service found for this search/filter.
                            </div>
                          ) : (
                            searchedServices.map((service) => {
                              const selected = selectedService?.id === service.id;
                              return (
                                <button
                                  key={service.id}
                                  type="button"
                                  role="option"
                                  aria-selected={selected}
                                  onClick={() => {
                                    if (!selectedCategory) {
                                      setSelectedCategory(service.category);
                                      setSelectedPlatform(
                                        getCategoryPlatform(service.category) ||
                                          "",
                                      );
                                    }
                                    setSelectedService(service);
                                    setServiceDropdownOpen(false);
                                  }}
                                  className={`flex w-full items-start gap-3 border-b border-brand-border px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-white/5 ${
                                    selected ? "bg-white/5" : ""
                                  }`}
                                >
                                  <span className="flex h-6 w-6 shrink-0 items-center justify-center text-gray-200 mt-0.5">
                                    {renderCategoryIcon(service.category, "h-6 w-6")}
                                  </span>
                                  <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-semibold text-white break-words">
                                      {service.name}
                                    </span>
                                    <span className="mt-1 block text-xs text-gray-400 break-words leading-relaxed">
                                      {formatAmount(service.rate_per_1000)}/1k • Min{" "}
                                      {service.min_quantity.toLocaleString()} • Max{" "}
                                      {service.max_quantity.toLocaleString()} •{" "}
                                      {formatEstimatedTimeLabel(service)}
                                    </span>
                                  </span>
                                </button>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-full bg-black/20 border border-brand-border rounded-lg p-3 text-gray-400 text-sm">
                      Select category first or open the Services page.
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_220px] gap-4">
                <div>
                  <label
                    htmlFor="link"
                    className="block text-sm font-semibold text-gray-300 mb-2"
                  >
                    Link
                  </label>
                  <input
                    type="url"
                    id="link"
                    name="orderLink"
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    placeholder="https://www.instagram.com/username"
                    required
                    className="w-full bg-brand-input border border-brand-border rounded-lg p-3 text-white placeholder-slate-400 focus:ring-2 focus:ring-brand-purple focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="quantity"
                    className="block text-sm font-semibold text-gray-300 mb-2"
                  >
                    Quantity
                  </label>
                  <input
                    type="number"
                    id="quantity"
                    name="orderQuantity"
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
                      Min: {selectedService.min_quantity.toLocaleString()} -
                      Max: {selectedService.max_quantity.toLocaleString()}
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-brand-container border border-brand-border rounded-2xl p-4 lg:hidden">
                <h2 className="text-lg font-bold mb-4 text-white">
                  Order Details
                </h2>
                {selectedService ? (
                  <div className="space-y-4 text-sm text-gray-300">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">
                        Service Name
                      </p>
                      <p className="font-semibold text-white">
                        {selectedService.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">
                        Category
                      </p>
                      <p className="font-semibold text-white flex items-center gap-2">
                        <span>
                          {getPlatformInfo(selectedService.category).icon}
                        </span>
                        {selectedService.category.charAt(0).toUpperCase() +
                          selectedService.category.slice(1)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">
                        Rate
                      </p>
                      <p className="font-semibold text-brand-accent">
                        {formatAmount(selectedService.rate_per_1000)}/1000
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">
                        Estimated Time
                      </p>
                      <p className="font-semibold text-white">
                        {formatEstimatedTimeLabel(selectedService)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">
                        Quantity Limits
                      </p>
                      <p className="font-semibold text-white">
                        {selectedService.min_quantity.toLocaleString()} -{" "}
                        {selectedService.max_quantity.toLocaleString()}
                      </p>
                    </div>
                    <hr className="border-brand-border" />
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">
                        Link
                      </p>
                      <p className="font-semibold text-white break-all">
                        {link || "Add the destination link in the order form."}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">
                        Quantity
                      </p>
                      <p className="font-semibold text-white">
                        {quantity
                          ? Number(quantity).toLocaleString()
                          : "Add quantity in the order form."}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">
                        Charge
                      </p>
                      <p className="font-semibold text-brand-accent">
                        {quantity
                          ? formatAmount(calculateChargeForDisplay())
                          : "Charge updates after quantity input"}
                      </p>
                    </div>
                    {selectedService.description && (
                      <>
                        <hr className="border-brand-border" />
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                            Description
                          </p>
                          <div className="whitespace-pre-wrap break-words leading-relaxed text-gray-300">
                            {getDisplayDescription(selectedService.description)}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-400 text-sm">
                      Select a service to view details
                    </p>
                  </div>
                )}
              </div>

              {/* Charge Calculation */}
              {selectedService && quantity && (
                <div className="bg-black/40 border border-brand-border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between text-sm text-gray-300">
                    <span>Service Rate:</span>
                    <span>
                      {formatAmount(selectedService.rate_per_1000)}/1k
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-300">
                    <span>Quantity:</span>
                    <span>{parseInt(quantity).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-300">
                    <span>Estimated Delivery:</span>
                    <span className="text-brand-accent">
                      {formatEstimatedTimeLabel(selectedService)}
                    </span>
                  </div>
                  <div className="border-t border-brand-border pt-3 flex justify-between items-center">
                    <span className="font-semibold text-gray-300">Charge</span>
                    <span className="text-2xl font-bold text-brand-accent">
                      {formatAmount(calculateChargeForDisplay())}
                    </span>
                  </div>
                  {profile && profile.balance < calculateChargeForDisplay() && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded p-2 text-xs text-red-400 mt-2">
                      Insufficient balance (${profile.balance.toFixed(2)}{" "}
                      available)
                    </div>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={
                  loading ||
                  paymentInProgress ||
                  !selectedService ||
                  !quantity ||
                  !link
                }
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
                  "Submit Order"
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Service Details Sidebar */}
        <div>
          <div className="bg-brand-container border border-brand-border rounded-2xl p-4 hidden lg:block ">
            <h2 className="text-lg font-bold mb-4 text-white">Order Details</h2>
            {selectedService ? (
              <div className="space-y-4 text-sm text-gray-300">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">
                    Service Name
                  </p>
                  <p className="font-semibold text-white">
                    {selectedService.name}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">
                    Category
                  </p>
                  <p className="font-semibold text-white flex items-center gap-2">
                    <span>
                      {getPlatformInfo(selectedService.category).icon}
                    </span>
                    {selectedService.category.charAt(0).toUpperCase() +
                      selectedService.category.slice(1)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">
                    Rate
                  </p>
                  <p className="font-semibold text-brand-accent">
                    {formatAmount(selectedService.rate_per_1000)}/1000
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">
                    Estimated Time
                  </p>
                  <p className="font-semibold text-white">
                    {formatEstimatedTimeLabel(selectedService)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">
                    Quantity Limits
                  </p>
                  <p className="font-semibold text-white">
                    {selectedService.min_quantity.toLocaleString()} -{" "}
                    {selectedService.max_quantity.toLocaleString()}
                  </p>
                </div>
                <hr className="border-brand-border" />
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">
                    Link
                  </p>
                  <p className="font-semibold text-white break-all">
                    {link || "Add the destination link in the order form."}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">
                    Quantity
                  </p>
                  <p className="font-semibold text-white">
                    {quantity
                      ? Number(quantity).toLocaleString()
                      : "Add quantity in the order form."}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">
                    Charge
                  </p>
                  <p className="font-semibold text-brand-accent">
                    {quantity
                      ? formatAmount(calculateChargeForDisplay())
                      : "Charge updates after quantity input"}
                  </p>
                </div>
                {selectedService.description && (
                  <>
                    <hr className="border-brand-border" />
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                        Description
                      </p>
                      <div className="whitespace-pre-wrap break-words leading-relaxed text-gray-300">
                        {getDisplayDescription(selectedService.description)}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400 text-sm">
                  Select a service to view details
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewOrderPage;
