import express from 'express';
import { supabaseAdmin, supabaseAdminConfigured } from '../lib/supabaseServer.js';
import { validateRequest, schemas } from '../lib/validation.js';
import { successResponse, errorResponse, asyncHandler } from '../lib/apiResponse.js';

const router = express.Router();

// POST /api/fastpay/create-order
// Body: { paymentId, amount, orderId(opt), customerEmail, customerName, returnUrl, cancelUrl }
router.post('/create-order', validateRequest(schemas.createOrderSchema), asyncHandler(async (req, res) => {
  if (!supabaseAdminConfigured || !supabaseAdmin) {
    return res.status(503).json(
      errorResponse('SUPABASE_NOT_CONFIGURED', 'Supabase admin client not configured')
    );
  }

  const { paymentId, amount, customerEmail, customerName, returnUrl, cancelUrl } = req.validatedBody;

  const FASTPAY_API_KEY = process.env.FASTPAY_API_KEY;
  const FASTPAY_MERCHANT_ID = process.env.FASTPAY_MERCHANT_ID || process.env.VITE_FASTPAY_MERCHANT_ID;
  const FASTPAY_BASE_URL = process.env.FASTPAY_BASE_URL || process.env.VITE_FASTPAY_BASE_URL || 'https://api.fastpay.com/v1';

  if (!FASTPAY_API_KEY || !FASTPAY_MERCHANT_ID) {
    console.error('FastPay keys not configured on server');
    return res.status(500).json(
      errorResponse('FASTPAY_NOT_CONFIGURED', 'Payment provider not configured')
    );
  }

  // Build FastPay order payload
  const payload = {
    amount,
    order_id: String(paymentId),
    customer_email: customerEmail,
    customer_name: customerName,
    return_url: returnUrl,
    cancel_url: cancelUrl,
    notify_url: process.env.FASTPAY_WEBHOOK_URL || '/webhook/fastpay'
  };

  const fetchFn = (typeof fetch === 'function') ? fetch : null;
  if (!fetchFn) {
    console.error('Global fetch is not available in this Node.js runtime. Please run on Node 18+ or set up a polyfill.');
    return res.status(500).json(
      errorResponse('RUNTIME_ERROR', 'Fetch not available on runtime; use Node 18+ or install node-fetch polyfill')
    );
  }

  const response = await fetchFn(`${FASTPAY_BASE_URL}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${FASTPAY_API_KEY}`,
      'X-Merchant-Id': FASTPAY_MERCHANT_ID,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error('FastPay API error:', data);
    return res.status(502).json(
      errorResponse(
        'FASTPAY_API_ERROR',
        'Payment provider returned error',
        { message: data.message || data.error, code: data.code }
      )
    );
  }

  const orderId = data.order_id || data.id || null;
  const transactionId = data.transaction_id || data.txn_id || null;
  const paymentUrl = data.payment_url || data.redirect_url || null;

  // Update payment record with explicit error handling
  const { error: updateError } = await supabaseAdmin.from('payments').update({
    status: 'pending',
    transaction_id: transactionId,
    fastpay_order_id: orderId,
    payment_provider: 'fastpay'
  }).eq('id', paymentId);

  if (updateError) {
    console.error('Database update failed:', updateError);
    // Still return success since FastPay order was created
    // but notify about db sync issue
    return res.status(200).json(
      successResponse({ paymentUrl, order_id: orderId, transaction_id: transactionId }, { 
        warning: 'Payment created but database sync may be delayed' 
      })
    );
  }

  return res.status(200).json(
    successResponse({ paymentUrl, order_id: orderId, transaction_id: transactionId })
  );
}));

export default router;
