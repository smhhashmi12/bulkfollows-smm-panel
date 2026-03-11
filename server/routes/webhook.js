import express from 'express';
import crypto from 'crypto';
import { supabaseAdmin, supabaseAdminConfigured } from '../lib/supabaseServer.js';
import { successResponse, errorResponse, asyncHandler } from '../lib/apiResponse.js';

const router = express.Router();

const normalizePaymentStatus = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (['success', 'completed', 'complete', 'paid'].includes(normalized)) return 'completed';
  if (['failed', 'failure', 'error'].includes(normalized)) return 'failed';
  if (['canceled', 'cancelled'].includes(normalized)) return 'canceled';
  return 'pending';
};

async function findPaymentRecord(paymentId, fastpayOrderId, transactionId) {
  const lookups = [
    ['id', paymentId],
    ['fastpay_order_id', fastpayOrderId],
    ['transaction_id', transactionId],
  ];

  for (const [column, rawValue] of lookups) {
    const value = String(rawValue || '').trim();
    if (!value) continue;

    const { data, error } = await supabaseAdmin
      .from('payments')
      .select('id, user_id, amount, status, transaction_id, fastpay_order_id, metadata')
      .eq(column, value)
      .maybeSingle();

    if (error) throw error;
    if (data) return data;
  }

  return null;
}

// FastPay webhook receiver
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const payload = req.body || {};
    const signature = req.headers['x-fastpay-signature'] || req.headers['x-signature'];
    const secret = process.env.FASTPAY_WEBHOOK_SECRET;

    // If a webhook secret is provided, attempt to verify HMAC-SHA256 signature
    if (secret && signature) {
      const computed = crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
      if (computed !== signature) {
        console.warn('Invalid FastPay webhook signature', { computed, signature });
        return res.status(400).json(errorResponse('INVALID_SIGNATURE', 'Invalid signature'));
      }
    }

    const providerTxnId = payload.transaction_id || payload.id || payload.txn_id || null;
    const fastpayOrderId = payload.order_id || payload.reference || payload.order || null;
    const metadata = payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {};
    const paymentId = payload.payment_id || metadata.payment_id || fastpayOrderId || null;
    const status = normalizePaymentStatus(payload.status || payload.event || 'pending');
    const amount = Number(payload.amount || 0);

    // If Supabase isn't configured, skip DB work but accept the webhook so payment provider won't retry
    if (!supabaseAdminConfigured || !supabaseAdmin) {
      console.warn('Received webhook but Supabase not configured; skipping DB insert.');
      return res.json(successResponse({ note: 'Supabase not configured; webhook accepted but not processed.' }));
    }

    const paymentRecord = await findPaymentRecord(paymentId, fastpayOrderId, providerTxnId);
    if (!paymentRecord) {
      console.warn('FastPay webhook received for unknown payment', {
        paymentId,
        fastpayOrderId,
        providerTxnId,
      });
      return res.json(successResponse({ note: 'No matching payment record found.' }));
    }

    const mergedMetadata = {
      ...(paymentRecord.metadata && typeof paymentRecord.metadata === 'object' ? paymentRecord.metadata : {}),
      fastpay_webhook: payload,
    };

    const { data: updatedPayment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .update({
        status,
        transaction_id: providerTxnId || paymentRecord.transaction_id,
        fastpay_order_id: fastpayOrderId || paymentRecord.fastpay_order_id,
        metadata: mergedMetadata,
      })
      .eq('id', paymentRecord.id)
      .select('id, user_id, amount, status')
      .single();

    if (paymentError) {
      console.error('Error updating payment record from webhook', paymentError);
      return res.status(500).json(errorResponse('UPDATE_FAILED', 'Failed to update payment record'));
    }

    if (status === 'completed' && paymentRecord.status !== 'completed') {
      const { data: userProfile, error: userError } = await supabaseAdmin
        .from('user_profiles')
        .select('id, balance')
        .eq('id', paymentRecord.user_id)
        .single();

      if (userError) {
        console.error('Error fetching user for balance credit', userError);
      } else if (userProfile) {
        const creditAmount = Number(updatedPayment.amount || paymentRecord.amount || amount || 0);
        const { error: updateError } = await supabaseAdmin
          .from('user_profiles')
          .update({ balance: Number(userProfile.balance || 0) + creditAmount })
          .eq('id', paymentRecord.user_id);

        if (updateError) {
          console.error('Failed to update user balance', updateError);
        }
      }
    }

    // FastPay expects a 200-ish response for success
    return res.json(successResponse({ paymentId: updatedPayment.id, status }));
  })
);

export default router;
