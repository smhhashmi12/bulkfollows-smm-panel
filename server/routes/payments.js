import express from 'express';
import crypto from 'crypto';
import { supabase, supabaseConfigured } from '../lib/supabaseServer.js';

const router = express.Router();

// Helper function to generate PayFast signature
function generatePayFastSignature(data, passphrase) {
  const signatureString = Object.keys(data)
    .sort()
    .map(key => `${key}=${encodeURIComponent(String(data[key]))}`)
    .join('&');
  
  const signatureWithPassphrase = passphrase 
    ? `${signatureString}&passphrase=${encodeURIComponent(passphrase)}`
    : signatureString;
  
  return crypto.createHash('md5').update(signatureWithPassphrase).digest('hex');
}

// Helper function to validate PayFast webhook signature
function validatePayFastSignature(data, passphrase) {
  const receivedSignature = data.signature;
  
  const dataForSignature = { ...data };
  delete dataForSignature.signature;
  
  const signatureString = Object.keys(dataForSignature)
    .sort()
    .map(key => `${key}=${encodeURIComponent(String(dataForSignature[key]))}`)
    .join('&');
  
  const signatureWithPassphrase = passphrase
    ? `${signatureString}&passphrase=${encodeURIComponent(passphrase)}`
    : signatureString;
  
  const calculatedSignature = crypto.createHash('md5').update(signatureWithPassphrase).digest('hex');
  
  return calculatedSignature === receivedSignature;
}

// POST /api/payments/payfast
// Create PayFast payment order
router.post('/payfast', async (req, res) => {
  try {
    const { paymentId, amount, customerEmail, customerName, returnUrl, cancelUrl } = req.body || {};

    // Validate required fields
    if (!paymentId || !amount || !customerEmail) {
      return res.status(400).json({ 
        success: false,
        error: 'Missing required fields: paymentId, amount, customerEmail' 
      });
    }

    // Get PayFast credentials from environment
    const PAYFAST_MERCHANT_ID = process.env.PAYFAST_MERCHANT_ID;
    const PAYFAST_MERCHANT_KEY = process.env.PAYFAST_MERCHANT_KEY;
    const PAYFAST_PASSPHRASE = process.env.PAYFAST_PASSPHRASE;
    const PAYFAST_BASE_URL = process.env.PAYFAST_BASE_URL || 'https://www.payfast.co.za';

    if (!PAYFAST_MERCHANT_ID || !PAYFAST_MERCHANT_KEY) {
      console.error('PayFast credentials not configured on server');
      return res.status(500).json({ 
        success: false,
        error: 'Payment gateway not configured. Please contact support.' 
      });
    }

    // Prepare PayFast data
    const payFastData = {
      merchant_id: PAYFAST_MERCHANT_ID,
      merchant_key: PAYFAST_MERCHANT_KEY,
      return_url: returnUrl,
      cancel_url: cancelUrl,
      notify_url: `${process.env.APP_URL || 'http://localhost:3001'}/api/payments/payfast-webhook`,
      name_first: customerName?.split(' ')[0] || 'User',
      name_last: customerName?.split(' ').slice(1).join(' ') || 'Account',
      email_address: customerEmail,
      m_payment_id: paymentId,
      amount: parseFloat(amount.toFixed(2)),
      item_name: 'Account Credits',
      item_description: `Add funds to account - Order ${paymentId}`,
      custom_int1: Math.floor(Date.now() / 1000),
      custom_str1: paymentId,
      email_confirmation: 1,
      confirmation_address: customerEmail,
    };

    // Generate signature
    payFastData.signature = generatePayFastSignature(payFastData, PAYFAST_PASSPHRASE);

    // Build PayFast payment URL
    const payFastUrl = `${PAYFAST_BASE_URL}/eng/process`;
    const formData = Object.keys(payFastData)
      .map(key => `${key}=${encodeURIComponent(String(payFastData[key]))}`)
      .join('&');

    const paymentUrl = `${payFastUrl}?${formData}`;

    console.log(`✅ PayFast payment order created - Payment ID: ${paymentId}, Amount: ${amount}`);

    return res.status(200).json({
      success: true,
      orderId: paymentId,
      paymentUrl
    });

  } catch (error) {
    console.error('PayFast payment creation error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to create PayFast payment'
    });
  }
});

// POST /api/payments/payfast-webhook
// Handle PayFast payment notifications
router.post('/payfast-webhook', async (req, res) => {
  try {
    const webhookData = req.body;
    const PAYFAST_PASSPHRASE = process.env.PAYFAST_PASSPHRASE || '';
    const PAYFAST_MERCHANT_ID = process.env.PAYFAST_MERCHANT_ID;

    // Validate merchant ID
    if (webhookData.merchant_id !== PAYFAST_MERCHANT_ID) {
      console.error('Invalid merchant ID in PayFast webhook');
      return res.status(400).json({ success: false, error: 'Invalid merchant ID' });
    }

    // Validate signature
    if (!validatePayFastSignature(webhookData, PAYFAST_PASSPHRASE)) {
      console.error('Invalid PayFast webhook signature');
      return res.status(400).json({ success: false, error: 'Invalid signature' });
    }

    const paymentId = webhookData.custom_str1 || webhookData.m_payment_id;
    const paymentStatus = webhookData.payment_status;

    console.log(`📨 PayFast webhook received - Payment ID: ${paymentId}, Status: ${paymentStatus}`);

    // Handle different payment statuses
    if (paymentStatus === 'COMPLETE') {
      console.log(`✅ Payment ${paymentId} completed successfully`);
      
      // TODO: Update payment record in database with status: 'completed'
      // TODO: Add funds to user account
      // if (supabaseConfigured && supabase) {
      //   await supabase
      //     .from('payments')
      //     .update({ status: 'completed', payfast_transaction_id: webhookData.pf_payment_id })
      //     .eq('id', paymentId);
      // }
      
      return res.status(200).json({ success: true, message: 'Payment processed successfully' });

    } else if (paymentStatus === 'PENDING') {
      console.log(`⏳ Payment ${paymentId} is pending`);
      return res.status(200).json({ success: true, message: 'Payment pending' });

    } else if (paymentStatus === 'FAILED') {
      console.log(`❌ Payment ${paymentId} failed`);
      // TODO: Update payment record with status: 'failed'
      return res.status(200).json({ success: true, message: 'Payment failed' });

    } else if (paymentStatus === 'CANCELLED') {
      console.log(`🚫 Payment ${paymentId} was cancelled`);
      // TODO: Update payment record with status: 'cancelled'
      return res.status(200).json({ success: true, message: 'Payment cancelled' });
    }

    return res.status(200).json({ success: true, message: `Webhook handled for status: ${paymentStatus}` });

  } catch (error) {
    console.error('PayFast webhook error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Webhook processing failed'
    });
  }
});

export default router;
