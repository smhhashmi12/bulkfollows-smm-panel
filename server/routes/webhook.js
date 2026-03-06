import express from 'express';
import crypto from 'crypto';
import { supabase, supabaseConfigured } from '../lib/supabaseServer.js';

const router = express.Router();

// FastPay webhook receiver
router.post('/', async (req, res) => {
  try {
    const payload = req.body || {};
    const signature = req.headers['x-fastpay-signature'] || req.headers['x-signature'];
    const secret = process.env.FASTPAY_WEBHOOK_SECRET;

    // If a webhook secret is provided, attempt to verify HMAC-SHA256 signature
    if (secret && signature) {
      const computed = crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
      if (computed !== signature) {
        console.warn('Invalid FastPay webhook signature', { computed, signature });
        return res.status(400).json({ error: 'Invalid signature' });
      }
    }

    // Expected payload fields (best-effort): id, status, amount, metadata (contains user_id or email)
    const providerTxnId = payload.id || payload.txn_id || null;
    const status = payload.status || payload.event || 'unknown';
    const amount = Number(payload.amount || 0);
    const metadata = payload.metadata || {};

    // If Supabase isn't configured, skip DB work but accept the webhook so payment provider won't retry
    if (!supabaseConfigured || !supabase) {
      console.warn('Received webhook but Supabase not configured; skipping DB insert.');
      return res.json({ ok: true, note: 'Supabase not configured; webhook accepted but not processed.' });
    }

    // Insert a payment log / record
    const { data: paymentData, error: paymentError } = await supabase.from('payments').insert([{
      provider: 'fastpay',
      provider_txn_id: providerTxnId,
      amount: amount,
      status: status,
      metadata: metadata,
      created_at: new Date().toISOString()
    }]);

    if (paymentError) {
      console.error('Error inserting payment record', paymentError);
      // proceed but return 500
      return res.status(500).json({ error: 'Failed to insert payment record' });
    }

    // If payment succeeded and metadata contains a user identifier, credit balance
    if (['success', 'completed', 'paid'].includes(String(status).toLowerCase())) {
      const userId = metadata.user_id || metadata.user || null;
      if (userId) {
        // increment user balance by amount (assumes balance column exists and amount is consistent currency)
        const { data: userData, error: userError } = await supabase
          .from('user_profiles')
          .select('id, balance')
          .eq('id', userId)
          .limit(1);

        if (userError) console.error('Error fetching user for credit', userError);

        const user = (userData && userData[0]) || null;
        if (user) {
          const newBalance = Number(user.balance || 0) + amount;
          const { error: updateError } = await supabase
            .from('user_profiles')
            .update({ balance: newBalance })
            .eq('id', userId);

          if (updateError) console.error('Failed to update user balance', updateError);
        }
      }
    }

    // FastPay expects a 200-ish response for success
    return res.json({ ok: true });
  } catch (err) {
    console.error('Webhook handler error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
