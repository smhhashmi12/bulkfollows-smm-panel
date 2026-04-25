// In-memory cache for services with TTL
let cachedServices: any[] = [];
let cacheExpiration = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const getServicesFromCache = () => {
  const now = Date.now();
  if (cachedServices.length > 0 && cacheExpiration > now) {
    console.log('[servicesCache] Returning cached services');
    return cachedServices;
  }
  return null;
};

export const setServicesCache = (services: any[]) => {
  cachedServices = services;
  cacheExpiration = Date.now() + CACHE_TTL;
  console.log(`[servicesCache] Services cached for ${CACHE_TTL / 1000}s`);
};

export const clearServicesCache = () => {
  cachedServices = [];
  cacheExpiration = 0;
};
