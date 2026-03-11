import express from 'express';
import { supabaseAdmin, supabaseAdminConfigured } from '../lib/supabaseServer.js';
import { validateRequest, validateQuery, schemas } from '../lib/validation.js';
import { successResponse, errorResponse, asyncHandler } from '../lib/apiResponse.js';

const router = express.Router();
const SUPABASE_QUERY_TIMEOUT_MS = 12000;
const PROVIDER_SERVICES_CACHE_TTL_MS = 60000;

let providerServicesCache = {
  expiresAt: 0,
  value: null,
};

const getApiKeyFromRequest = (req) => {
  const directKey = req.headers['x-api-key'];
  if (directKey) {
    return String(directKey).trim();
  }

  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (authHeader) {
    const [scheme, value] = String(authHeader).split(' ');
    if (/^Bearer$/i.test(scheme) && value) {
      return value.trim();
    }
  }

  return '';
};

const extractProviderServiceId = (description) => {
  const text = String(description || '');
  const match = text.match(/Provider Service ID:\s*([^|]+)/i);
  return match ? String(match[1]).trim() : '';
};

const extractProviderId = (description) => {
  const text = String(description || '');
  const match = text.match(/Provider ID:\s*([^|]+)/i);
  return match ? String(match[1]).trim() : '';
};

async function runTimedQuery(query, label) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SUPABASE_QUERY_TIMEOUT_MS);

  try {
    return await query.abortSignal(controller.signal);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error(`[Server] ${label} timed out after ${SUPABASE_QUERY_TIMEOUT_MS}ms`);
      return {
        data: null,
        error: new Error(`${label} timed out`),
      };
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// GET /api/integrations/provider-names
// Fetches provider names using admin access (bypasses RLS)
router.get(
  '/provider-names',
  asyncHandler(async (req, res) => {
    if (!supabaseAdminConfigured || !supabaseAdmin) {
      return res.status(503).json(errorResponse('SERVICE_UNAVAILABLE', 'Service temporarily unavailable'));
    }

    const { data: providers, error } = await supabaseAdmin
      .from('providers')
      .select('id, name');

    if (error) {
      console.error('[Server] Error fetching provider names:', error);
      return res.status(500).json(errorResponse('FETCH_PROVIDERS_FAILED', 'Failed to fetch providers'));
    }

    // Build a map for easy client-side lookup
    const providerMap = {};
    if (providers) {
      providers.forEach(p => {
        providerMap[p.id] = p.name || 'Unknown Provider';
      });
    }

    console.log('[Server] Provider names fetched:', Object.keys(providerMap).length, 'providers');
    return res.json(successResponse({ providers: providerMap }));
  })
);

// GET /api/integrations/service-names
// Fetches all service names using admin access (bypasses RLS)
router.get(
  '/service-names',
  asyncHandler(async (req, res) => {
    if (!supabaseAdminConfigured || !supabaseAdmin) {
      return res.status(503).json(errorResponse('SERVICE_UNAVAILABLE', 'Service temporarily unavailable'));
    }

    const { data: services, error } = await supabaseAdmin
      .from('services')
      .select('id, name, category, description');

    if (error) {
      console.error('[Server] Error fetching service names:', error);
      return res.status(500).json(errorResponse('FETCH_SERVICES_FAILED', 'Failed to fetch services'));
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
    return res.json(successResponse({ services: serviceMap }));
  })
);

// GET /api/integrations/provider-service-link
// Resolves a single service to its provider mapping during order submit.
router.get(
  '/provider-service-link',
  validateQuery(schemas.providerServiceLinkQuery),
  asyncHandler(async (req, res) => {
    if (!supabaseAdminConfigured || !supabaseAdmin) {
      return res.status(503).json(errorResponse('SERVICE_UNAVAILABLE', 'Service temporarily unavailable'));
    }

    const serviceId = req.validatedQuery.service_id;

    const { data: serviceRow, error: serviceError } = await runTimedQuery(
      supabaseAdmin
        .from('services')
        .select('id, description')
        .eq('id', serviceId)
        .maybeSingle(),
      'single service lookup query'
    );

    if (serviceError) {
      console.error('[Server] Error fetching service for provider link:', serviceError);
      return res.status(500).json(errorResponse('SERVICE_LOOKUP_FAILED', 'Failed to resolve service mapping'));
    }

    const providerServiceIdFromDescription = extractProviderServiceId(serviceRow?.description);
    const providerIdFromDescription = extractProviderId(serviceRow?.description);

    const { data: directLink, error: directLinkError } = await runTimedQuery(
      supabaseAdmin
        .from('provider_services')
        .select('provider_id, provider_service_id, service_id, status')
        .eq('service_id', serviceId)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle(),
      'direct provider service link query'
    );

    if (directLinkError) {
      console.error('[Server] Error fetching direct provider link:', directLinkError);
      return res.status(500).json(errorResponse('DIRECT_LINK_FAILED', 'Failed to resolve provider link'));
    }

    if (directLink?.provider_id && directLink?.provider_service_id) {
      return res.json(successResponse({ providerLink: directLink }));
    }

    if (providerServiceIdFromDescription) {
      const { data: descriptionLink, error: descriptionLinkError } = await runTimedQuery(
        supabaseAdmin
          .from('provider_services')
          .select('provider_id, provider_service_id, service_id, status')
          .eq('provider_service_id', providerServiceIdFromDescription)
          .eq('status', 'active')
          .limit(1)
          .maybeSingle(),
        'description provider service link query'
      );

      if (descriptionLinkError) {
        console.error('[Server] Error fetching description-based provider link:', descriptionLinkError);
        return res.status(500).json(errorResponse('DESCRIPTION_LINK_FAILED', 'Failed to resolve provider link'));
      }

      if (descriptionLink?.provider_id && descriptionLink?.provider_service_id) {
        return res.json(successResponse({ providerLink: descriptionLink }));
      }
    }

    if (providerIdFromDescription && providerServiceIdFromDescription) {
      return res.json(
        successResponse({
          providerLink: {
            provider_id: providerIdFromDescription,
            provider_service_id: providerServiceIdFromDescription,
            service_id: serviceId,
            status: 'active',
          },
        })
      );
    }

    return res.json(successResponse({ providerLink: null }));
  })
);

// GET /api/integrations/provider-services
// Fetches provider services with actual service names (bypasses RLS)
router.get(
  '/provider-services',
  asyncHandler(async (req, res) => {
    if (!supabaseAdminConfigured || !supabaseAdmin) {
      return res.status(503).json(errorResponse('SERVICE_UNAVAILABLE', 'Service temporarily unavailable'));
    }

    if (providerServicesCache.expiresAt > Date.now() && providerServicesCache.value) {
      return res.json(
        successResponse({ providerServices: providerServicesCache.value, cached: true })
      );
    }

    const { data: providerServices, error } = await runTimedQuery(
      supabaseAdmin
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
        .eq('status', 'active'),
      'provider services query'
    );

    if (error) {
      console.error('[Server] Error fetching provider services:', error);
      // return an empty list rather than error to keep existing behavior
      return res.json(successResponse({ providerServices: [] }));
    }

    const { data: allServices, error: servicesError } = await runTimedQuery(
      supabaseAdmin
        .from('services')
        .select('id, name, category, description, status')
        .eq('status', 'active')
        .limit(5000),
      'services mapping query'
    );

    const serviceById = new Map();
    const serviceByProviderServiceId = new Map();
    if (servicesError) {
      console.error('[Server] Error fetching services for mapping:', servicesError);
    } else {
      (allServices || []).forEach((svc) => {
        serviceById.set(String(svc.id), svc);
        const providerSvcId = extractProviderServiceId(svc.description);
        if (providerSvcId && !serviceByProviderServiceId.has(providerSvcId)) {
          serviceByProviderServiceId.set(providerSvcId, svc);
        }
      });
    }

    const mergedProviderServices = (providerServices || []).map((row) => {
      const byId = row.service_id ? serviceById.get(String(row.service_id)) : null;
      const byProviderServiceId = serviceByProviderServiceId.get(String(row.provider_service_id || '').trim()) || null;
      return {
        ...row,
        services: byId || byProviderServiceId || null,
      };
    });

    providerServicesCache = {
      expiresAt: Date.now() + PROVIDER_SERVICES_CACHE_TTL_MS,
      value: mergedProviderServices,
    };

    console.log('[Server] Provider services fetched:', mergedProviderServices.length, 'services');
    return res.json(successResponse({ providerServices: mergedProviderServices }));
  })
);

// POST /api/integrations
// Basic example: accept requests with header 'x-api-key' representing a per-user API key
// and return basic user info or allow order creation in a production implementation.
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const apiKey = getApiKeyFromRequest(req);
    if (!apiKey) return res.status(401).json(errorResponse('MISSING_API_KEY', 'Missing API key'));

    if (!supabaseAdminConfigured || !supabaseAdmin) {
      return res.status(503).json(errorResponse('SERVICE_UNAVAILABLE', 'Service temporarily unavailable (Supabase not configured on server)'));
    }

    const { data: users, error } = await supabaseAdmin
      .from('user_profiles')
      .select('id, username, role, balance')
      .eq('api_key', apiKey)
      .limit(1);

    if (error) {
      console.error('Supabase error looking up api key', error);
      return res.status(500).json(errorResponse('INTEGRATION_ERROR', 'Internal server error'));
    }

    const user = (users && users[0]) || null;
    if (!user) return res.status(401).json(errorResponse('INVALID_API_KEY', 'Invalid API key'));

    // For now return a small integration contract. In production, you'd implement
    // create order, check balance, charge, and return order status.
    return res.json(successResponse({
      user: { id: user.id, username: user.username, role: user.role, balance: user.balance },
      note: 'This endpoint verifies API key. Implement order creation and other actions as needed.'
    }));
  })
);

export default router;
