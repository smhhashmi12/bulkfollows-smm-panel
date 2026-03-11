import express from 'express';
import {
  supabase,
  supabaseAdmin,
  supabaseConfigured,
  supabaseAdminConfigured,
} from '../lib/supabaseServer.js';
import { AUTH_COOKIE_NAMES } from '../lib/authCookies.js';
import { successResponse, errorResponse, asyncHandler } from '../lib/apiResponse.js';
import { validateRequest, validateQuery, schemas } from '../lib/validation.js';

const router = express.Router();
const MAX_DECIMAL_10_2 = 99999999.99;
const MAX_INT32 = 2147483647;

const pickFirst = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const normalized = String(value).trim();
    if (normalized !== '') return normalized;
  }
  return '';
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number.parseFloat(String(value ?? ''));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toInteger = (value, fallback = 0) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clampDecimal10_2 = (value, fallback = 0) => {
  const parsed = toNumber(value, fallback);
  const bounded = Math.min(Math.max(parsed, 0), MAX_DECIMAL_10_2);
  return Number(bounded.toFixed(2));
};

const clampQuantity = (value, fallback = 1) => {
  const parsed = toInteger(value, fallback);
  return Math.min(Math.max(parsed, 1), MAX_INT32);
};

const limitText = (value, maxLength = 240) => {
  const text = String(value || '').trim();
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1).trimEnd() + '…';
};

const getEmbeddedObject = (value) => {
  if (!value) return null;
  return Array.isArray(value) ? value[0] || null : value;
};

const getSupabaseServerError = (error, fallbackMessage = 'Internal server error') => {
  const message = String(error?.message || error || '').trim();
  if (message.toLowerCase().includes('invalid api key')) {
    return {
      status: 503,
      message: 'Server Supabase key is invalid. Update SUPABASE_SERVICE_ROLE_KEY in Vercel project settings.',
    };
  }

  return {
    status: 500,
    message: message || fallbackMessage,
  };
};

// GET /api/admin/me - returns the user_profiles entry for the current session user
// This endpoint accepts either a Bearer token (Authorization header) or a browser session cookie.
router.get(
  '/me',
  asyncHandler(async (req, res) => {
    if (!supabaseConfigured || !supabase) {
      return res.status(503).json(errorResponse('Supabase not configured'));
    }
    // Restrict debug endpoint in production unless explicitly allowed
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_ADMIN_DEBUG !== '1') {
      return res.status(403).json(errorResponse('Admin debug endpoint disabled in production'));
    }

    // First try Authorization header (Bearer token)
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    let token = null;
    if (authHeader) {
      const parts = String(authHeader).split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') token = parts[1];
    }

    // Fallback: attempt to parse cookies for a session
    if (!token) {
      const cookieHeader = req.headers['cookie'] || req.headers['Cookie'] || '';
      const cookies = {};
      cookieHeader.split(';').forEach((c) => {
        const idx = c.indexOf('=');
        if (idx > -1) {
          const key = c.slice(0, idx).trim();
          const val = c.slice(idx + 1).trim();
          cookies[key] = decodeURIComponent(val);
        }
      });

      const possibleKeys = [
        AUTH_COOKIE_NAMES.accessToken,
        'sb:token',
        'sb-token',
        'sb_session',
        'sb_access_token',
        'sb-access-token',
        'supabase-auth-token',
        'supabase-session',
        'supabase-token',
        'sb:token-0',
      ];

      for (const k of possibleKeys) {
        if (cookies[k]) {
          const val = cookies[k];
          if (val.startsWith('{') || val.startsWith('%7B')) {
            try {
              const parsed = JSON.parse(decodeURIComponent(val));
              if (parsed && parsed.access_token) {
                token = parsed.access_token;
                break;
              }
              if (parsed && parsed.currentSession && parsed.currentSession.access_token) {
                token = parsed.currentSession.access_token;
                break;
              }
            } catch (e) {
              // ignore
            }
          }
          if (!token && val && val.length > 20) {
            token = val;
            break;
          }
        }
      }
    }

    if (!token) {
      return res.status(401).json(errorResponse('Missing session token (Authorization or cookie)'));
    }

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData || !userData.user) {
      return res.status(401).json(errorResponse('Invalid token or unable to fetch user from token'));
    }
    const userId = userData.user.id;

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, username, email, role, balance')
      .eq('id', userId)
      .single();
    if (profileError) {
      return res.status(500).json(errorResponse('PROFILE_FETCH_FAILED', profileError.message || profileError));
    }
    return res.json(successResponse({ profile }));
  })
);

// POST /api/admin/test-provider - Test provider API connection (DaoSMM Format)
router.post(
  '/test-provider',
  validateRequest(schemas.testProviderSchema),
  asyncHandler(async (req, res) => {
    console.log('[test-provider] Request received:', req.body);
    
    try {
      const { api_url, api_key, api_secret } = req.validatedBody || req.body;

      // manual fallback validation (schema should catch missing fields)
      if (!api_url || !api_key) {
        console.log('[test-provider] Missing fields');
        return res.status(400).json(errorResponse('MISSING_FIELDS', 'Missing required fields: api_url, api_key'));
      }

    console.log('[test-provider] Building test URL:', api_url);

    // Build test URL for DaoSMM (balance check)
    let testUrl;
    try {
      testUrl = new URL(api_url);
    } catch (e) {
      console.log('[test-provider] Invalid URL:', api_url, e.message);
      return res.status(400).json({
        success: false,
        message: 'Invalid API URL format'
      });
    }

    // DaoSMM API Format: action=balance&key=API_KEY
    testUrl.searchParams.append('action', 'balance');
    testUrl.searchParams.append('key', api_key);
    
    if (api_secret) {
      testUrl.searchParams.append('secret', api_secret);
    }

    console.log('[test-provider] Making fetch request to:', testUrl.toString());

    // Create abort controller for timeout (8 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(testUrl.toString(), {
        method: 'POST',  // DaoSMM uses POST
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log('[test-provider] Response status:', response.status);

      if (!response.ok) {
        console.log('[test-provider] Response not OK');
        const errorText = await response.text();
        console.log('[test-provider] Error response:', errorText);
        return res.status(200).json(errorResponse(
          'PROVIDER_API_ERROR',
          `Provider API returned status ${response.status}`,
          { balance: 0, raw_error: errorText }
        ));
      }

      const data = await response.json();
      console.log('[test-provider] Response data:', data);

      // Extract balance - DaoSMM returns "balance" field
      let balance = 0;
      if (data.balance) {
        balance = parseFloat(data.balance);
      } else if (data.Balance) {
        balance = parseFloat(data.Balance);
      } else if (typeof data === 'string' || typeof data === 'number') {
        balance = parseFloat(data);
      }

      console.log('[test-provider] Extracted balance:', balance);

      return res.json(successResponse({
        balance: isNaN(balance) ? 0 : balance,
        status: 'active',
        message: 'Connection successful',
        raw_response: data
      }));
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      console.log('[test-provider] Fetch error:', fetchError.name, fetchError.message);

      if (fetchError.name === 'AbortError') {
        return res.status(200).json(errorResponse(
          'PROVIDER_TIMEOUT',
          'Provider API connection timeout (8s)',
          { balance: 0 }
        ));
      }

      return res.status(200).json(errorResponse(
        'PROVIDER_FETCH_FAILED',
        fetchError.message || 'Failed to connect to provider API',
        { balance: 0 }
      ));
    }
  } catch (error) {
    console.error('[test-provider] Outer catch error:', error);
    return res.status(500).json(errorResponse('INTERNAL_ERROR', error.message || 'Internal server error', { balance: 0 }));
  }
});

// POST /api/admin/sync-provider-services - Sync services from provider
router.post(
  '/sync-provider-services',
  validateRequest(schemas.syncProviderServicesSchema),
  asyncHandler(async (req, res) => {
    console.log('[sync-services] Request received:', req.validatedBody || req.body);
  
  try {
    if (!supabaseAdminConfigured || !supabaseAdmin) {
      return res.status(503).json(errorResponse('NO_SERVICE_KEY', 'SUPABASE_SERVICE_ROLE_KEY is missing on the server.'));
    }

    const { provider_id, markup_percent } = req.validatedBody || req.body;
    const markupPercent = toNumber(markup_percent, 0);

    if (!provider_id) {
      return res.status(400).json(errorResponse('MISSING_PROVIDER', 'Missing provider_id'));
    }

    // Get provider details
    const { data: provider, error: providerError } = await supabaseAdmin
      .from('providers')
      .select('id, api_url, api_key, api_secret, markup_percentage')
      .eq('id', provider_id)
      .single();

    if (providerError || !provider) {
      if (providerError) {
        const serverError = getSupabaseServerError(providerError, 'Provider lookup failed');
        return res.status(serverError.status).json(errorResponse('PROVIDER_LOOKUP_FAILED', serverError.message));
      }
      return res.status(404).json(errorResponse('PROVIDER_NOT_FOUND', 'Provider not found'));
    }

    console.log('[sync-services] Provider found:', provider.id);

    // Call DaoSMM API to get services
    let servicesUrl;
    try {
      servicesUrl = new URL(provider.api_url);
    } catch (e) {
      return res.status(400).json(errorResponse('INVALID_PROVIDER_URL', 'Invalid provider API URL'));
    }

    servicesUrl.searchParams.append('action', 'services');
    servicesUrl.searchParams.append('key', provider.api_key);
    if (provider.api_secret) {
      servicesUrl.searchParams.append('secret', provider.api_secret);
    }

    console.log('[sync-services] Fetching from:', servicesUrl.toString());

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(servicesUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('[sync-services] API Error:', errorText);
      return res.status(200).json({
        success: false,
        message: `Provider returned status ${response.status}`,
        count: 0
      });
    }

    const servicesData = await response.json();
    console.log('[sync-services] Services received:', servicesData.length || 0, 'services');

    // Validate services array
    let services = [];
    if (Array.isArray(servicesData)) {
      services = servicesData;
    } else if (servicesData.services && Array.isArray(servicesData.services)) {
      services = servicesData.services;
    }

    if (!Array.isArray(services) || services.length === 0) {
      return res.status(200).json({
        success: false,
        message: 'No services returned from provider',
        count: 0
      });
    }

    let clampedRateCount = 0;
    let clampedQuantityCount = 0;

    const normalizedServices = services.map((svc, index) => {
      const providerServiceId = pickFirst(svc.service, svc.id, `unknown_${index}`);
      const rawServiceName = pickFirst(
        svc.name,
        svc.service_name,
        svc.title,
        `Service #${providerServiceId}`
      );
      const rawCategory = pickFirst(svc.category, svc.group, svc.service_type, 'Other');
      const rawProviderRate = toNumber(pickFirst(svc.rate, svc.price), 0);
      const rawMinQuantity = toInteger(pickFirst(svc.min, svc.min_quantity), 1);
      const rawMaxQuantity = toInteger(pickFirst(svc.max, svc.max_quantity), 10000);
      const providerRate = clampDecimal10_2(rawProviderRate, 0);
      const ourRate = clampDecimal10_2(providerRate * (1 + markupPercent / 100), providerRate);
      const minQuantity = clampQuantity(rawMinQuantity, 1);
      const maxQuantity = clampQuantity(rawMaxQuantity, Math.max(minQuantity, 10000));

      if (providerRate !== rawProviderRate || ourRate !== rawProviderRate * (1 + markupPercent / 100)) {
        clampedRateCount += 1;
      }

      if (minQuantity !== rawMinQuantity || maxQuantity !== rawMaxQuantity) {
        clampedQuantityCount += 1;
      }

      return {
        providerServiceId,
        serviceName: limitText(rawServiceName, 180),
        category: limitText(rawCategory, 80),
        providerRate,
        ourRate,
        minQuantity,
        maxQuantity: Math.max(maxQuantity, minQuantity),
      };
    });

    if (clampedRateCount || clampedQuantityCount) {
      console.warn('[sync-services] Clamped provider values to fit database schema:', {
        clampedRateCount,
        clampedQuantityCount,
      });
    }

    // Upsert platform services first so provider_services can reference service_id
    const serviceUpserts = normalizedServices.map((item) => ({
      name: item.serviceName,
      category: item.category,
      description: `Provider ID: ${provider_id} | Provider Service ID: ${item.providerServiceId} | Provider Rate: ${item.providerRate} | Min: ${item.minQuantity} | Max: ${item.maxQuantity}`,
      rate_per_1000: item.ourRate,
      min_quantity: item.minQuantity,
      max_quantity: item.maxQuantity,
      status: 'active',
    }));

    let serviceIdByName = new Map();

    const { data: upsertedServices, error: upsertServicesError } = await supabaseAdmin
      .from('services')
      .upsert(serviceUpserts, { onConflict: 'name' })
      .select('id, name');

    if (!upsertServicesError) {
      (upsertedServices || []).forEach((service) => {
        serviceIdByName.set(service.name, service.id);
      });
    } else {
      // Fallback for databases where services.name unique constraint is not yet applied.
      console.warn('[sync-services] Service upsert failed, using row-by-row fallback:', upsertServicesError.message);
      for (const row of serviceUpserts) {
        const { data: existingService } = await supabaseAdmin
          .from('services')
          .select('id')
          .eq('name', row.name)
          .maybeSingle();

        if (existingService?.id) {
          await supabaseAdmin
            .from('services')
            .update({
              category: row.category,
              description: row.description,
              rate_per_1000: row.rate_per_1000,
              min_quantity: row.min_quantity,
              max_quantity: row.max_quantity,
              status: row.status,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingService.id);
          serviceIdByName.set(row.name, existingService.id);
        } else {
          const { data: createdService, error: createServiceError } = await supabaseAdmin
            .from('services')
            .insert(row)
            .select('id, name')
            .single();
          if (createServiceError || !createdService) {
            return res.status(500).json({
              success: false,
              message: 'Failed to create system service during sync',
              error: createServiceError?.message || 'Unknown service insert error',
            });
          }
          serviceIdByName.set(createdService.name, createdService.id);
        }
      }
    }

    // Re-read service IDs by name from DB for reliability, independent of upsert response shape.
    const uniqueNames = Array.from(new Set(normalizedServices.map((item) => item.serviceName)));
    const { data: dbServices, error: dbServicesError } = await supabaseAdmin
      .from('services')
      .select('id, name')
      .in('name', uniqueNames);

    if (dbServicesError) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch synced services from database',
        error: dbServicesError.message,
      });
    }

    (dbServices || []).forEach((service) => {
      serviceIdByName.set(service.name, service.id);
    });

    const providerMappings = normalizedServices
      .map((item) => {
        const serviceId = serviceIdByName.get(item.serviceName);
        if (!serviceId) return null;
        return {
          provider_id: provider_id,
          service_id: serviceId,
          provider_service_id: item.providerServiceId,
          provider_rate: item.providerRate,
          our_rate: item.ourRate,
          min_quantity: item.minQuantity,
          max_quantity: item.maxQuantity,
          status: 'active',
        };
      })
      .filter(Boolean);

    const uniqueMappingMap = new Map();
    providerMappings.forEach((item) => {
      const uniqueKey = `${item.provider_id}|${item.provider_service_id}`;
      if (!uniqueMappingMap.has(uniqueKey)) {
        uniqueMappingMap.set(uniqueKey, item);
      }
    });
    const dedupedMappings = Array.from(uniqueMappingMap.values());

    const { error: deleteError } = await supabaseAdmin
      .from('provider_services')
      .delete()
      .eq('provider_id', provider_id);
    if (deleteError) {
      console.warn('[sync-services] Failed to clear old mappings:', deleteError);
    }

    if (dedupedMappings.length === 0) {
      return res.status(200).json({
        success: false,
        count: 0,
        synced_count: 0,
        message: 'Provider returned services, but no valid mappings were created.',
      });
    }

    const { error: insertMappingsError } = await supabaseAdmin
      .from('provider_services')
      .insert(dedupedMappings);

    if (insertMappingsError) {
      console.error('[sync-services] Failed to insert provider mappings:', insertMappingsError);
      return res.status(500).json({
        success: false,
        message: 'Failed to save provider mappings',
        error: insertMappingsError.message,
      });
    }

    await supabaseAdmin
      .from('providers')
      .update({ last_sync: new Date().toISOString() })
      .eq('id', provider_id);

    console.log('[sync-services] Successfully synced', dedupedMappings.length, 'services');

    return res.status(200).json({
      success: true,
      count: dedupedMappings.length,
      synced_count: dedupedMappings.length,
      message: `Synced ${dedupedMappings.length} services from provider with ${markupPercent}% markup`,
      services: dedupedMappings,
    });
  } catch (error) {
    console.error('[sync-services] Error:', error);
    const serverError = getSupabaseServerError(error);
    return res.status(serverError.status).json({
      success: false,
      message: serverError.message,
    });
  }
});

// GET /api/admin/provider-services - list provider services with provider + system service details
router.get(
  '/provider-services',
  validateQuery(schemas.providerServicesQuerySchema),
  asyncHandler(async (req, res) => {
  try {
    if (!supabaseAdminConfigured || !supabaseAdmin) {
      return res.status(503).json(errorResponse('NO_SERVICE_KEY', 'SUPABASE_SERVICE_ROLE_KEY is missing on the server.'));
    }

    const { provider_id, category, status } = req.validatedQuery || req.query;

    // Auto-repair old mappings that were saved without service_id
    const orphanQuery = supabaseAdmin
      .from('provider_services')
      .select('id, provider_service_id')
      .is('service_id', null)
      .limit(5000);
    if (provider_id) {
      orphanQuery.eq('provider_id', provider_id);
    }
    const { data: orphanMappings } = await orphanQuery;

    if (orphanMappings && orphanMappings.length > 0) {
      const { data: systemServices } = await supabaseAdmin
        .from('services')
        .select('id, description')
        .limit(10000);

      const serviceIdByProviderServiceId = new Map();
      (systemServices || []).forEach((service) => {
        const description = String(service.description || '');
        const match = description.match(/Provider Service ID:\s*([^|]+)/i);
        if (!match) return;
        const providerServiceId = String(match[1]).trim();
        if (!providerServiceId) return;
        if (!serviceIdByProviderServiceId.has(providerServiceId)) {
          serviceIdByProviderServiceId.set(providerServiceId, service.id);
        }
      });

      for (const orphan of orphanMappings) {
        const linkedServiceId = serviceIdByProviderServiceId.get(String(orphan.provider_service_id || '').trim());
        if (!linkedServiceId) continue;
        await supabaseAdmin
          .from('provider_services')
          .update({ service_id: linkedServiceId, updated_at: new Date().toISOString() })
          .eq('id', orphan.id);
      }
    }

    let query = supabaseAdmin
      .from('provider_services')
      .select(`
        id,
        provider_id,
        service_id,
        provider_service_id,
        provider_rate,
        our_rate,
        min_quantity,
        max_quantity,
        status,
        updated_at,
        providers:provider_id ( id, name )
      `)
      .order('updated_at', { ascending: false })
      .limit(3000);

    if (provider_id) {
      query = query.eq('provider_id', provider_id);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[provider-services] list error:', error);
      const serverError = getSupabaseServerError(error, 'Failed to load provider services');
      return res.status(serverError.status).json(errorResponse('LOAD_PROVIDER_SERVICES_FAILED', serverError.message));
    }

    const normalizedRows = (data || []).map((row) => ({
      ...row,
      providers: getEmbeddedObject(row.providers),
    }));

    const serviceIds = Array.from(
      new Set(
        normalizedRows
          .map((row) => String(row.service_id || '').trim())
          .filter((value) => value !== '')
      )
    );

    let serviceById = new Map();
    if (serviceIds.length > 0) {
      const { data: servicesData } = await supabaseAdmin
        .from('services')
        .select('id, name, category, status')
        .in('id', serviceIds);
      (servicesData || []).forEach((service) => {
        serviceById.set(String(service.id), service);
      });
    }

    const mergedRows = normalizedRows.map((row) => ({
      ...row,
      services: row.service_id ? (serviceById.get(String(row.service_id).trim()) || null) : null,
    }));

    // Fallback mapping when service_id is broken/legacy by reading provider service id from service descriptions.
    const unresolvedRows = mergedRows.filter((row) => !row.services);
    if (unresolvedRows.length > 0) {
      const { data: allServicesForFallback } = await supabaseAdmin
        .from('services')
        .select('id, name, category, status, description')
        .limit(20000);

      const fallbackByProviderServiceId = new Map();
      (allServicesForFallback || []).forEach((service) => {
        const description = String(service.description || '');
        const match = description.match(/Provider Service ID:\s*([^|]+)/i);
        if (!match) return;
        const providerServiceId = String(match[1]).trim();
        if (!providerServiceId || fallbackByProviderServiceId.has(providerServiceId)) return;
        fallbackByProviderServiceId.set(providerServiceId, service);
      });

      unresolvedRows.forEach((row) => {
        const fallbackService = fallbackByProviderServiceId.get(String(row.provider_service_id || '').trim());
        if (!fallbackService) return;
        row.services = fallbackService;
      });
    }

    const filtered = category
      ? mergedRows.filter((row) => row?.services?.category === category)
      : mergedRows;

    return res.json(successResponse({ services: filtered }));
  } catch (error) {
    console.error('[provider-services] unexpected error:', error);
    const serverError = getSupabaseServerError(error);
    return res.status(serverError.status).json(errorResponse('UNEXPECTED_PROVIDER_SERVICES_ERROR', serverError.message));
  }
});

// PATCH /api/admin/provider-services/:id - update provider mapping fields
router.patch('/provider-services/:id', asyncHandler(async (req, res) => {
  try {
    if (!supabaseAdminConfigured || !supabaseAdmin) {
      return res.status(503).json({
        success: false,
        message: 'SUPABASE_SERVICE_ROLE_KEY is missing on the server.',
      });
    }

    const { id } = req.params;
    const {
      provider_rate,
      our_rate,
      min_quantity,
      max_quantity,
      status,
      service_name,
      service_category,
      service_status,
    } = req.body || {};

    const mappingUpdates = {};
    if (provider_rate !== undefined) mappingUpdates.provider_rate = toNumber(provider_rate, 0);
    if (our_rate !== undefined) mappingUpdates.our_rate = toNumber(our_rate, 0);
    if (min_quantity !== undefined) mappingUpdates.min_quantity = toInteger(min_quantity, 1);
    if (max_quantity !== undefined) mappingUpdates.max_quantity = toInteger(max_quantity, 1);
    if (status !== undefined) mappingUpdates.status = String(status);
    mappingUpdates.updated_at = new Date().toISOString();

    const { data: updatedMapping, error: mappingError } = await supabaseAdmin
      .from('provider_services')
      .update(mappingUpdates)
      .eq('id', id)
      .select('id, service_id')
      .single();

    if (mappingError || !updatedMapping) {
      if (mappingError) {
        const serverError = getSupabaseServerError(mappingError, 'Failed to update provider mapping');
        return res.status(serverError.status).json({
          success: false,
          message: serverError.message,
        });
      }
      return res.status(500).json({
        success: false,
        message: mappingError?.message || 'Failed to update provider mapping',
      });
    }

    if (
      service_name !== undefined ||
      service_category !== undefined ||
      service_status !== undefined ||
      min_quantity !== undefined ||
      max_quantity !== undefined ||
      our_rate !== undefined
    ) {
      const serviceUpdates = {};
      if (service_name !== undefined) serviceUpdates.name = String(service_name).trim();
      if (service_category !== undefined) serviceUpdates.category = String(service_category).trim();
      if (service_status !== undefined) serviceUpdates.status = String(service_status);
      if (min_quantity !== undefined) serviceUpdates.min_quantity = toInteger(min_quantity, 1);
      if (max_quantity !== undefined) serviceUpdates.max_quantity = toInteger(max_quantity, 1);
      if (our_rate !== undefined) serviceUpdates.rate_per_1000 = toNumber(our_rate, 0);
      serviceUpdates.updated_at = new Date().toISOString();

      const { error: serviceError } = await supabaseAdmin
        .from('services')
        .update(serviceUpdates)
        .eq('id', updatedMapping.service_id);

      if (serviceError) {
        const serverError = getSupabaseServerError(serviceError, 'Mapping updated but service update failed');
        return res.status(serverError.status).json({
          success: false,
          message: serverError.message,
        });
      }
    }

    return res.status(200).json({ success: true, message: 'Provider service updated successfully' });
  } catch (error) {
    console.error('[provider-services] update error:', error);
    const serverError = getSupabaseServerError(error);
    return res.status(serverError.status).json({ success: false, message: serverError.message });
  }
});

router.get('/settings', asyncHandler(async (req, res) => {
  try {
    if (!supabaseAdminConfigured || !supabaseAdmin) {
      return res.status(503).json({ error: 'SUPABASE_SERVICE_ROLE_KEY is missing on the server.' });
    }

    const { data, error } = await supabaseAdmin
      .from('app_settings')
      .select('config')
      .eq('id', 'default')
      .maybeSingle();

    if (error) {
      const message = String(error.message || '').toLowerCase();
      const code = String(error.code || '');
      const missingTable = code === '42P01' || message.includes('app_settings');
      if (missingTable) {
        return res.status(200).json({ settings: null, tableMissing: true });
      }
      return res.status(500).json({ error: error.message || 'Failed to load settings' });
    }

    return res.status(200).json({
      settings: data?.config || null,
      tableMissing: false,
    });
  } catch (error) {
    console.error('[settings] get error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

router.post('/settings', asyncHandler(async (req, res) => {
  try {
    if (!supabaseAdminConfigured || !supabaseAdmin) {
      return res.status(503).json({ error: 'SUPABASE_SERVICE_ROLE_KEY is missing on the server.' });
    }

    const payload = {
      id: 'default',
      config: req.body?.config || {},
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from('app_settings')
      .upsert(payload, { onConflict: 'id' })
      .select('config')
      .single();

    if (error) {
      const message = String(error.message || '').toLowerCase();
      const code = String(error.code || '');
      const missingTable = code === '42P01' || message.includes('app_settings');
      if (missingTable) {
        return res.status(400).json({
          error: 'Settings table is missing. Create public.app_settings before saving.',
          tableMissing: true,
        });
      }
      return res.status(500).json({ error: error.message || 'Failed to save settings' });
    }

    return res.status(200).json({
      settings: data?.config || {},
      tableMissing: false,
    });
  } catch (error) {
    console.error('[settings] save error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

export default router;
