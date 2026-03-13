import express from 'express';
import { supabase, supabaseConfigured } from '../lib/supabaseServer.js';
import { adminCache } from '../lib/cache.js';

const router = express.Router();
const PAGE_SIZE = 1000;
const MAX_ROWS = 50000;

/**
 * Fetch all services from Supabase
 * This is the actual database call
 */
async function fetchServicesFromDB() {
  if (!supabaseConfigured || !supabase) {
    return [];
  }

  const allServices = [];
  for (let offset = 0; offset < MAX_ROWS; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error('Supabase fetch services error:', error);
      throw error;
    }

    const page = Array.isArray(data) ? data : [];
    allServices.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

  return allServices;
}

async function fetchServicesWithTimeout(timeoutMs = 8000) {
  return Promise.race([
    fetchServicesFromDB(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Admin services fetch timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

// GET /api/admin/services
// Fetches all services with caching (5-minute TTL)
router.get('/', async (req, res) => {
  const startTime = Date.now();

  try {
    // Use admin cache with timeout protection
    const services = await adminCache.get('admin:services', () => fetchServicesWithTimeout(8000));

    const age = Date.now() - startTime;

    // Add cache control headers for HTTP-level caching
    res.set('Cache-Control', 'public, max-age=300'); // 5 minutes
    res.set('X-Cache-Source', 'server');
    res.set('X-Response-Time-Ms', String(age));

    console.log(`[Admin Services] GET /api/admin/services - ${services.length} services - ${age}ms`);

    return res.json({ services });
  } catch (err) {
    const age = Date.now() - startTime;
    console.error('Error fetching admin services:', {
      error: err.message,
      duration: age,
    });

    // Return graceful fallback instead of error
    res.set('Cache-Control', 'public, max-age=60'); // 1 minute fallback
    res.set('X-Cache-Source', 'fallback');
    
    return res.json({
      services: [],
      error: 'Services temporarily unavailable',
    });
  }
});

/**
 * POST /api/admin/services
 * Create a new service and invalidate cache
 */
router.post('/', async (req, res) => {
  try {
    if (!supabaseConfigured || !supabase) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    const { name, category, rate_per_1000, min_quantity, max_quantity, status, description } =
      req.body;

    const { data, error } = await supabase.from('services').insert([
      {
        name,
        category,
        rate_per_1000,
        min_quantity,
        max_quantity,
        status: status || 'active',
        description,
      },
    ]);

    if (error) {
      console.error('Supabase create service error:', error);
      return res.status(500).json({ error: error.message });
    }

    // Invalidate cache so next fetch gets fresh data
    adminCache.invalidate('admin:services');

    return res.status(201).json(data);
  } catch (err) {
    console.error('Server error creating service', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/admin/services/:id
 * Update a service and invalidate cache
 */
router.patch('/:id', async (req, res) => {
  try {
    if (!supabaseConfigured || !supabase) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabase
      .from('services')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) {
      console.error('Supabase update service error:', error);
      return res.status(500).json({ error: error.message });
    }

    // Invalidate cache
    adminCache.invalidate('admin:services');

    return res.json(data[0] || {});
  } catch (err) {
    console.error('Server error updating service', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/admin/services/:id
 * Delete a service and invalidate cache
 */
router.delete('/:id', async (req, res) => {
  try {
    if (!supabaseConfigured || !supabase) {
      return res.status(503).json({ error: 'Database not configured' });
    }

    const { id } = req.params;

    const { error } = await supabase.from('services').delete().eq('id', id);

    if (error) {
      console.error('Supabase delete service error:', error);
      return res.status(500).json({ error: error.message });
    }

    // Invalidate cache
    adminCache.invalidate('admin:services');

    return res.status(204).send();
  } catch (err) {
    console.error('Server error deleting service', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
