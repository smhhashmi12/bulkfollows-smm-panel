import React, { useState, useEffect } from 'react';
import { paymentsAPI, authAPI } from '../../lib/api';
import { isTimeoutError } from '../../lib/utils';
import type { UserProfile } from '../../lib/api';
import { useCurrency } from '../../lib/CurrencyContext';

const paymentMethods = [
    { name: 'PayFast', icon: '💳', value: 'payfast', region: 'ZA/Global' },
    { name: 'Credit Card', icon: '💰', value: 'credit_card', region: 'Global' },
    { name: 'EasyPaisa', icon: '📱', value: 'easypaisa', region: 'Pakistan' },
    { name: 'PayPal', icon: '🅿️', value: 'paypal', region: 'Global' },
    { name: 'Crypto', icon: '₿', value: 'crypto', region: 'Global' }
];

const AddFundsPage: React.FC = () => {
  const [selectedMethod, setSelectedMethod] = useState<string>('credit_card');
  const [amount, setAmount] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const { formatAmount } = useCurrency();

  useEffect(() => {
    const loadProfile = async () => {
      try {
        console.log('[AddFunds] Loading profile...');
        
        const userProfile = await authAPI.getUserProfile();
        setProfile(userProfile as UserProfile);
      } catch (error: any) {
        console.error('[AddFunds] Failed to load profile:', error);
        setError(isTimeoutError(error) ? 'Request timed out. Please refresh.' : 'Failed to load profile.');
      }
    };
    loadProfile();
  }, []);

  const calculateFee = (amt: number) => {
    return amt * 0.02; // 2% processing fee
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const amountNum = parseFloat(amount);
    
    if (isNaN(amountNum) || amountNum < 5) {
      setError('Minimum deposit is $5.00');
      setLoading(false);
      return;
    }

    if (!profile) {
      setError('User profile not found');
      setLoading(false);
      return;
    }

    try {
      
      // Create payment record
      const payment = await paymentsAPI.createPayment(amountNum, selectedMethod);
      
      // Use server-side API to create payment order
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      let resp: Response;
      try {
        // Choose endpoint based on payment method
        const endpoint = selectedMethod === 'payfast' 
          ? '/api/payments/payfast' 
          : '/api/fastpay/create-order';
        
        resp = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentId: (payment as any).id,
            amount: (payment as any).total,
            customerEmail: profile.email,
            customerName: profile.username,
            returnUrl: `${window.location.origin}/#/dashboard/add-funds?success=true&payment_id=${(payment as any).id}`,
            cancelUrl: `${window.location.origin}/#/dashboard/add-funds?canceled=true&payment_id=${(payment as any).id}`
          }),
          signal: controller.signal,
        });
      } catch (e: any) {
        clearTimeout(timeoutId);
        if (e.name === 'AbortError') {
          throw new Error('Request timeout');
        }
        throw e;
      }
      clearTimeout(timeoutId);
      
      const paymentOrder = await resp.json();

      // Redirect to payment page
      if (paymentOrder && paymentOrder.paymentUrl) {
        window.location.href = paymentOrder.paymentUrl;
      } else {
        throw new Error((paymentOrder && paymentOrder.error) || 'Payment URL not received');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initiate payment. Please try again.');
      setLoading(false);
    }
  };

  const amountNum = parseFloat(amount) || 0;
  const fee = calculateFee(amountNum);
  const total = amountNum + fee;

  return (
    <div className="max-w-2xl mx-auto">
      {error && (
        <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400 text-sm">
          {error}
        </div>
      )}
      <div className="bg-brand-container border border-brand-border rounded-2xl p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Select Payment Method</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {paymentMethods.map(method => (
                        <button
                            key={method.value}
                            type="button"
                            onClick={() => setSelectedMethod(method.value)}
                            className={`bg-black/20 border rounded-lg p-4 flex flex-col items-center justify-center gap-2 transition-all focus:ring-2 focus:ring-brand-accent focus:outline-none ${
                                selectedMethod === method.value
                                    ? 'bg-brand-accent/20 border-brand-accent shadow-purple-glow-sm'
                                    : 'border-brand-border hover:bg-brand-accent/10 hover:border-brand-accent'
                            }`}
                        >
                            <span className="text-3xl">{method.icon}</span>
                            <span className="text-xs font-semibold text-center">{method.name}</span>
                            <span className="text-xs text-gray-400">{method.region}</span>
                        </button>
                    ))}
                </div>
            </div>
             <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-300 mb-2">Amount ($)</label>
                <input
                    type="number"
                    id="amount"
                    name="amount"
                    step="0.01"
                    min="5"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="10.00"
                    required
                    className="w-full bg-brand-input border border-brand-border rounded-lg p-3 text-white placeholder-slate-400 focus:ring-2 focus:ring-brand-purple focus:outline-none"
                />
                <p className="text-xs text-gray-400 mt-2">Minimum deposit: $5.00. A 2% processing fee will be applied.</p>
            </div>
            {amountNum > 0 && (
                <div className="bg-black/20 border border-brand-border rounded-lg p-4 text-sm space-y-2">
                    <div className="flex justify-between"><span>Amount to Deposit:</span><span>{formatAmount(amountNum)}</span></div>
                    <div className="flex justify-between"><span>Processing Fee (2%):</span><span>{formatAmount(fee)}</span></div>
                    <hr className="border-brand-border"/>
                    <div className="flex justify-between font-bold text-lg"><span>Total to Pay:</span><span>{formatAmount(total)}</span></div>
                </div>
            )}
            <div>
              <button
                type="submit"
                disabled={loading || amountNum < 5}
                className="w-full bg-gradient-to-r from-brand-accent to-brand-purple hover:opacity-90 transition-opacity text-white font-semibold p-3 rounded-lg shadow-purple-glow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Proceed to Payment'}
              </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default AddFundsPage;
