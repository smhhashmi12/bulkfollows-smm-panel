import express from 'express';
import { supabaseAdmin } from '../lib/supabaseServer.js';
import { readAuthCookies } from '../lib/authCookies.js';

const router = express.Router();

const DEFAULT_PROVIDER_API_URL = 'https://daosmm.com/api/v2';

function getProviderApiUrl(provider) {
  const candidate = String(provider?.api_url || '').trim() || DEFAULT_PROVIDER_API_URL;
  return new URL(candidate);
}

function buildProviderBody(apiKey, params) {
  const body = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      body.append(key, String(value));
    }
  });

  body.append('key', String(apiKey || ''));
  return body;
}

function extractProviderError(data) {
  if (!data) return 'Empty response from provider';
  if (typeof data === 'string') return data;
  if (Array.isArray(data)) return null;
  return data.error || data.message || null;
}

function mapProviderStatusToLocal(statusValue) {
  const rawStatus = String(statusValue || '').toLowerCase();

  if (!rawStatus) return 'processing';

  if (rawStatus.includes('pending')) return 'pending';
  if (rawStatus.includes('complete')) return 'completed';
  if (rawStatus.includes('cancel') || rawStatus.includes('refund')) return 'canceled';
  if (rawStatus.includes('fail') || rawStatus.includes('error')) return 'failed';
  if (rawStatus.includes('partial')) return 'processing';
  if (rawStatus.includes('process') || rawStatus.includes('progress') || rawStatus.includes('inprogress')) {
    return 'processing';
  }

  return 'processing';
}

function pickStatusNode(result, orderId) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    return result;
  }

  const stringOrderId = String(orderId || '').trim();
  if (stringOrderId && result[stringOrderId]) {
    return result[stringOrderId];
  }

  const firstKey = Object.keys(result)[0];
  return firstKey ? result[firstKey] : result;
}

async function updateLocalOrder(localOrderId, updates) {
  if (!localOrderId || !supabaseAdmin) return null;

  const payload = Object.fromEntries(
    Object.entries(updates).filter(([, value]) => value !== undefined)
  );

  if (Object.keys(payload).length === 0) return null;

  const { data, error } = await supabaseAdmin
    .from('orders')
    .update(payload)
    .eq('id', localOrderId)
    .select('id, status, provider_id, provider_order_id, start_count, remains')
    .maybeSingle();

  if (error) {
    console.error('[DaoSMM Bridge] Failed to update local order:', {
      localOrderId,
      updates: payload,
      error,
    });
    return null;
  }

  return data;
}

function getRequestAccessToken(req) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (typeof authHeader === 'string') {
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (match?.[1]) {
      return String(match[1]).trim();
    }
  }

  const cookieTokens = readAuthCookies(req);
  if (cookieTokens?.accessToken) {
    return String(cookieTokens.accessToken).trim();
  }

  return '';
}

async function getRequestUserId(req) {
  if (!supabaseAdmin?.auth?.getUser) return null;

  const accessToken = getRequestAccessToken(req);
  if (!accessToken) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(accessToken);
  if (error || !data?.user) return null;

  return data.user.id;
}

/**
 * Helper function to call DaoSMM-compatible provider APIs.
 * Uses POST with application/x-www-form-urlencoded body, which is the common SMM API format.
 */
async function callDaoSMM(provider, params) {
  try {
    const url = getProviderApiUrl(provider);
    const body = buildProviderBody(provider.api_key, params);
    const maskedBody = provider?.api_key
      ? body.toString().replace(String(provider.api_key), '***HIDDEN***')
      : body.toString();

    console.log('[DaoSMM Bridge] Calling:', {
      endpoint: params.action,
      provider: provider?.name,
      url: url.toString(),
      body: maskedBody,
    });

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    const rawBody = await response.text();
    let data;
    try {
      data = rawBody ? JSON.parse(rawBody) : null;
    } catch {
      data = rawBody;
    }

    if (!response.ok) {
      throw new Error(
        `Provider API returned ${response.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`
      );
    }

    console.log('[DaoSMM Bridge] Response:', {
      endpoint: params.action,
      status: response.status,
      hasError: extractProviderError(data) ? true : false,
    });

    return data;
  } catch (error) {
    console.error('[DaoSMM Bridge] Error calling provider:', error.message);
    throw error;
  }
}

/**
 * GET /api/provider/services
 * Fetch available services from provider
 * Used by admin to sync services
 */
router.get('/services', async (req, res) => {
  try {
    const { provider_id } = req.query;

    if (!provider_id) {
      return res.status(400).json({ error: 'Missing provider_id' });
    }

    const { data: provider, error: providerError } = await supabaseAdmin
      .from('providers')
      .select('id, name, api_key, api_url')
      .eq('id', provider_id)
      .single();

    if (providerError || !provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    if (!provider.api_key) {
      return res.status(400).json({ error: 'Provider API key not configured' });
    }

    const services = await callDaoSMM(provider, {
      action: 'services',
    });
    const providerErrorMessage = extractProviderError(services);

    if (providerErrorMessage) {
      return res.status(400).json({
        error: 'Failed to fetch services from provider',
        details: providerErrorMessage,
      });
    }

    console.log('[DaoSMM Bridge] Services retrieved:', {
      provider: provider.name,
      count: Array.isArray(services) ? services.length : 0,
    });

    return res.json({
      ok: true,
      services: Array.isArray(services) ? services : [],
      provider: provider.name,
    });
  } catch (error) {
    console.error('[DaoSMM Bridge] Get services error:', error);
    return res.status(500).json({
      error: 'Failed to fetch services from provider',
      message: error.message,
    });
  }
});

/**
 * POST /api/provider/add-order
 * Create a new order on provider
 * Body: { provider_id, local_order_id?, service, link, quantity, runs?, interval? }
 */
router.post('/add-order', async (req, res) => {
  try {
    const { provider_id, local_order_id, service, link, quantity, runs, interval } = req.body;

    if (!provider_id || !service || !link || !quantity) {
      return res.status(400).json({
        error: 'Missing required fields: provider_id, service, link, quantity',
      });
    }

    const { data: provider, error: providerError } = await supabaseAdmin
      .from('providers')
      .select('id, name, api_key, api_url')
      .eq('id', provider_id)
      .single();

    if (providerError || !provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    if (!provider.api_key) {
      return res.status(400).json({ error: 'Provider API key not configured' });
    }

    const params = {
      action: 'add',
      service: String(service),
      link: String(link),
      quantity: String(quantity),
      runs: runs ? String(runs) : undefined,
      interval: interval ? String(interval) : undefined,
    };

    const result = await callDaoSMM(provider, params);
    const providerErrorMessage = extractProviderError(result);

    if (providerErrorMessage) {
      const localOrder = await updateLocalOrder(local_order_id, {
        provider_id,
        status: 'failed',
      });

      return res.status(400).json({
        error: 'Failed to create order',
        details: providerErrorMessage,
        localOrder,
      });
    }

    if (!result?.order) {
      const localOrder = await updateLocalOrder(local_order_id, {
        provider_id,
        status: 'failed',
      });

      return res.status(502).json({
        error: 'Failed to create order',
        details: 'Provider did not return an order ID.',
        localOrder,
      });
    }

    const localOrder = await updateLocalOrder(local_order_id, {
      provider_id,
      provider_order_id: String(result.order),
      status: mapProviderStatusToLocal(result.status),
    });

    console.log('[DaoSMM Bridge] Order created:', {
      provider: provider.name,
      orderId: result.order,
      service,
      quantity,
      localOrderId: local_order_id || null,
    });

    return res.json({
      ok: true,
      order: result.order,
      provider: provider.name,
      localOrder,
    });
  } catch (error) {
    const { provider_id, local_order_id } = req.body || {};
    await updateLocalOrder(local_order_id, {
      provider_id,
      status: 'failed',
    });

    console.error('[DaoSMM Bridge] Add order error:', error);
    return res.status(500).json({
      error: 'Failed to create order',
      message: error.message,
    });
  }
});

/**
 * GET /api/provider/order-status
 * Get status of one or more orders
 * Query: provider_id, orders (comma-separated order IDs or single ID), local_order_id?
 */
router.get('/order-status', async (req, res) => {
  try {
    const { provider_id, orders, local_order_id } = req.query;

    if (!provider_id || !orders) {
      return res.status(400).json({
        error: 'Missing required fields: provider_id, orders',
      });
    }

    const { data: provider, error: providerError } = await supabaseAdmin
      .from('providers')
      .select('id, name, api_key, api_url')
      .eq('id', provider_id)
      .single();

    if (providerError || !provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    if (!provider.api_key) {
      return res.status(400).json({ error: 'Provider API key not configured' });
    }

    const orderValue = String(orders);
    const isSingleOrder = !orderValue.includes(',');
    const params = {
      action: 'status',
      order: isSingleOrder ? orderValue : undefined,
      orders: isSingleOrder ? undefined : orderValue,
    };

    const result = await callDaoSMM(provider, params);
    const providerErrorMessage = extractProviderError(result);

    if (providerErrorMessage) {
      return res.status(400).json({
        error: 'Failed to fetch order status',
        details: providerErrorMessage,
      });
    }

    let localOrder = null;
    if (local_order_id) {
      const statusNode = pickStatusNode(result, orderValue);
      localOrder = await updateLocalOrder(local_order_id, {
        provider_id,
        provider_order_id: isSingleOrder ? orderValue : undefined,
        status: mapProviderStatusToLocal(
          statusNode?.status || statusNode?.Status || statusNode
        ),
        start_count:
          statusNode?.start_count !== undefined && statusNode?.start_count !== null
            ? Number(statusNode.start_count)
            : undefined,
        remains:
          statusNode?.remains !== undefined && statusNode?.remains !== null
            ? Number(statusNode.remains)
            : undefined,
      });
    }

    console.log('[DaoSMM Bridge] Order status retrieved:', {
      provider: provider.name,
      orderCount: isSingleOrder ? 1 : orderValue.split(',').length,
    });

    return res.json({
      ok: true,
      status: result,
      provider: provider.name,
      localOrder,
    });
  } catch (error) {
    console.error('[DaoSMM Bridge] Get order status error:', error);
    return res.status(500).json({
      error: 'Failed to fetch order status',
      message: error.message,
    });
  }
});

/**
 * POST /api/provider/sync-local-orders
 * Sync provider statuses into local user orders (bulk)
 * Body: { order_ids: string[] } or { orderIds: string[] }
 */
router.post('/sync-local-orders', async (req, res) => {
  try {
    const userId = await getRequestUserId(req);
    if (!userId) {
      return res.status(401).json({ error: 'Missing session token (Authorization or cookie)' });
    }

    const rawOrderIds = req.body?.order_ids ?? req.body?.orderIds ?? [];
    const orderIds = (Array.isArray(rawOrderIds) ? rawOrderIds : String(rawOrderIds).split(','))
      .map((value) => String(value || '').trim())
      .filter(Boolean);

    const dedupedOrderIds = Array.from(new Set(orderIds)).slice(0, 50);
    if (dedupedOrderIds.length === 0) {
      return res.json({ ok: true, updatedOrders: [] });
    }

    const { data: localOrders, error: localOrdersError } = await supabaseAdmin
      .from('orders')
      .select('id, user_id, provider_id, provider_order_id, status, start_count, remains')
      .eq('user_id', userId)
      .in('id', dedupedOrderIds);

    if (localOrdersError) {
      return res.status(500).json({
        error: 'Failed to load local orders',
        message: localOrdersError.message,
      });
    }

    const terminalStatuses = new Set(['completed', 'failed', 'canceled']);
    const syncCandidates = (localOrders || []).filter((order) => {
      const hasProvider = Boolean(order?.provider_id && order?.provider_order_id);
      if (!hasProvider) return false;
      const status = String(order?.status || '').toLowerCase();
      const needsProgressFields = order?.start_count === null || order?.start_count === undefined ||
        order?.remains === null || order?.remains === undefined;
      return !terminalStatuses.has(status) || needsProgressFields;
    });

    if (syncCandidates.length === 0) {
      return res.json({ ok: true, updatedOrders: [] });
    }

    const ordersByProviderId = new Map();
    syncCandidates.forEach((order) => {
      const providerId = String(order.provider_id || '').trim();
      const providerOrderId = String(order.provider_order_id || '').trim();
      if (!providerId || !providerOrderId) return;

      const entry = ordersByProviderId.get(providerId) || [];
      entry.push({ ...order, providerOrderId });
      ordersByProviderId.set(providerId, entry);
    });

    const providerIds = Array.from(ordersByProviderId.keys());
    const { data: providers, error: providersError } = await supabaseAdmin
      .from('providers')
      .select('id, name, api_key, api_url')
      .in('id', providerIds);

    if (providersError) {
      return res.status(500).json({
        error: 'Failed to load provider credentials',
        message: providersError.message,
      });
    }

    const providerById = new Map((providers || []).map((provider) => [String(provider.id), provider]));
    const updatedOrders = [];

    for (const providerId of providerIds) {
      const provider = providerById.get(providerId);
      if (!provider) continue;
      if (!provider.api_key) continue;

      const providerOrders = ordersByProviderId.get(providerId) || [];
      const providerOrderIds = providerOrders.map((order) => String(order.providerOrderId)).filter(Boolean);
      if (providerOrderIds.length === 0) continue;

      const isSingleOrder = providerOrderIds.length === 1;
      const orderValue = isSingleOrder ? providerOrderIds[0] : providerOrderIds.join(',');
      const params = {
        action: 'status',
        order: isSingleOrder ? orderValue : undefined,
        orders: isSingleOrder ? undefined : orderValue,
      };

      let result;
      try {
        result = await callDaoSMM(provider, params);
      } catch (error) {
        console.warn('[DaoSMM Bridge] Bulk status sync failed:', {
          provider: provider?.name,
          providerId,
          message: error?.message || String(error),
        });
        continue;
      }

      const providerErrorMessage = extractProviderError(result);
      if (providerErrorMessage) {
        console.warn('[DaoSMM Bridge] Provider returned status error:', {
          provider: provider?.name,
          providerId,
          details: providerErrorMessage,
        });
        continue;
      }

      const statusMap = new Map();
      if (result && typeof result === 'object' && !Array.isArray(result)) {
        providerOrderIds.forEach((providerOrderId) => {
          const key = String(providerOrderId).trim();
          if (key && result[key] !== undefined) {
            statusMap.set(key, result[key]);
          }
        });
      }

      providerOrders.forEach((order) => {
        const providerOrderId = String(order.providerOrderId || '').trim();
        if (!providerOrderId) return;
        const statusNode = statusMap.get(providerOrderId) ?? (isSingleOrder ? result : null);
        if (!statusNode) return;

        const rawStatusValue = statusNode?.status || statusNode?.Status || statusNode;
        const updates = {
          provider_id: providerId,
          provider_order_id: providerOrderId,
          status: mapProviderStatusToLocal(rawStatusValue),
          start_count:
            statusNode?.start_count !== undefined && statusNode?.start_count !== null
              ? Number(statusNode.start_count)
              : undefined,
          remains:
            statusNode?.remains !== undefined && statusNode?.remains !== null
              ? Number(statusNode.remains)
              : undefined,
        };

        updatedOrders.push({ orderId: order.id, updates });
      });
    }

    const appliedUpdates = await Promise.all(
      updatedOrders.map(async (entry) => {
        const updated = await updateLocalOrder(entry.orderId, entry.updates);
        return updated || null;
      })
    );

    return res.json({
      ok: true,
      updatedOrders: appliedUpdates.filter(Boolean),
    });
  } catch (error) {
    console.error('[DaoSMM Bridge] Bulk sync error:', error);
    return res.status(500).json({
      error: 'Failed to sync order statuses',
      message: error.message,
    });
  }
});

/**
 * GET /api/provider/balance
 * Get account balance from provider
 * Query: provider_id
 */
router.get('/balance', async (req, res) => {
  try {
    const { provider_id } = req.query;

    if (!provider_id) {
      return res.status(400).json({ error: 'Missing provider_id' });
    }

    const { data: provider, error: providerError } = await supabaseAdmin
      .from('providers')
      .select('id, name, api_key, api_url, balance')
      .eq('id', provider_id)
      .single();

    if (providerError || !provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    if (!provider.api_key) {
      return res.status(400).json({ error: 'Provider API key not configured' });
    }

    const result = await callDaoSMM(provider, {
      action: 'balance',
    });
    const providerErrorMessage = extractProviderError(result);

    if (providerErrorMessage) {
      return res.status(400).json({
        error: 'Failed to fetch balance',
        details: providerErrorMessage,
      });
    }

    if (result.balance) {
      await supabaseAdmin
        .from('providers')
        .update({ balance: parseFloat(result.balance) })
        .eq('id', provider_id);
    }

    console.log('[DaoSMM Bridge] Balance retrieved:', {
      provider: provider.name,
      balance: result.balance,
      currency: result.currency || 'USD',
    });

    return res.json({
      ok: true,
      balance: result.balance,
      currency: result.currency || 'USD',
      provider: provider.name,
    });
  } catch (error) {
    console.error('[DaoSMM Bridge] Get balance error:', error);
    return res.status(500).json({
      error: 'Failed to fetch balance',
      message: error.message,
    });
  }
});

/**
 * POST /api/provider/refill
 * Create refill for order(s)
 * Body: { provider_id, orders (comma-separated) }
 */
router.post('/refill', async (req, res) => {
  try {
    const { provider_id, orders } = req.body;

    if (!provider_id || !orders) {
      return res.status(400).json({
        error: 'Missing required fields: provider_id, orders',
      });
    }

    const { data: provider, error: providerError } = await supabaseAdmin
      .from('providers')
      .select('id, name, api_key, api_url')
      .eq('id', provider_id)
      .single();

    if (providerError || !provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    if (!provider.api_key) {
      return res.status(400).json({ error: 'Provider API key not configured' });
    }

    const orderValue = String(orders);
    const isSingleOrder = !orderValue.includes(',');
    const params = {
      action: 'refill',
      order: isSingleOrder ? orderValue : undefined,
      orders: isSingleOrder ? undefined : orderValue,
    };

    const result = await callDaoSMM(provider, params);
    const providerErrorMessage = extractProviderError(result);

    if (providerErrorMessage) {
      return res.status(400).json({
        error: 'Failed to create refill',
        details: providerErrorMessage,
      });
    }

    console.log('[DaoSMM Bridge] Refill created:', {
      provider: provider.name,
      orderCount: isSingleOrder ? 1 : orderValue.split(',').length,
      refillInfo: isSingleOrder ? result.refill : 'multiple',
    });

    return res.json({
      ok: true,
      refill: result,
      provider: provider.name,
    });
  } catch (error) {
    console.error('[DaoSMM Bridge] Create refill error:', error);
    return res.status(500).json({
      error: 'Failed to create refill',
      message: error.message,
    });
  }
});

/**
 * POST /api/provider/cancel
 * Cancel order(s)
 * Body: { provider_id, orders (comma-separated) }
 */
router.post('/cancel', async (req, res) => {
  try {
    const { provider_id, orders } = req.body;

    if (!provider_id || !orders) {
      return res.status(400).json({
        error: 'Missing required fields: provider_id, orders',
      });
    }

    const { data: provider, error: providerError } = await supabaseAdmin
      .from('providers')
      .select('id, name, api_key, api_url')
      .eq('id', provider_id)
      .single();

    if (providerError || !provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    if (!provider.api_key) {
      return res.status(400).json({ error: 'Provider API key not configured' });
    }

    const params = {
      action: 'cancel',
      orders: String(orders),
    };

    const result = await callDaoSMM(provider, params);
    const providerErrorMessage = extractProviderError(result);

    if (providerErrorMessage) {
      return res.status(400).json({
        error: 'Failed to cancel order',
        details: providerErrorMessage,
      });
    }

    console.log('[DaoSMM Bridge] Order cancelled:', {
      provider: provider.name,
      orderCount: String(orders).split(',').length,
    });

    return res.json({
      ok: true,
      cancel: result,
      provider: provider.name,
    });
  } catch (error) {
    console.error('[DaoSMM Bridge] Cancel order error:', error);
    return res.status(500).json({
      error: 'Failed to cancel order',
      message: error.message,
    });
  }
});

export default router;
