// FastPay Payment Integration
// FastPay API Documentation: https://fastpay.com/docs

interface FastPayConfig {
  merchantId: string;
  apiKey: string;
  baseUrl?: string;
}

interface FastPayOrderRequest {
  amount: number;
  currency?: string;
  orderId: string;
  customerEmail: string;
  customerName?: string;
  returnUrl: string;
  cancelUrl: string;
  notifyUrl?: string;
}

interface FastPayOrderResponse {
  success: boolean;
  orderId: string;
  paymentUrl: string;
  transactionId?: string;
  message?: string;
}

class FastPayClient {
  private merchantId: string;
  private apiKey: string;
  private baseUrl: string;

  constructor(config: FastPayConfig) {
    this.merchantId = config.merchantId;
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.fastpay.com/v1';
  }

  async createOrder(request: FastPayOrderRequest): Promise<FastPayOrderResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Merchant-Id': this.merchantId,
        },
        body: JSON.stringify({
          amount: request.amount,
          currency: request.currency || 'USD',
          order_id: request.orderId,
          customer_email: request.customerEmail,
          customer_name: request.customerName,
          return_url: request.returnUrl,
          cancel_url: request.cancelUrl,
          notify_url: request.notifyUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create FastPay order');
      }

      return {
        success: true,
        orderId: data.order_id,
        paymentUrl: data.payment_url,
        transactionId: data.transaction_id,
        message: data.message,
      };
    } catch (error) {
      console.error('FastPay API Error:', error);
      throw error;
    }
  }

  async verifyPayment(transactionId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/payments/verify/${transactionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Merchant-Id': this.merchantId,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return false;
      }

      return data.status === 'completed' || data.status === 'success';
    } catch (error) {
      console.error('FastPay Verification Error:', error);
      return false;
    }
  }

  async getPaymentStatus(transactionId: string) {
    try {
      const response = await fetch(`${this.baseUrl}/payments/${transactionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Merchant-Id': this.merchantId,
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('FastPay Status Error:', error);
      throw error;
    }
  }

  // New method for webhook handling
  async handleWebhook(payload: any) {
    // Implement webhook processing logic here
    // For example, verify signature, update payment status, etc.
  }
}

// Initialize FastPay client
export const getFastPayClient = (): FastPayClient => {
  // When running server-side (Node), prefer process.env.FASTPAY_API_KEY and process.env.FASTPAY_MERCHANT_ID
  const isNode = typeof window === 'undefined';
  const merchantId = (isNode ? process.env.FASTPAY_MERCHANT_ID : import.meta.env.VITE_FASTPAY_MERCHANT_ID) || '';
  // Never attempt to pull a private API key into the client bundle.
  const apiKey = (isNode ? process.env.FASTPAY_API_KEY : '') || '';

  if (!merchantId || !apiKey) {
    if (isNode && !apiKey) {
      console.warn('FastPay private API key not configured in server environment. Ensure FASTPAY_API_KEY is set in server/.env.local or host env.');
    } else if (!isNode && apiKey) {
      console.warn('Detected a FastPay API key in client env (Vite). Do NOT include private API keys in client builds. Use the public merchant ID and server-side calls for private actions.');
    } else {
      console.warn('FastPay credentials not configured');
    }
  }

  return new FastPayClient({
    merchantId,
    apiKey,
    baseUrl: import.meta.env.VITE_FASTPAY_BASE_URL || 'https://api.fastpay.com/v1',
  });
};

export { FastPayClient };
export type { FastPayOrderRequest, FastPayOrderResponse };
