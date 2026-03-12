/**
 * Backend Caching Utility with Timeout & Request Deduplication
 *
 * Features:
 * - In-memory cache with TTL
 * - Request deduplication (prevent thundering herd)
 * - Timeout protection (prevents hanging requests)
 * - Stale-while-revalidate pattern (return stale data on refresh timeout)
 * - Fallback to cached data if refresh fails
 *
 * Usage:
 * ```
 * const cache = new Cache(10 * 60 * 1000); // 10-minute TTL
 * const data = await cache.get('services', () => fetchServicesFromDB());
 * ```
 */

/**
 * Advanced in-memory cache with timeout handling and request deduplication
 */
class CacheStore {
  constructor(ttlMs = 10 * 60 * 1000, fetchTimeoutMs = 8000) {
    this.store = new Map();
    this.ttl = ttlMs;
    this.fetchTimeout = fetchTimeoutMs;
    this.pendingRequests = new Map();
  }

  /**
   * Create a timeout promise that rejects after ms
   */
  createTimeoutPromise(ms) {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Cache fetch timeout after ${ms}ms`)), ms)
    );
  }

  /**
   * Get a value from cache or execute fetcher function with timeout
   *
   * Implements stale-while-revalidate pattern:
   * 1. Return fresh cache if available
   * 2. If cache is stale, try to refresh with timeout
   * 3. If refresh times out, return stale cache if available
   * 4. Cache miss = execute fetcher (new data)
   *
   * @param key - Cache key
   * @param fetcher - Async function to execute if cache miss
   * @returns Cached or freshly fetched data
   */
  async get(key, fetcher) {
    const now = Date.now();
    const entry = this.store.get(key);

    // Fresh cache hit - return immediately
    if (entry && entry.expiresAt > now && !entry.stale) {
      console.log(`[Cache] HIT (fresh): ${key}`);
      return entry.data;
    }

    // Stale cache - try to refresh with timeout, fallback to stale
    if (entry && entry.createdAt + this.ttl <= now) {
      console.log(`[Cache] STALE: ${key} - attempting refresh with ${this.fetchTimeout}ms timeout`);
      
      try {
        // Use deduplication for concurrent requests
        const pendingKey = `${key}:refresh`;
        if (!this.pendingRequests.has(pendingKey)) {
          const refreshPromise = Promise.race([
            fetcher(),
            this.createTimeoutPromise(this.fetchTimeout),
          ]).then(data => {
            this.set(key, data);
            this.pendingRequests.delete(pendingKey);
            return data;
          }).catch(error => {
            this.pendingRequests.delete(pendingKey);
            console.warn(`[Cache] Refresh failed for ${key}: ${error.message}; using stale data`);
            throw error;
          });
          
          this.pendingRequests.set(pendingKey, refreshPromise);
        }

        const refreshPromise = this.pendingRequests.get(pendingKey);
        return await refreshPromise;
      } catch (error) {
        // Refresh failed or timed out - return stale data
        console.warn(
          `[Cache] Refresh failed for ${key} (${error.message}); returning stale cache`
        );
        entry.stale = false; // Mark as usable again
        return entry.data;
      }
    }

    // Cache miss - fetch fresh data
    console.log(`[Cache] MISS: ${key}`);
    const pendingKey = `${key}:fetch`;
    
    if (!this.pendingRequests.has(pendingKey)) {
      const fetchPromise = Promise.race([
        fetcher(),
        this.createTimeoutPromise(this.fetchTimeout),
      ]).then(data => {
        this.set(key, data);
        this.pendingRequests.delete(pendingKey);
        return data;
      }).catch(error => {
        this.pendingRequests.delete(pendingKey);
        throw error;
      });

      this.pendingRequests.set(pendingKey, fetchPromise);
    }

    return await this.pendingRequests.get(pendingKey);
  }

  /**
   * Set a value in cache
   *
   * @param key - Cache key
   * @param data - Data to cache
   */
  set(key, data) {
    const now = Date.now();
    const expiresAt = now + this.ttl;
    this.store.set(key, {
      data,
      expiresAt,
      createdAt: now,
      stale: false,
    });
    console.log(`[Cache] SET: ${key} (expires in ${this.ttl}ms)`);
  }

  /**
   * Invalidate a cache entry
   *
   * @param key - Cache key to invalidate
   */
  invalidate(key) {
    this.store.delete(key);
    console.log(`[Cache] INVALIDATED: ${key}`);
  }

  /**
   * Invalidate all entries matching a pattern
   *
   * @param pattern - Pattern or prefix to match
   */
  invalidatePattern(pattern) {
    const keys = Array.from(this.store.keys());
    const invalidatedKeys = keys.filter((key) => key.startsWith(pattern));
    invalidatedKeys.forEach((key) => {
      this.store.delete(key);
    });
    if (invalidatedKeys.length > 0) {
      console.log(`[Cache] INVALIDATED PATTERN: ${pattern} (${invalidatedKeys.length} entries)`);
    }
  }

  /**
   * Clear entire cache
   */
  clear() {
    const count = this.store.size;
    this.store.clear();
    console.log(`[Cache] CLEARED: ${count} entries`);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    const entries = Array.from(this.store.entries());
    const freshEntries = entries.filter(([_, entry]) => entry.expiresAt > now && !entry.stale);
    const staleEntries = entries.filter(([_, entry]) => entry.expiresAt <= now || entry.stale);

    return {
      total: this.store.size,
      fresh: freshEntries.length,
      stale: staleEntries.length,
      ttl: this.ttl,
      pendingRequests: this.pendingRequests.size,
      entries: entries.map(([key, entry]) => ({
        key,
        fresh: entry.expiresAt > now && !entry.stale,
        age: now - entry.createdAt,
      })),
    };
  }
}

/**
 * Global cache instance with 10-minute TTL and 5-second fetch timeout
 * Falls back to stale cache if fetch times out
 */
export const globalCache = new CacheStore(10 * 60 * 1000, 5000);

/**
 * Admin cache instance with 5-minute TTL and 5-second fetch timeout
 */
export const adminCache = new CacheStore(5 * 60 * 1000, 5000);

/**
 * HTTP response caching middleware
 *
 * Adds cache control headers to responses
 * Use on GET endpoints that should be cached
 *
 * Example:
 * ```
 * router.get('/api/services', cacheResponse(10 * 60), async (req, res) => {
 *   // ...
 * });
 * ```
 */
export function cacheResponse(ttlSeconds) {
  return (req, res, next) => {
    // Set cache control headers
    res.set('Cache-Control', `public, max-age=${ttlSeconds}`);
    // Add ETag for conditional requests
    res.set('ETag', `"${Date.now()}"`);
    next();
  };
}

export default CacheStore;
