import express from 'express';
import { supabaseAdmin, supabaseAdminConfigured } from '../lib/supabaseServer.js';

const router = express.Router();

// POST /api/fastpay/create-order
// Body: { paymentId, amount, orderId(opt), customerEmail, customerName, returnUrl, cancelUrl }
router.post('/create-order', async (req, res) => {
  try {
    if (!supabaseAdminConfigured || !supabaseAdmin) {
      return res.status(503).json({ error: 'Supabase admin client not configured' });
    }

    const { paymentId, amount, customerEmail, customerName, returnUrl, cancelUrl } = req.body || {};

    if (!paymentId || !amount || !customerEmail) {
      return res.status(400).json({ error: 'Missing required fields: paymentId, amount, customerEmail' });
    }

    const FASTPAY_API_KEY = process.env.FASTPAY_API_KEY;
    const FASTPAY_MERCHANT_ID = process.env.FASTPAY_MERCHANT_ID || process.env.VITE_FASTPAY_MERCHANT_ID;
    const FASTPAY_BASE_URL = process.env.FASTPAY_BASE_URL || process.env.VITE_FASTPAY_BASE_URL || 'https://api.fastpay.com/v1';

    if (!FASTPAY_API_KEY || !FASTPAY_MERCHANT_ID) {
      console.error('FastPay keys not configured on server');
      return res.status(500).json({ error: 'Payment provider not configured' });
    }

    // Build FastPay order payload
    const payload = {
      amount: amount,
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
      return res.status(500).json({ error: 'Fetch not available on runtime; use Node 18+ or install node-fetch polyfill' });
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
      console.error('FastPay returned error', data);
      return res.status(502).json({ error: 'Payment provider error', details: data });
    }

    const orderId = data.order_id || data.id || null;
    const transactionId = data.transaction_id || data.txn_id || null;
    const paymentUrl = data.payment_url || data.redirect_url || null;

    // update payment record in Supabase
    try {
      const { error: updateError } = await supabaseAdmin.from('payments').update({
        status: 'pending',
        transaction_id: transactionId,
        fastpay_order_id: orderId,
        payment_provider: 'fastpay'
      }).eq('id', paymentId);
      if (updateError) console.error('Failed to update payment with FastPay details', updateError);
    } catch (e) {
      console.error('Error updating payment record', e);
    }

    return res.json({ ok: true, paymentUrl, transactionId, orderId, data });
  } catch (err) {
    console.error('FastPay create order error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
