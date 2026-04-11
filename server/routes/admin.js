import express from 'express';
import { z } from 'zod';
import {
  supabase,
  supabaseAdmin,
  supabaseConfigured,
  supabaseAdminConfigured,
} from '../lib/supabaseServer.js';
import { AUTH_COOKIE_NAMES } from '../lib/authCookies.js';
import { successResponse, errorResponse, asyncHandler } from '../lib/apiResponse.js';
import { validateRequest, validateQuery, validateParams, schemas } from '../lib/validation.js';
import { invalidateProviderServicesCache } from './integrations.js';

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

const sanitizeUnicode = (value) => {
  const input = String(value ?? '');
  if (!input) return '';

  // Drop null bytes and lone surrogates (PostgREST can reject invalid unicode in JSON bodies).
  let out = '';
  for (let i = 0; i < input.length; i += 1) {
    const code = input.charCodeAt(i);
    if (code === 0) continue;

    // High surrogate
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = input.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        out += input[i] + input[i + 1];
        i += 1;
      }
      continue;
    }

    // Lone low surrogate
    if (code >= 0xdc00 && code <= 0xdfff) {
      continue;
    }

    out += input[i];
  }

  return out.trim();
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

const toBoolean = (value, fallback = false) => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'y'].includes(normalized)) return true;
  if (['false', '0', 'no', 'n'].includes(normalized)) return false;
  return fallback;
};

const normalizeMarginType = (value) => {
  const normalized = String(value || 'percent').trim().toLowerCase();
  return normalized === 'fixed' ? 'fixed' : 'percent';
};

const normalizeMarginRuleInput = (input) => ({
  provider_id: input.provider_id ? String(input.provider_id).trim() : null,
  service_id: input.service_id ? String(input.service_id).trim() : null,
  category: input.category ? String(input.category).trim() : null,
  margin_type: normalizeMarginType(input.margin_type),
  margin_value: clampDecimal10_2(input.margin_value ?? 0, 0),
  min_margin: input.min_margin !== undefined && input.min_margin !== null ? clampDecimal10_2(input.min_margin, 0) : null,
  max_margin: input.max_margin !== undefined && input.max_margin !== null ? clampDecimal10_2(input.max_margin, 0) : null,
  active: toBoolean(input.active, true),
  priority: toInteger(input.priority, 100),
  effective_from: input.effective_from ? new Date(input.effective_from).toISOString() : undefined,
  effective_to: input.effective_to ? new Date(input.effective_to).toISOString() : undefined,
});

const parseCsvText = (text) => {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return [];

  const normalizeCell = (value) => {
    let out = String(value || '').trim();
    if (out.startsWith('"') && out.endsWith('"')) {
      out = out.slice(1, -1);
    }
    return out.trim();
  };

  const header = lines[0]
    .split(',')
    .map((cell) => normalizeCell(cell).toLowerCase());

  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = lines[i].split(',').map(normalizeCell);
    const row = {};
    header.forEach((key, index) => {
      row[key] = cols[index];
    });
    rows.push(row);
  }

  return rows;
};

const isRuleActive = (rule) => {
  if (!rule?.active) return false;
  const now = Date.now();
  const from = rule.effective_from ? new Date(rule.effective_from).getTime() : now;
  const to = rule.effective_to ? new Date(rule.effective_to).getTime() : null;
  return from <= now && (!to || to >= now);
};

const selectBestRule = (rules, serviceId, category, providerId) => {
  const normalizedServiceId = String(serviceId || '').trim();
  const normalizedProviderId = String(providerId || '').trim();
  const normalizedCategory = String(category || '').trim();

  const candidates = (rules || []).filter((rule) => {
    if (!isRuleActive(rule)) return false;
    if (rule.provider_id && normalizedProviderId && String(rule.provider_id) !== normalizedProviderId) return false;
    if (rule.provider_id && !normalizedProviderId) return false;
    if (rule.service_id && normalizedServiceId && String(rule.service_id) !== normalizedServiceId) return false;
    if (rule.category && normalizedCategory && String(rule.category) !== normalizedCategory) return false;
    if (rule.service_id && !normalizedServiceId) return false;
    if (rule.category && !normalizedCategory) return false;
    return true;
  });

  if (candidates.length === 0) return null;

  const scoreRule = (rule) => {
    const scopeRank = rule.service_id ? 1 : rule.category ? 2 : rule.provider_id ? 3 : 4;
    return [scopeRank, Number(rule.priority || 100)];
  };

  return candidates.sort((a, b) => {
    const [aScope, aPriority] = scoreRule(a);
    const [bScope, bPriority] = scoreRule(b);
    if (aScope !== bScope) return aScope - bScope;
    if (aPriority !== bPriority) return aPriority - bPriority;
    return new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0);
  })[0];
};

const applyMarginToRate = (providerRate, rule) => {
  const rate = Number(providerRate || 0);
  if (!rule) return rate;

  let marginValue = Number(rule.margin_value || 0);
  if (rule.min_margin !== null && rule.min_margin !== undefined) {
    marginValue = Math.max(marginValue, Number(rule.min_margin));
  }
  if (rule.max_margin !== null && rule.max_margin !== undefined) {
    marginValue = Math.min(marginValue, Number(rule.max_margin));
  }

  if (rule.margin_type === 'fixed') {
    return Number((rate + marginValue).toFixed(4));
  }

  return Number((rate * (1 + marginValue / 100)).toFixed(4));
};

const computeMarginPercent = (providerRate, ourRate) => {
  const base = Number(providerRate || 0);
  const sell = Number(ourRate || 0);
  if (!base) return 0;
  return Number((((sell - base) / base) * 100).toFixed(2));
};

const extractProviderServiceIdFromDescription = (description) => {
  const text = String(description || '');
  const match = text.match(/Provider Service ID:\s*([^|]+)/i);
  return match ? String(match[1]).trim() : '';
};

const recomputeProviderServiceRates = async ({ providerId = null } = {}) => {
  const baseQuery = supabaseAdmin
    .from('provider_services')
    .select('id, provider_id, service_id, provider_rate, our_rate');
  if (providerId) baseQuery.eq('provider_id', providerId);

  const { data: mappings, error } = await baseQuery;
  if (error) throw error;

  if (!mappings || mappings.length === 0) {
    return { updated: 0 };
  }

  const serviceIds = Array.from(new Set(mappings.map((row) => row.service_id).filter(Boolean)));
  const { data: servicesData } = await supabaseAdmin
    .from('services')
    .select('id, category')
    .in('id', serviceIds);

  const categoryByServiceId = new Map(
    (servicesData || []).map((svc) => [String(svc.id), svc.category])
  );

  const rulesQuery = supabaseAdmin.from('provider_margin_rules').select('*');
  if (providerId) rulesQuery.or(`provider_id.eq.${providerId},provider_id.is.null`);
  const { data: rulesData, error: rulesError } = await rulesQuery;
  if (rulesError) throw rulesError;

  const rules = rulesData || [];
  const updates = [];

  mappings.forEach((mapping) => {
    const category = categoryByServiceId.get(String(mapping.service_id || '')) || null;
    const rule = selectBestRule(rules, mapping.service_id, category, mapping.provider_id);
    if (!rule) return;

    const nextRate = applyMarginToRate(mapping.provider_rate, rule);
    if (Number(mapping.our_rate || 0) === nextRate) return;

    updates.push({ id: mapping.id, our_rate: nextRate, updated_at: new Date().toISOString() });
  });

  if (updates.length === 0) return { updated: 0 };

  const CHUNK = 500;
  for (let i = 0; i < updates.length; i += CHUNK) {
    const chunk = updates.slice(i, i + CHUNK);
    const { error: updateError } = await supabaseAdmin
      .from('provider_services')
      .upsert(chunk, { onConflict: 'id', defaultToNull: false });
    if (updateError) throw updateError;
  }

  return { updated: updates.length };
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
  })
);

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
    const { categories, category, replace_existing } = req.body || {};
    const markupPercent = toNumber(markup_percent, 0);
    const shouldReplaceExisting = replace_existing !== undefined ? Boolean(replace_existing) : true;

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

    const rawCategoryFilter = Array.isArray(categories) ? categories : String(category || '')
      .split(',')
      .map((value) => String(value || '').trim())
      .filter(Boolean);
    const normalizedCategoryFilter = rawCategoryFilter.map((value) => value.toLowerCase());

    if (normalizedCategoryFilter.length > 0) {
      services = services.filter((svc) => {
        const svcCategory = sanitizeUnicode(pickFirst(svc.category, svc.group, svc.service_type, ''))
          .toLowerCase();
        if (!svcCategory) return false;
        return normalizedCategoryFilter.some((needle) => svcCategory.includes(needle));
      });
      console.log('[sync-services] Category filter applied:', {
        providerId: provider_id,
        requested: normalizedCategoryFilter,
        remaining: services.length,
      });
    }

    let clampedRateCount = 0;
    let clampedQuantityCount = 0;

    let providerDefaultRule = null;
    try {
      const { data: ruleData } = await supabaseAdmin
        .from('provider_margin_rules')
        .select('margin_type, margin_value, min_margin, max_margin, active')
        .eq('provider_id', provider_id)
        .is('service_id', null)
        .eq('active', true)
        .order('updated_at', { ascending: false })
        .limit(1);
      providerDefaultRule = Array.isArray(ruleData) ? ruleData[0] : ruleData;
    } catch (ruleError) {
      console.warn('[sync-services] Failed to load provider margin rules, falling back to markup_percent.', ruleError);
    }

    const normalizedServices = services.map((svc, index) => {
      const providerServiceId = sanitizeUnicode(pickFirst(svc.service, svc.id, `unknown_${index}`)) || `unknown_${index}`;
      const rawServiceName = sanitizeUnicode(pickFirst(
        svc.name,
        svc.service_name,
        svc.title,
        `Service #${providerServiceId}`
      ));
      const rawCategory = sanitizeUnicode(pickFirst(svc.category, svc.group, svc.service_type, 'Other'));
      const rawDescription = sanitizeUnicode(pickFirst(
        svc.description,
        svc.desc,
        svc.details,
        svc.note,
        svc.notes,
        svc.info,
        ''
      ));
      const rawProviderRate = toNumber(pickFirst(svc.rate, svc.price), 0);
      const rawMinQuantity = toInteger(pickFirst(svc.min, svc.min_quantity), 1);
      const rawMaxQuantity = toInteger(pickFirst(svc.max, svc.max_quantity), 10000);
      const providerRate = clampDecimal10_2(rawProviderRate, 0);
      const effectiveMarkup = providerDefaultRule
        ? applyMarginToRate(providerRate, {
            margin_type: providerDefaultRule.margin_type,
            margin_value: providerDefaultRule.margin_value,
            min_margin: providerDefaultRule.min_margin,
            max_margin: providerDefaultRule.max_margin,
          })
        : providerRate * (1 + markupPercent / 100);
      const ourRate = clampDecimal10_2(effectiveMarkup, providerRate);
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
        // Include provider service id to avoid name collisions (and match typical SMM UI patterns).
        serviceName: limitText(`${providerServiceId} - ${rawServiceName}`, 180),
        category: limitText(rawCategory, 80),
        description: limitText(rawDescription, 8000),
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
      description: [
        String(item.description || '').trim(),
        `Provider ID: ${provider_id} | Provider Service ID: ${item.providerServiceId} | Provider Rate: ${item.providerRate} | Min: ${item.minQuantity} | Max: ${item.maxQuantity}`,
      ].filter(Boolean).join('\n\n'),
      rate_per_1000: item.ourRate,
      min_quantity: item.minQuantity,
      max_quantity: item.maxQuantity,
      status: 'active',
    }));

    let serviceIdByName = new Map();

    // Mark prior synced services for this provider as inactive so old names don't linger.
    if (shouldReplaceExisting) {
      await supabaseAdmin
        .from('services')
        .update({ status: 'inactive', updated_at: new Date().toISOString() })
        .ilike('description', `%Provider ID: ${provider_id}%`);
    }

    // Avoid Postgres "ON CONFLICT DO UPDATE command cannot affect row a second time"
    // by deduping same-name rows inside each upsert batch.
    const serviceUpsertsByName = new Map();
    serviceUpserts.forEach((row) => {
      if (!row?.name) return;
      serviceUpsertsByName.set(row.name, row);
    });
    const dedupedServiceUpserts = Array.from(serviceUpsertsByName.values());

    const SERVICE_UPSERT_CHUNK_SIZE = 250;
    const skippedServiceNames = [];
    const upsertErrorSamples = [];

    const upsertChunk = async (rows) => {
      return await supabaseAdmin
        .from('services')
        .upsert(rows, { onConflict: 'name', defaultToNull: false })
        .select('id, name');
    };

    const captureUpsertError = (error) => {
      if (!error) return;
      if (upsertErrorSamples.length >= 3) return;
      upsertErrorSamples.push({
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
    };

    const isMissingUniqueConstraint = (error) => {
      const msg = String(error?.message || '').toLowerCase();
      return (
        msg.includes('unique or exclusion constraint') ||
        msg.includes('there is no unique') ||
        msg.includes('on conflict') ||
        String(error?.code || '') === '42P10'
      );
    };

    const upsertWithSplit = async (rows) => {
      if (!rows || rows.length === 0) return;

      const { data: upsertedChunk, error } = await upsertChunk(rows);
      if (!error) {
        (upsertedChunk || []).forEach((service) => {
          serviceIdByName.set(service.name, service.id);
        });
        return;
      }

      captureUpsertError(error);

      if (isMissingUniqueConstraint(error)) {
        throw new Error(
          'services.name must be UNIQUE for sync to work. Apply migration `supabase/migrations/add_unique_constraint_services_name.sql` and retry.'
        );
      }

      if (rows.length === 1) {
        const row = rows[0];

        // Retry once with a minimal description (raw provider descriptions sometimes contain invalid unicode).
        const minimalDescription = String(row.description || '')
          .split('\n\n')
          .slice(-1)[0]
          .trim();

        const { data: retried, error: retryError } = await upsertChunk([
          {
            ...row,
            description: minimalDescription || null,
          },
        ]);

        if (!retryError) {
          (retried || []).forEach((service) => {
            serviceIdByName.set(service.name, service.id);
          });
          return;
        }

        captureUpsertError(retryError);
        skippedServiceNames.push({ name: row?.name, error: retryError?.message || String(retryError) });
        return;
      }

      const mid = Math.ceil(rows.length / 2);
      await upsertWithSplit(rows.slice(0, mid));
      await upsertWithSplit(rows.slice(mid));
    };

    try {
      for (let i = 0; i < dedupedServiceUpserts.length; i += SERVICE_UPSERT_CHUNK_SIZE) {
        const chunk = dedupedServiceUpserts.slice(i, i + SERVICE_UPSERT_CHUNK_SIZE);
        await upsertWithSplit(chunk);
      }
    } catch (upsertError) {
      console.error('[sync-services] Service upsert failed:', upsertError);
      return res.status(500).json({
        success: false,
        message: upsertError?.message || 'Failed to upsert services during sync',
        error_samples: upsertErrorSamples,
      });
    }

    if (skippedServiceNames.length > 0) {
      console.warn('[sync-services] Skipped services during upsert:', {
        skippedCount: skippedServiceNames.length,
        sample: skippedServiceNames.slice(0, 5),
      });
    }

    // Ensure we can resolve ids for every upserted name. PostgREST can occasionally omit rows from the
    // upsert response when nothing changed, so we backfill via a follow-up query.
    const skippedNameSet = new Set(skippedServiceNames.map((row) => String(row?.name || '').trim()).filter(Boolean));
    if (serviceIdByName.size < dedupedServiceUpserts.length - skippedNameSet.size) {
      const missingNames = dedupedServiceUpserts
        .map((row) => String(row?.name || '').trim())
        .filter((name) => name && !skippedNameSet.has(name) && !serviceIdByName.has(name));

      const NAME_LOOKUP_CHUNK_SIZE = 500;
      for (let i = 0; i < missingNames.length; i += NAME_LOOKUP_CHUNK_SIZE) {
        const chunk = missingNames.slice(i, i + NAME_LOOKUP_CHUNK_SIZE);
        const { data: found } = await supabaseAdmin
          .from('services')
          .select('id, name')
          .in('name', chunk);

        (found || []).forEach((service) => {
          serviceIdByName.set(service.name, service.id);
        });
      }

      if (serviceIdByName.size < dedupedServiceUpserts.length - skippedNameSet.size) {
        console.warn('[sync-services] Some upserted services could not be resolved by name.', {
          expected: dedupedServiceUpserts.length - skippedNameSet.size,
          resolved: serviceIdByName.size,
        });
      }
    }

    const providerMappings = normalizedServices
      .map((item) => {
        const serviceId = serviceIdByName.get(item.serviceName);
        if (!serviceId) return null;
        
        // Ensure numeric values are properly typed
        const providerRate = parseFloat(item.providerRate) || 0;
        const ourRate = parseFloat(item.ourRate) || 0;
        const minQty = parseInt(item.minQuantity) || 1;
        const maxQty = parseInt(item.maxQuantity) || 10000;
        
        return {
          provider_id: provider_id,
          service_id: serviceId,
          provider_service_id: String(item.providerServiceId),
          provider_rate: providerRate,
          our_rate: ourRate,
          min_quantity: minQty,
          max_quantity: maxQty,
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

    // Validate mappings before inserting
    const invalidMappings = dedupedMappings.filter(m => 
      !m.provider_id || !m.service_id || !m.provider_service_id || 
      typeof m.provider_rate !== 'number' || typeof m.our_rate !== 'number'
    );
    
    if (invalidMappings.length > 0) {
      console.error('[sync-services] Found invalid mappings:', invalidMappings);
      return res.status(400).json({
        success: false,
        message: 'Invalid provider service mappings detected',
        invalid_count: invalidMappings.length,
      });
    }

    // Always delete old mappings before syncing new ones to avoid UNIQUE constraint violations
    console.log('[sync-services] Deleting old provider mappings for provider:', provider_id);
    const { error: deleteError, data: deleteData } = await supabaseAdmin
      .from('provider_services')
      .delete()
      .eq('provider_id', provider_id);
    
    if (deleteError) {
      console.error('[sync-services] Delete error:', deleteError);
      // Continue anyway, we'll catch the constraint violation on insert
    } else {
      console.log('[sync-services] Successfully deleted old mappings, deleted count:', deleteData?.length || 0);
    }
    
    // Add a small delay to ensure deletion completes
    await new Promise(resolve => setTimeout(resolve, 100));

    if (dedupedMappings.length === 0) {
      return res.status(200).json({
        success: false,
        count: 0,
        synced_count: 0,
        message: 'Provider returned services, but no valid mappings were created.',
        skipped_services: skippedServiceNames.length,
      });
    }

    const PROVIDER_MAPPING_CHUNK_SIZE = 1000;
    const upsertedCount = 0;
    
    for (let i = 0; i < dedupedMappings.length; i += PROVIDER_MAPPING_CHUNK_SIZE) {
      const chunk = dedupedMappings.slice(i, i + PROVIDER_MAPPING_CHUNK_SIZE);
      
      try {
        // Use upsert to handle duplicate keys (update existing, insert new)
        const { data, error: upsertError } = await supabaseAdmin
          .from('provider_services')
          .upsert(chunk, { 
            onConflict: 'provider_id,provider_service_id',
            ignoreDuplicates: false
          });

        if (upsertError) {
          console.error('[sync-services] Failed to upsert provider mappings:', {
            error: upsertError,
            chunk_size: chunk.length,
            first_item: chunk[0],
            full_error: JSON.stringify(upsertError)
          });
          return res.status(500).json({
            success: false,
            message: 'Failed to save provider mappings',
            error: upsertError.message,
            details: upsertError.details || upsertError.hint,
          });
        }
      } catch (chunkError) {
        console.error('[sync-services] Chunk upsert exception:', chunkError);
        return res.status(500).json({
          success: false,
          message: 'Failed to save provider mappings',
          error: chunkError.message,
        });
      }
    }

    await supabaseAdmin
      .from('providers')
      .update({ last_sync: new Date().toISOString() })
      .eq('id', provider_id);

    console.log('[sync-services] Successfully synced', dedupedMappings.length, 'services');

    invalidateProviderServicesCache();
    return res.status(200).json({
      success: true,
      count: dedupedMappings.length,
      synced_count: dedupedMappings.length,
      skipped_services: skippedServiceNames.length,
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
  })
);

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
  })
);

// PATCH /api/admin/provider-services/:id - update provider mapping fields
router.patch(
  '/provider-services/:id',
  validateParams(z.object({ id: z.string().uuid('Invalid provider-service ID') })),
  asyncHandler(async (req, res) => {
    try {
      if (!supabaseAdminConfigured || !supabaseAdmin) {
        return res.status(503).json(errorResponse('NO_SERVICE_KEY', 'SUPABASE_SERVICE_ROLE_KEY is missing on the server.'));
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
        return res.status(serverError.status).json(errorResponse('UPDATE_MAPPING_FAILED', serverError.message));
      }
      return res.status(500).json(errorResponse('UPDATE_MAPPING_FAILED', mappingError?.message || 'Failed to update provider mapping'));
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
        return res.status(serverError.status).json(errorResponse('SERVICE_UPDATE_FAILED', serverError.message));
      }
    }

    return res.json(successResponse({ message: 'Provider service updated successfully' }));
  } catch (error) {
    console.error('[provider-services] update error:', error);
    const serverError = getSupabaseServerError(error);
    return res.status(serverError.status).json(errorResponse('UNEXPECTED_UPDATE_ERROR', serverError.message));
  }
  })
);

// POST /api/admin/provider-services/filter-categories
// Keep only selected categories for a provider, delete the rest
router.post('/provider-services/filter-categories', async (req, res) => {
  try {
    if (!supabaseAdminConfigured || !supabaseAdmin) {
      return res.status(503).json({
        success: false,
        message: 'SUPABASE_SERVICE_ROLE_KEY is missing on the server.',
      });
    }

    const { provider_id, categories, category, replace_existing } = req.body || {};
    if (!provider_id) {
      return res.status(400).json({ success: false, message: 'Missing provider_id' });
    }

    const rawCategoryFilter = Array.isArray(categories) ? categories : String(category || '')
      .split(',')
      .map((value) => String(value || '').trim())
      .filter(Boolean);
    const normalizedCategoryFilter = rawCategoryFilter.map((value) => value.toLowerCase());
    if (normalizedCategoryFilter.length === 0) {
      return res.status(400).json({ success: false, message: 'Provide at least one category to keep.' });
    }

    const { data: providerServices, error: providerServicesError } = await supabaseAdmin
      .from('provider_services')
      .select('id, provider_id, service_id, provider_service_id')
      .eq('provider_id', provider_id);

    if (providerServicesError) {
      const serverError = getSupabaseServerError(providerServicesError, 'Failed to load provider services');
      return res.status(serverError.status).json({ success: false, message: serverError.message });
    }

    if (!providerServices || providerServices.length === 0) {
      return res.status(200).json({ success: true, removed: 0, kept: 0, message: 'No provider services found.' });
    }

    const serviceIds = Array.from(new Set(providerServices.map((row) => row.service_id).filter(Boolean)));
    if (serviceIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Provider services are not linked to catalog services yet. Sync services first.',
      });
    }

    const { data: servicesData, error: servicesError } = await supabaseAdmin
      .from('services')
      .select('id, category, description')
      .in('id', serviceIds);

    if (servicesError) {
      const serverError = getSupabaseServerError(servicesError, 'Failed to load services for category filtering');
      return res.status(serverError.status).json({ success: false, message: serverError.message });
    }

    const serviceById = new Map((servicesData || []).map((svc) => [String(svc.id), svc]));
    const serviceByProviderServiceId = new Map();
    (servicesData || []).forEach((svc) => {
      const providerServiceId = extractProviderServiceIdFromDescription(svc.description);
      if (providerServiceId && !serviceByProviderServiceId.has(providerServiceId)) {
        serviceByProviderServiceId.set(providerServiceId, svc);
      }
    });

    const shouldKeep = (row) => {
      const byId = row.service_id ? serviceById.get(String(row.service_id)) : null;
      const byProviderServiceId = serviceByProviderServiceId.get(String(row.provider_service_id || '').trim()) || null;
      const categoryValue = String(byId?.category || byProviderServiceId?.category || '').toLowerCase();
      if (!categoryValue) return false;
      return normalizedCategoryFilter.some((needle) => categoryValue.includes(needle));
    };

    const toRemove = (providerServices || []).filter((row) => !shouldKeep(row));
    const toKeep = (providerServices || []).filter((row) => shouldKeep(row));

    if (toRemove.length === 0) {
      return res.status(200).json({ success: true, removed: 0, kept: toKeep.length });
    }

    const removeIds = toRemove.map((row) => row.id);
    const { error: deleteError } = await supabaseAdmin
      .from('provider_services')
      .delete()
      .in('id', removeIds);

    if (deleteError) {
      const serverError = getSupabaseServerError(deleteError, 'Failed to delete provider services');
      return res.status(serverError.status).json({ success: false, message: serverError.message });
    }

    const serviceIdsToDisable = Array.from(
      new Set(toRemove.map((row) => row.service_id).filter(Boolean))
    );
    if (serviceIdsToDisable.length > 0 && replace_existing !== false) {
      await supabaseAdmin
        .from('services')
        .update({ status: 'inactive', updated_at: new Date().toISOString() })
        .in('id', serviceIdsToDisable);
    }

    invalidateProviderServicesCache();
    return res.status(200).json({ success: true, removed: toRemove.length, kept: toKeep.length });
  } catch (error) {
    const serverError = getSupabaseServerError(error, 'Failed to filter provider services');
    return res.status(serverError.status).json({ success: false, message: serverError.message });
  }
});

router.get('/settings', async (req, res) => {
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
    return res.status(500).json(errorResponse('SETTINGS_FETCH_ERROR', error.message || 'Internal server error'));
  }
});

router.post('/settings', asyncHandler(async (req, res) => {
  try {
    if (!supabaseAdminConfigured || !supabaseAdmin) {
      return res.status(503).json(errorResponse('NO_SERVICE_KEY', 'SUPABASE_SERVICE_ROLE_KEY is missing on the server.'));
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
        return res.status(400).json(errorResponse('SETTINGS_TABLE_MISSING', 'Settings table is missing. Create public.app_settings before saving.', { tableMissing: true }));
      }
      return res.status(500).json(errorResponse('SETTINGS_SAVE_FAILED', error.message || 'Failed to save settings'));
    }

    return res.json(successResponse({ settings: data?.config || {}, tableMissing: false }));
  } catch (error) {
    console.error('[settings] save error:', error);
    return res.status(500).json(errorResponse('SETTINGS_SAVE_ERROR', error.message || 'Internal server error'));
  }
  })
);

// Margin Rules CRUD
router.get('/margin-rules', async (req, res) => {
  try {
    if (!supabaseAdminConfigured || !supabaseAdmin) {
      return res.status(503).json({ error: 'SUPABASE_SERVICE_ROLE_KEY is missing on the server.' });
    }

    const { provider_id, service_id, category, active } = req.query;
    let query = supabaseAdmin
      .from('provider_margin_rules')
      .select('*')
      .order('priority', { ascending: true })
      .order('updated_at', { ascending: false });

    if (provider_id) query = query.eq('provider_id', provider_id);
    if (service_id) query = query.eq('service_id', service_id);
    if (category) query = query.eq('category', category);
    if (active !== undefined) query = query.eq('active', toBoolean(active, true));

    const { data, error } = await query;
    if (error) {
      const serverError = getSupabaseServerError(error, 'Failed to load margin rules');
      return res.status(serverError.status).json({ success: false, message: serverError.message });
    }

    return res.status(200).json({ success: true, rules: data || [] });
  } catch (error) {
    const serverError = getSupabaseServerError(error);
    return res.status(serverError.status).json({ success: false, message: serverError.message });
  }
});

router.post('/margin-rules', async (req, res) => {
  try {
    if (!supabaseAdminConfigured || !supabaseAdmin) {
      return res.status(503).json({ error: 'SUPABASE_SERVICE_ROLE_KEY is missing on the server.' });
    }

    const rule = normalizeMarginRuleInput(req.body || {});
    const { data, error } = await supabaseAdmin
      .from('provider_margin_rules')
      .insert({ ...rule, updated_at: new Date().toISOString() })
      .select('*')
      .single();

    if (error) {
      const serverError = getSupabaseServerError(error, 'Failed to create margin rule');
      return res.status(serverError.status).json({ success: false, message: serverError.message });
    }

    return res.status(201).json({ success: true, rule: data });
  } catch (error) {
    const serverError = getSupabaseServerError(error);
    return res.status(serverError.status).json({ success: false, message: serverError.message });
  }
});

router.patch('/margin-rules/:id', async (req, res) => {
  try {
    if (!supabaseAdminConfigured || !supabaseAdmin) {
      return res.status(503).json({ error: 'SUPABASE_SERVICE_ROLE_KEY is missing on the server.' });
    }

    const updates = normalizeMarginRuleInput(req.body || {});
    const { data, error } = await supabaseAdmin
      .from('provider_margin_rules')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (error) {
      const serverError = getSupabaseServerError(error, 'Failed to update margin rule');
      return res.status(serverError.status).json({ success: false, message: serverError.message });
    }

    return res.status(200).json({ success: true, rule: data });
  } catch (error) {
    const serverError = getSupabaseServerError(error);
    return res.status(serverError.status).json({ success: false, message: serverError.message });
  }
});

router.delete('/margin-rules/:id', async (req, res) => {
  try {
    if (!supabaseAdminConfigured || !supabaseAdmin) {
      return res.status(503).json({ error: 'SUPABASE_SERVICE_ROLE_KEY is missing on the server.' });
    }

    const { error } = await supabaseAdmin
      .from('provider_margin_rules')
      .delete()
      .eq('id', req.params.id);

    if (error) {
      const serverError = getSupabaseServerError(error, 'Failed to delete margin rule');
      return res.status(serverError.status).json({ success: false, message: serverError.message });
    }

    return res.status(204).send();
  } catch (error) {
    const serverError = getSupabaseServerError(error);
    return res.status(serverError.status).json({ success: false, message: serverError.message });
  }
});

router.post('/margin-rules/bulk-preview', async (req, res) => {
  try {
    const { csv, rows } = req.body || {};
    const parsedRows = Array.isArray(rows) ? rows : parseCsvText(csv);
    const normalized = parsedRows.map(normalizeMarginRuleInput);

    return res.status(200).json({ success: true, rows: normalized });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message || 'Invalid CSV payload' });
  }
});

router.post('/margin-rules/bulk-apply', async (req, res) => {
  try {
    if (!supabaseAdminConfigured || !supabaseAdmin) {
      return res.status(503).json({ error: 'SUPABASE_SERVICE_ROLE_KEY is missing on the server.' });
    }

    const { csv, rows, provider_id, source, notes } = req.body || {};
    const parsedRows = Array.isArray(rows) ? rows : parseCsvText(csv);
    const normalized = parsedRows.map((row) =>
      normalizeMarginRuleInput({ ...row, provider_id: row.provider_id || provider_id })
    );

    if (normalized.length === 0) {
      return res.status(400).json({ success: false, message: 'No margin rules supplied' });
    }

    const { data: version, error: versionError } = await supabaseAdmin
      .from('provider_margin_versions')
      .insert({
        provider_id: provider_id || null,
        source: source || (csv ? 'csv' : 'manual'),
        notes: notes || null,
      })
      .select('*')
      .single();

    if (versionError || !version) {
      const serverError = getSupabaseServerError(versionError, 'Failed to create margin version');
      return res.status(serverError.status).json({ success: false, message: serverError.message });
    }

    const insertChunks = [];
    const CHUNK = 500;
    for (let i = 0; i < normalized.length; i += CHUNK) {
      insertChunks.push(normalized.slice(i, i + CHUNK));
    }

    for (const chunk of insertChunks) {
      const { error } = await supabaseAdmin
        .from('provider_margin_rules')
        .insert(chunk.map((rule) => ({ ...rule, updated_at: new Date().toISOString() })));
      if (error) {
        const serverError = getSupabaseServerError(error, 'Failed to insert margin rules');
        return res.status(serverError.status).json({ success: false, message: serverError.message });
      }
    }

    const serviceIds = Array.from(
      new Set(
        normalized
          .map((row) => row.service_id)
          .filter((value) => Boolean(value))
      )
    );

    let providerServices = [];
    if (serviceIds.length > 0) {
      let psQuery = supabaseAdmin
        .from('provider_services')
        .select('id, provider_id, service_id, provider_rate, our_rate');
      if (provider_id) psQuery = psQuery.eq('provider_id', provider_id);
      psQuery = psQuery.in('service_id', serviceIds);
      const { data: psData } = await psQuery;
      providerServices = psData || [];
    }

    const versionItems = normalized.map((rule) => {
      const mapping = providerServices.find((ps) =>
        String(ps.service_id || '') === String(rule.service_id || '') &&
        (!rule.provider_id || String(ps.provider_id || '') === String(rule.provider_id))
      );

      return {
        version_id: version.id,
        provider_service_id: '',
        service_id: rule.service_id || null,
        old_margin_type: 'percent',
        old_margin_value: computeMarginPercent(mapping?.provider_rate, mapping?.our_rate) || 0,
        new_margin_type: rule.margin_type,
        new_margin_value: rule.margin_value,
      };
    });

    if (versionItems.length > 0) {
      for (let i = 0; i < versionItems.length; i += CHUNK) {
        const chunk = versionItems.slice(i, i + CHUNK);
        await supabaseAdmin.from('provider_margin_version_items').insert(chunk);
      }
    }

    const recompute = await recomputeProviderServiceRates({ providerId: provider_id || null });

    return res.status(200).json({
      success: true,
      version,
      applied: normalized.length,
      recomputed: recompute.updated,
    });
  } catch (error) {
    const serverError = getSupabaseServerError(error, 'Failed to apply margin rules');
    return res.status(serverError.status).json({ success: false, message: serverError.message });
  }
});

// Provider-wise margin apply/reset (simple mode)
router.post('/provider-margins/apply', async (req, res) => {
  try {
    if (!supabaseAdminConfigured || !supabaseAdmin) {
      return res.status(503).json({ error: 'SUPABASE_SERVICE_ROLE_KEY is missing on the server.' });
    }

    const { provider_id, margin_type, margin_value } = req.body || {};
    if (!provider_id) {
      return res.status(400).json({ success: false, message: 'Missing provider_id' });
    }

    const normalizedType = normalizeMarginType(margin_type);
    const normalizedValue = clampDecimal10_2(margin_value ?? 0, 0);

    await supabaseAdmin
      .from('provider_margin_rules')
      .delete()
      .eq('provider_id', provider_id);

    const { data: mappings, error: mappingsError } = await supabaseAdmin
      .from('provider_services')
      .select('id, provider_id, service_id, provider_rate')
      .eq('provider_id', provider_id);

    if (mappingsError) {
      const serverError = getSupabaseServerError(mappingsError, 'Failed to load provider services');
      return res.status(serverError.status).json({ success: false, message: serverError.message });
    }

    const rules = (mappings || [])
      .filter((row) => row.service_id)
      .map((row) => ({
        provider_id,
        service_id: row.service_id,
        margin_type: normalizedType,
        margin_value: normalizedValue,
        active: true,
        priority: 100,
        updated_at: new Date().toISOString(),
      }));

    // Also store a provider-default rule so newly synced services inherit it.
    const defaultRule = {
      provider_id,
      service_id: null,
      category: null,
      margin_type: normalizedType,
      margin_value: normalizedValue,
      active: true,
      priority: 100,
      updated_at: new Date().toISOString(),
    };

    const allRules = [defaultRule, ...rules];
    if (allRules.length > 0) {
      const CHUNK = 500;
      for (let i = 0; i < allRules.length; i += CHUNK) {
        const chunk = allRules.slice(i, i + CHUNK);
        const { error } = await supabaseAdmin.from('provider_margin_rules').insert(chunk);
        if (error) {
          const serverError = getSupabaseServerError(error, 'Failed to insert provider margin rules');
          return res.status(serverError.status).json({ success: false, message: serverError.message });
        }
      }
    }

    const updates = (mappings || []).map((row) => {
      const providerRate = Number(row.provider_rate || 0);
      const ourRate = normalizedType === 'fixed'
        ? Number((providerRate + normalizedValue).toFixed(4))
        : Number((providerRate * (1 + normalizedValue / 100)).toFixed(4));
      return {
        id: row.id,
        our_rate: ourRate,
        updated_at: new Date().toISOString(),
      };
    });

    const CHUNK_SIZE = 500;
    for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
      const chunk = updates.slice(i, i + CHUNK_SIZE);
      const { error } = await supabaseAdmin
        .from('provider_services')
        .upsert(chunk, { onConflict: 'id', defaultToNull: false });
      if (error) {
        const serverError = getSupabaseServerError(error, 'Failed to update provider rates');
        return res.status(serverError.status).json({ success: false, message: serverError.message });
      }
    }

    invalidateProviderServicesCache();
    return res.status(200).json({
      success: true,
      applied: rules.length,
      recomputed: updates.length,
    });
  } catch (error) {
    const serverError = getSupabaseServerError(error, 'Failed to apply provider margin');
    return res.status(serverError.status).json({ success: false, message: serverError.message });
  }
});

router.post('/provider-margins/reset', async (req, res) => {
  try {
    if (!supabaseAdminConfigured || !supabaseAdmin) {
      return res.status(503).json({ error: 'SUPABASE_SERVICE_ROLE_KEY is missing on the server.' });
    }

    const { provider_id } = req.body || {};
    if (!provider_id) {
      return res.status(400).json({ success: false, message: 'Missing provider_id' });
    }

    await supabaseAdmin
      .from('provider_margin_rules')
      .delete()
      .eq('provider_id', provider_id);

    const { data: mappings, error: mappingsError } = await supabaseAdmin
      .from('provider_services')
      .select('id, provider_rate')
      .eq('provider_id', provider_id);

    if (mappingsError) {
      const serverError = getSupabaseServerError(mappingsError, 'Failed to load provider services');
      return res.status(serverError.status).json({ success: false, message: serverError.message });
    }

    const updates = (mappings || []).map((row) => ({
      id: row.id,
      our_rate: Number(row.provider_rate || 0),
      updated_at: new Date().toISOString(),
    }));

    const CHUNK = 500;
    for (let i = 0; i < updates.length; i += CHUNK) {
      const chunk = updates.slice(i, i + CHUNK);
      const { error } = await supabaseAdmin
        .from('provider_services')
        .upsert(chunk, { onConflict: 'id', defaultToNull: false });
      if (error) {
        const serverError = getSupabaseServerError(error, 'Failed to reset provider rates');
        return res.status(serverError.status).json({ success: false, message: serverError.message });
      }
    }

    invalidateProviderServicesCache();
    return res.status(200).json({ success: true, reset: updates.length });
  } catch (error) {
    const serverError = getSupabaseServerError(error, 'Failed to reset provider margins');
    return res.status(serverError.status).json({ success: false, message: serverError.message });
  }
});

router.get('/margin-versions', async (req, res) => {
  try {
    if (!supabaseAdminConfigured || !supabaseAdmin) {
      return res.status(503).json({ error: 'SUPABASE_SERVICE_ROLE_KEY is missing on the server.' });
    }

    const { provider_id } = req.query;
    let query = supabaseAdmin
      .from('provider_margin_versions')
      .select('*')
      .order('created_at', { ascending: false });
    if (provider_id) query = query.eq('provider_id', provider_id);

    const { data, error } = await query;
    if (error) {
      const serverError = getSupabaseServerError(error, 'Failed to load margin versions');
      return res.status(serverError.status).json({ success: false, message: serverError.message });
    }

    return res.status(200).json({ success: true, versions: data || [] });
  } catch (error) {
    const serverError = getSupabaseServerError(error);
    return res.status(serverError.status).json({ success: false, message: serverError.message });
  }
});

router.post('/margin-versions/:id/rollback', async (req, res) => {
  try {
    if (!supabaseAdminConfigured || !supabaseAdmin) {
      return res.status(503).json({ error: 'SUPABASE_SERVICE_ROLE_KEY is missing on the server.' });
    }

    const versionId = req.params.id;
    const { data: items, error } = await supabaseAdmin
      .from('provider_margin_version_items')
      .select('*')
      .eq('version_id', versionId);

    if (error) {
      const serverError = getSupabaseServerError(error, 'Failed to load margin version items');
      return res.status(serverError.status).json({ success: false, message: serverError.message });
    }

    const rulesToRestore = (items || []).map((item) => ({
      provider_id: null,
      service_id: item.service_id || null,
      category: null,
      margin_type: normalizeMarginType(item.old_margin_type),
      margin_value: clampDecimal10_2(item.old_margin_value ?? 0, 0),
      active: true,
      priority: 100,
      updated_at: new Date().toISOString(),
    }));

    if (rulesToRestore.length > 0) {
      await supabaseAdmin.from('provider_margin_rules').insert(rulesToRestore);
    }

    const recompute = await recomputeProviderServiceRates({});

    return res.status(200).json({ success: true, restored: rulesToRestore.length, recomputed: recompute.updated });
  } catch (error) {
    const serverError = getSupabaseServerError(error, 'Failed to rollback margin version');
    return res.status(serverError.status).json({ success: false, message: serverError.message });
  }
});

router.get('/margin-analysis', async (req, res) => {
  try {
    if (!supabaseAdminConfigured || !supabaseAdmin) {
      return res.status(503).json({ error: 'SUPABASE_SERVICE_ROLE_KEY is missing on the server.' });
    }

    const { provider_id } = req.query;
    let query = supabaseAdmin
      .from('provider_services')
      .select('provider_id, provider_rate, our_rate');
    if (provider_id) query = query.eq('provider_id', provider_id);

    const { data, error } = await query;
    if (error) {
      const serverError = getSupabaseServerError(error, 'Failed to load provider services for analysis');
      return res.status(serverError.status).json({ success: false, message: serverError.message });
    }

    const rows = data || [];
    const buckets = [
      { label: '0-10%', min: 0, max: 10, count: 0 },
      { label: '10-20%', min: 10, max: 20, count: 0 },
      { label: '20-50%', min: 20, max: 50, count: 0 },
      { label: '50-100%', min: 50, max: 100, count: 0 },
      { label: '100%+', min: 100, max: Infinity, count: 0 },
    ];

    let totalMarginPercent = 0;
    let totalMarginAmount = 0;
    const byProvider = new Map();

    rows.forEach((row) => {
      const providerId = String(row.provider_id || '');
      const percent = computeMarginPercent(row.provider_rate, row.our_rate);
      const amount = Number(row.our_rate || 0) - Number(row.provider_rate || 0);

      totalMarginPercent += percent;
      totalMarginAmount += amount;

      const providerEntry = byProvider.get(providerId) || {
        provider_id: providerId,
        count: 0,
        avg_margin_percent: 0,
        avg_margin_amount: 0,
      };
      providerEntry.count += 1;
      providerEntry.avg_margin_percent += percent;
      providerEntry.avg_margin_amount += amount;
      byProvider.set(providerId, providerEntry);

      const bucket = buckets.find((b) => percent >= b.min && percent < b.max);
      if (bucket) bucket.count += 1;
    });

    const providerStats = Array.from(byProvider.values()).map((entry) => ({
      ...entry,
      avg_margin_percent: entry.count ? Number((entry.avg_margin_percent / entry.count).toFixed(2)) : 0,
      avg_margin_amount: entry.count ? Number((entry.avg_margin_amount / entry.count).toFixed(4)) : 0,
    }));

    return res.status(200).json({
      success: true,
      total_services: rows.length,
      avg_margin_percent: rows.length ? Number((totalMarginPercent / rows.length).toFixed(2)) : 0,
      avg_margin_amount: rows.length ? Number((totalMarginAmount / rows.length).toFixed(4)) : 0,
      distribution: buckets,
      providers: providerStats,
    });
  } catch (error) {
    const serverError = getSupabaseServerError(error);
    return res.status(serverError.status).json({ success: false, message: serverError.message });
  }
});

router.get('/service-comparison', async (req, res) => {
  try {
    if (!supabaseAdminConfigured || !supabaseAdmin) {
      return res.status(503).json({ error: 'SUPABASE_SERVICE_ROLE_KEY is missing on the server.' });
    }

    const { service_id, limit, sort } = req.query;
    if (!service_id) {
      return res.status(400).json({ success: false, message: 'Missing service_id' });
    }

    const { data: mappings, error } = await supabaseAdmin
      .from('provider_services')
      .select(`
        id,
        provider_id,
        service_id,
        provider_rate,
        our_rate,
        min_quantity,
        max_quantity,
        providers:provider_id ( id, name )
      `)
      .eq('service_id', service_id);

    if (error) {
      const serverError = getSupabaseServerError(error, 'Failed to load provider services');
      return res.status(serverError.status).json({ success: false, message: serverError.message });
    }

    const normalized = (mappings || []).map((row) => ({
      ...row,
      providers: getEmbeddedObject(row.providers),
      margin_percent: computeMarginPercent(row.provider_rate, row.our_rate),
    }));

    const providerIds = Array.from(new Set(normalized.map((row) => row.provider_id)));
    const { data: qualityRows } = await supabaseAdmin
      .from('provider_quality_ratings')
      .select('provider_id, quality_score')
      .in('provider_id', providerIds);

    const qualityByProvider = new Map(
      (qualityRows || []).map((row) => [String(row.provider_id), row.quality_score])
    );

    const enhanced = normalized.map((row) => ({
      ...row,
      quality_score: qualityByProvider.get(String(row.provider_id)) || 3,
    }));

    const sorted = enhanced.sort((a, b) => {
      switch (sort) {
        case 'quality':
          return b.quality_score - a.quality_score;
        case 'margin':
          return b.margin_percent - a.margin_percent;
        case 'cost':
        default:
          return Number(a.provider_rate || 0) - Number(b.provider_rate || 0);
      }
    });

    const maxRows = Math.min(Number(limit || 5), 5);
    const selected = sorted.slice(0, maxRows);

    const bestValue = selected.reduce((best, row) => {
      if (!best) return row;
      const score = row.quality_score / Math.max(0.0001, Number(row.provider_rate || 0));
      const bestScore = best.quality_score / Math.max(0.0001, Number(best.provider_rate || 0));
      return score > bestScore ? row : best;
    }, null);

    const bestQuality = selected.reduce((best, row) => {
      if (!best) return row;
      return row.quality_score > best.quality_score ? row : best;
    }, null);

    const recommended = selected.reduce((best, row) => {
      if (!best) return row;
      const score = row.quality_score * 0.6 - Number(row.provider_rate || 0) * 0.4;
      const bestScore = best.quality_score * 0.6 - Number(best.provider_rate || 0) * 0.4;
      return score > bestScore ? row : best;
    }, null);

    const { data: competitors } = await supabaseAdmin
      .from('competitor_prices')
      .select('*')
      .eq('service_id', service_id)
      .order('captured_at', { ascending: false })
      .limit(10);

    return res.status(200).json({
      success: true,
      providers: selected,
      best_value: bestValue,
      best_quality: bestQuality,
      recommended,
      competitors: competitors || [],
    });
  } catch (error) {
    const serverError = getSupabaseServerError(error);
    return res.status(serverError.status).json({ success: false, message: serverError.message });
  }
});

router.get('/competitor-prices', async (req, res) => {
  try {
    if (!supabaseAdminConfigured || !supabaseAdmin) {
      return res.status(503).json({ error: 'SUPABASE_SERVICE_ROLE_KEY is missing on the server.' });
    }

    const { service_id } = req.query;
    let query = supabaseAdmin.from('competitor_prices').select('*').order('captured_at', { ascending: false });
    if (service_id) query = query.eq('service_id', service_id);

    const { data, error } = await query;
    if (error) {
      const serverError = getSupabaseServerError(error, 'Failed to load competitor prices');
      return res.status(serverError.status).json({ success: false, message: serverError.message });
    }

    return res.status(200).json({ success: true, prices: data || [] });
  } catch (error) {
    const serverError = getSupabaseServerError(error);
    return res.status(serverError.status).json({ success: false, message: serverError.message });
  }
});

router.post('/competitor-prices/bulk', async (req, res) => {
  try {
    if (!supabaseAdminConfigured || !supabaseAdmin) {
      return res.status(503).json({ error: 'SUPABASE_SERVICE_ROLE_KEY is missing on the server.' });
    }

    const { rows } = req.body || {};
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, message: 'No competitor prices supplied' });
    }

    const normalized = rows.map((row) => ({
      service_id: row.service_id || null,
      provider_name: String(row.provider_name || '').trim(),
      price_per_1000: clampDecimal10_2(row.price_per_1000 ?? 0, 0),
      quality_score: toInteger(row.quality_score, 0),
      delivery_time_hours: toInteger(row.delivery_time_hours, 0),
      captured_at: row.captured_at ? new Date(row.captured_at).toISOString() : new Date().toISOString(),
    }));

    const { error } = await supabaseAdmin.from('competitor_prices').insert(normalized);
    if (error) {
      const serverError = getSupabaseServerError(error, 'Failed to insert competitor prices');
      return res.status(serverError.status).json({ success: false, message: serverError.message });
    }

    return res.status(200).json({ success: true, inserted: normalized.length });
  } catch (error) {
    const serverError = getSupabaseServerError(error);
    return res.status(serverError.status).json({ success: false, message: serverError.message });
  }
});

router.get('/provider-quality-ratings', async (req, res) => {
  try {
    if (!supabaseAdminConfigured || !supabaseAdmin) {
      return res.status(503).json({ error: 'SUPABASE_SERVICE_ROLE_KEY is missing on the server.' });
    }

    const { provider_id } = req.query;
    let query = supabaseAdmin.from('provider_quality_ratings').select('*').order('updated_at', { ascending: false });
    if (provider_id) query = query.eq('provider_id', provider_id);

    const { data, error } = await query;
    if (error) {
      const serverError = getSupabaseServerError(error, 'Failed to load provider quality ratings');
      return res.status(serverError.status).json({ success: false, message: serverError.message });
    }

    return res.status(200).json({ success: true, ratings: data || [] });
  } catch (error) {
    const serverError = getSupabaseServerError(error);
    return res.status(serverError.status).json({ success: false, message: serverError.message });
  }
});

router.post('/provider-quality-ratings', async (req, res) => {
  try {
    if (!supabaseAdminConfigured || !supabaseAdmin) {
      return res.status(503).json({ error: 'SUPABASE_SERVICE_ROLE_KEY is missing on the server.' });
    }

    const payload = {
      provider_id: req.body?.provider_id,
      quality_score: toInteger(req.body?.quality_score, 3),
      notes: req.body?.notes || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from('provider_quality_ratings')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      const serverError = getSupabaseServerError(error, 'Failed to create provider quality rating');
      return res.status(serverError.status).json({ success: false, message: serverError.message });
    }

    return res.status(201).json({ success: true, rating: data });
  } catch (error) {
    const serverError = getSupabaseServerError(error);
    return res.status(serverError.status).json({ success: false, message: serverError.message });
  }
});

router.patch('/provider-quality-ratings/:id', async (req, res) => {
  try {
    if (!supabaseAdminConfigured || !supabaseAdmin) {
      return res.status(503).json({ error: 'SUPABASE_SERVICE_ROLE_KEY is missing on the server.' });
    }

    const updates = {
      quality_score: req.body?.quality_score !== undefined ? toInteger(req.body?.quality_score, 3) : undefined,
      notes: req.body?.notes !== undefined ? req.body?.notes : undefined,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from('provider_quality_ratings')
      .update(updates)
      .eq('id', req.params.id)
      .select('*')
      .single();

    if (error) {
      const serverError = getSupabaseServerError(error, 'Failed to update provider quality rating');
      return res.status(serverError.status).json({ success: false, message: serverError.message });
    }

    return res.status(200).json({ success: true, rating: data });
  } catch (error) {
    const serverError = getSupabaseServerError(error);
    return res.status(serverError.status).json({ success: false, message: serverError.message });
  }
});

export default router;
