import express from 'express';
import { supabase, supabaseConfigured } from '../lib/supabaseServer.js';
import { globalCache } from '../lib/cache.js';

const router = express.Router();
const PAGE_SIZE = 1000;
const MAX_ROWS = 50000;

/**
 * Fetch active services for public consumption
 * Only returns services with status='active'
 */
async function fetchPublicServicesFromDB() {
  if (!supabaseConfigured || !supabase) {
    return [];
  }

  const allServices = [];
  for (let offset = 0; offset < MAX_ROWS; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('status', 'active')
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error('[Public Services] Supabase fetch error:', error);
      throw error;
    }

    const page = Array.isArray(data) ? data : [];
    allServices.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  return allServices;
}

/**
 * GET /api/services
 *
 * Public endpoint to fetch available services
 * Only returns active services with 10-minute cache TTL
 *
 * Features:
 * - Server-side in-memory caching (10 minutes)
 * - Request deduplication (if multiple requests arrive during fetch)
 * - HTTP cache headers for client-side caching
 * - Fast response times on cache hits
 *
 * Response:
 * ```
 * {
 *   "services": [
 *     {
 *       "id": "uuid",
 *       "name": "Instagram Followers",
 *       "category": "instagram",
 *       "rate_per_1000": 2.50,
 *       "min_quantity": 100,
 *       "max_quantity": 10000,
 *       "status": "active",
 *       ...
 *     }
 *   ]
 * }
 * ```
 */
router.get('/', async (req, res) => {
  const startTime = Date.now();

  try {
    // Use cache with timeout handling
    // If database is slow, will return stale cache if available
    const services = await globalCache.get('public:services', fetchPublicServicesFromDB);

    const age = Date.now() - startTime;

    // Add cache control headers for HTTP-level caching
    res.set('Cache-Control', 'public, max-age=600'); // 10 minutes
    res.set('X-Cache-Source', 'server');
    res.set('X-Response-Time-Ms', String(age));

    console.log(`[Services] GET /api/services - ${services.length} services - ${age}ms`);

    return res.json({
      services,
      cached: true,
      age: Math.floor(age / 1000),
    });
  } catch (err) {
    const age = Date.now() - startTime;
    console.error('[Services] Error fetching services:', {
      error: err.message,
      duration: age,
    });

    // Return graceful fallback
    res.set('Cache-Control', 'public, max-age=60'); // 1 minute fallback cache
    res.set('X-Cache-Source', 'fallback');
    
    return res.json({
      services: [],
      cached: false,
      error: 'Service temporarily unavailable',
    });
  }
});

export default router;
