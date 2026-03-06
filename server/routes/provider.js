import express from 'express';
import { supabaseAdmin } from '../lib/supabaseServer.js';

const router = express.Router();

const DAOSMM_API_URL = 'https://daosmm.com/api/v2';

/**
 * Helper function to call DaoSMM API
 * Uses native fetch (available in Node 18+)
 * @param {string} apiKey - DaoSMM API key
 * @param {object} params - API parameters
 * @returns {Promise<object>} Response from DaoSMM
 */
async function callDaoSMM(apiKey, params) {
  try {
    const url = new URL(DAOSMM_API_URL);
    
    // Add all parameters to URL
    Object.keys(params).forEach(key => {
      url.searchParams.append(key, params[key]);
    });
    
    // Add API key
    url.searchParams.append('key', apiKey);

    console.log('[DaoSMM Bridge] Calling:', {
      endpoint: params.action,
      url: url.toString().replace(apiKey, '***HIDDEN***'),
    });

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`DaoSMM API returned ${response.status}`);
    }

    const data = await response.json();
    
    console.log('[DaoSMM Bridge] Response:', {
      endpoint: params.action,
      status: response.status,
      hasError: data.error ? true : false,
    });

    return data;
  } catch (error) {
    console.error('[DaoSMM Bridge] Error calling DaoSMM:', error.message);
    throw error;
  }
}

/**
 * GET /api/provider/services
 * Fetch available services from DaoSMM
 * Used by admin to sync services
 */
router.get('/services', async (req, res) => {
  try {
    const { provider_id } = req.query;

    if (!provider_id) {
      return res.status(400).json({ error: 'Missing provider_id' });
    }

    // Get provider API key from database
    const { data: provider, error: providerError } = await supabaseAdmin
      .from('providers')
      .select('id, name, api_key')
      .eq('id', provider_id)
      .single();

    if (providerError || !provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    if (!provider.api_key) {
      return res.status(400).json({ error: 'Provider API key not configured' });
    }

    // Call DaoSMM to get services
    const services = await callDaoSMM(provider.api_key, {
      action: 'services',
    });

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
 * Create a new order on DaoSMM
 * Body: { provider_id, service, link, quantity, runs?, interval? }
 */
router.post('/add-order', async (req, res) => {
  try {
    const { provider_id, service, link, quantity, runs, interval } = req.body;

    // Validate required fields
    if (!provider_id || !service || !link || !quantity) {
      return res.status(400).json({ 
        error: 'Missing required fields: provider_id, service, link, quantity',
      });
    }

    // Get provider API key
    const { data: provider, error: providerError } = await supabaseAdmin
      .from('providers')
      .select('id, name, api_key')
      .eq('id', provider_id)
      .single();

    if (providerError || !provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    // Build params for DaoSMM
    const params = {
      action: 'add',
      service: String(service),
      link: link,
      quantity: String(quantity),
    };

    if (runs) params.runs = String(runs);
    if (interval) params.interval = String(interval);

    // Call DaoSMM to create order (direct GET request)
    try {
      const url = new URL(DAOSMM_API_URL);
      Object.keys(params).forEach(key => {
        url.searchParams.append(key, params[key]);
      });
      url.searchParams.append('key', provider.api_key);

      console.log('[DaoSMM Bridge] Calling add-order:', {
        url: url.toString().replace(provider.api_key, '***HIDDEN***'),
      });

      const fetchResponse = await fetch(url.toString());
      const result = await fetchResponse.json();

      if (result.error) {
        return res.status(400).json({ 
          error: 'Failed to create order',
          details: result.error,
        });
      }

      console.log('[DaoSMM Bridge] Order created:', {
        provider: provider.name,
        orderId: result.order,
        service,
        quantity,
      });

      return res.json({ 
        ok: true,
        order: result.order,
        provider: provider.name,
      });
    } catch (error) {
      throw error;
    }
  } catch (error) {
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
 * Query: provider_id, orders (comma-separated order IDs or single ID)
 */
router.get('/order-status', async (req, res) => {
  try {
    const { provider_id, orders } = req.query;

    if (!provider_id || !orders) {
      return res.status(400).json({ 
        error: 'Missing required fields: provider_id, orders',
      });
    }

    // Get provider API key
    const { data: provider, error: providerError } = await supabaseAdmin
      .from('providers')
      .select('id, name, api_key')
      .eq('id', provider_id)
      .single();

    if (providerError || !provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    // Check if single order or multiple
    const isSingleOrder = !orders.includes(',');

    const params = {
      action: 'status',
    };

    if (isSingleOrder) {
      params.order = String(orders);
    } else {
      params.orders = String(orders); // Multiple orders
    }

    // Call DaoSMM
    const result = await callDaoSMM(provider.api_key, params);

    console.log('[DaoSMM Bridge] Order status retrieved:', {
      provider: provider.name,
      orderCount: isSingleOrder ? 1 : orders.split(',').length,
    });

    return res.json({ 
      ok: true,
      status: result,
      provider: provider.name,
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
 * GET /api/provider/balance
 * Get account balance from DaoSMM
 * Query: provider_id
 */
router.get('/balance', async (req, res) => {
  try {
    const { provider_id } = req.query;

    if (!provider_id) {
      return res.status(400).json({ error: 'Missing provider_id' });
    }

    // Get provider API key
    const { data: provider, error: providerError } = await supabaseAdmin
      .from('providers')
      .select('id, name, api_key, balance')
      .eq('id', provider_id)
      .single();

    if (providerError || !provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    // Call DaoSMM to get balance
    const result = await callDaoSMM(provider.api_key, {
      action: 'balance',
    });

    if (result.error) {
      return res.status(400).json({ 
        error: 'Failed to fetch balance',
        details: result.error,
      });
    }

    // Update provider balance in database
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

    // Get provider API key
    const { data: provider, error: providerError } = await supabaseAdmin
      .from('providers')
      .select('id, name, api_key')
      .eq('id', provider_id)
      .single();

    if (providerError || !provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    // Check if single order or multiple
    const isSingleOrder = !orders.includes(',');

    const params = {
      action: 'refill',
    };

    if (isSingleOrder) {
      params.order = String(orders);
    } else {
      params.orders = String(orders); // Multiple orders
    }

    // Call DaoSMM to create refill (direct GET request)
    try {
      const url = new URL(DAOSMM_API_URL);
      Object.keys(params).forEach(key => {
        url.searchParams.append(key, params[key]);
      });
      url.searchParams.append('key', provider.api_key);

      console.log('[DaoSMM Bridge] Calling refill:', {
        url: url.toString().replace(provider.api_key, '***HIDDEN***'),
      });

      const fetchResponse = await fetch(url.toString());
      const result = await fetchResponse.json();

      if (result.error) {
        return res.status(400).json({ 
          error: 'Failed to create refill',
          details: result.error,
        });
      }

      console.log('[DaoSMM Bridge] Refill created:', {
        provider: provider.name,
        orderCount: isSingleOrder ? 1 : orders.split(',').length,
        refillInfo: isSingleOrder ? result.refill : 'multiple',
      });

      return res.json({ 
        ok: true,
        refill: result,
        provider: provider.name,
      });
    } catch (error) {
      throw error;
    }
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

    // Get provider API key
    const { data: provider, error: providerError } = await supabaseAdmin
      .from('providers')
      .select('id, name, api_key')
      .eq('id', provider_id)
      .single();

    if (providerError || !provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    // DaoSMM always expects 'orders' parameter for cancel
    const params = {
      action: 'cancel',
      orders: String(orders), // Can be single or multiple
    };

    // Call DaoSMM to cancel order (direct GET request)
    try {
      const url = new URL(DAOSMM_API_URL);
      Object.keys(params).forEach(key => {
        url.searchParams.append(key, params[key]);
      });
      url.searchParams.append('key', provider.api_key);

      console.log('[DaoSMM Bridge] Calling cancel:', {
        url: url.toString().replace(provider.api_key, '***HIDDEN***'),
      });

      const fetchResponse = await fetch(url.toString());
      const result = await fetchResponse.json();

      if (result.error) {
        return res.status(400).json({ 
          error: 'Failed to cancel order',
          details: result.error,
        });
      }

      console.log('[DaoSMM Bridge] Order cancelled:', {
        provider: provider.name,
        orderCount: orders.split(',').length,
      });

      return res.json({ 
        ok: true,
        cancel: result,
        provider: provider.name,
      });
    } catch (error) {
      throw error;
    }
  } catch (error) {
    console.error('[DaoSMM Bridge] Cancel order error:', error);
    return res.status(500).json({ 
      error: 'Failed to cancel order',
      message: error.message,
    });
  }
});

export default router;
