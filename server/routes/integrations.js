import express from 'express';
import { supabase, supabaseConfigured, supabaseAdmin } from '../lib/supabaseServer.js';

const router = express.Router();

const extractProviderServiceId = (description) => {
  const text = String(description || '');
  const match = text.match(/Provider Service ID:\s*([^|]+)/i);
  return match ? String(match[1]).trim() : '';
};

// GET /api/integrations/provider-names
// Fetches provider names using admin access (bypasses RLS)
router.get('/provider-names', async (req, res) => {
  try {
    if (!supabaseConfigured || !supabaseAdmin) {
      return res.status(503).json({ error: 'Service temporarily unavailable' });
    }

    const { data: providers, error } = await supabaseAdmin
      .from('providers')
      .select('id, name');

    if (error) {
      console.error('[Server] Error fetching provider names:', error);
      return res.status(500).json({ error: 'Failed to fetch providers' });
    }

    // Build a map for easy client-side lookup
    const providerMap = {};
    if (providers) {
      providers.forEach(p => {
        providerMap[p.id] = p.name || 'Unknown Provider';
      });
    }

    console.log('[Server] Provider names fetched:', Object.keys(providerMap).length, 'providers');
    return res.json({ ok: true, providers: providerMap });
  } catch (err) {
    console.error('[Server] Provider names error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/integrations/service-names
// Fetches all service names using admin access (bypasses RLS)
router.get('/service-names', async (req, res) => {
  try {
    if (!supabaseConfigured || !supabaseAdmin) {
      return res.status(503).json({ error: 'Service temporarily unavailable' });
    }

    const { data: services, error } = await supabaseAdmin
      .from('services')
      .select('id, name, category, description');

    if (error) {
      console.error('[Server] Error fetching service names:', error);
      return res.status(500).json({ error: 'Failed to fetch services' });
    }

    // Build a map for easy client-side lookup
    const serviceMap = {};
    if (services) {
      services.forEach(s => {
        serviceMap[s.id] = {
          name: s.name || 'Unknown Service',
          category: s.category || 'General',
          description: s.description || ''
        };
      });
    }

    console.log('[Server] Service names fetched:', Object.keys(serviceMap).length, 'services');
    return res.json({ ok: true, services: serviceMap });
  } catch (err) {
    console.error('[Server] Service names error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/integrations/provider-services
// Fetches provider services with actual service names (bypasses RLS)
router.get('/provider-services', async (req, res) => {
  try {
    if (!supabaseConfigured || !supabaseAdmin) {
      return res.status(503).json({ error: 'Service temporarily unavailable' });
    }

    // Fetch provider services without relying on FK embed joins
    const { data: providerServices, error } = await supabaseAdmin
      .from('provider_services')
      .select(`
        id,
        provider_id,
        provider_service_id,
        provider_rate,
        our_rate,
        min_quantity,
        max_quantity,
        status,
        service_id
      `)
      .eq('status', 'active');

    if (error) {
      console.error('[Server] Error fetching provider services:', error);
      return res.status(500).json({ error: 'Failed to fetch provider services' });
    }

    const { data: allServices, error: servicesError } = await supabaseAdmin
      .from('services')
      .select('id, name, category, description, status')
      .eq('status', 'active')
      .limit(20000);

    if (servicesError) {
      console.error('[Server] Error fetching services for mapping:', servicesError);
      return res.status(500).json({ error: 'Failed to fetch services for mapping' });
    }

    const serviceById = new Map();
    const serviceByProviderServiceId = new Map();
    (allServices || []).forEach((svc) => {
      serviceById.set(String(svc.id), svc);
      const providerSvcId = extractProviderServiceId(svc.description);
      if (providerSvcId && !serviceByProviderServiceId.has(providerSvcId)) {
        serviceByProviderServiceId.set(providerSvcId, svc);
      }
    });

    const mergedProviderServices = (providerServices || []).map((row) => {
      const byId = row.service_id ? serviceById.get(String(row.service_id)) : null;
      const byProviderServiceId = serviceByProviderServiceId.get(String(row.provider_service_id || '').trim()) || null;
      return {
        ...row,
        services: byId || byProviderServiceId || null,
      };
    });

    console.log('[Server] Provider services fetched:', mergedProviderServices.length, 'services');
    return res.json({ ok: true, providerServices: mergedProviderServices });
  } catch (err) {
    console.error('[Server] Provider services error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/integrations
// Basic example: accept requests with header 'x-api-key' representing a per-user API key
// and return basic user info or allow order creation in a production implementation.
router.post('/', async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) return res.status(401).json({ error: 'Missing API key' });

    if (!supabaseConfigured || !supabase) {
      return res.status(503).json({ error: 'Service temporarily unavailable (Supabase not configured on server)' });
    }

    // Look up user by api_key column in user_profiles table (assumes such a column exists)
    const { data: users, error } = await supabase
      .from('user_profiles')
      .select('id, username, role, balance')
      .eq('api_key', apiKey)
      .limit(1);

    if (error) {
      console.error('Supabase error looking up api key', error);
      return res.status(500).json({ error: 'Internal server error' });
    }

    const user = (users && users[0]) || null;
    if (!user) return res.status(401).json({ error: 'Invalid API key' });

    // For now return a small integration contract. In production, you'd implement
    // create order, check balance, charge, and return order status.
    return res.json({
      ok: true,
      user: { id: user.id, username: user.username, role: user.role, balance: user.balance },
      note: 'This endpoint verifies API key. Implement order creation and other actions as needed.'
    });
  } catch (err) {
    console.error('Integrations error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
