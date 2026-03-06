/**
 * Provider API Bridge Client
 * 
 * React should ONLY call our backend endpoints, never DaoSMM directly
 * Our backend acts as a secure proxy to DaoSMM API
 */

export const providerAPI = {
  /**
   * Get services from provider
   * @param {string} providerId - Provider UUID
   * @returns {Promise<array>} Array of services
   */
  async getServices(providerId: string) {
    try {
      const response = await fetch(`/api/provider/services?provider_id=${providerId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch services: ${response.statusText}`);
      }
      const data = await response.json();
      return data.services || [];
    } catch (error) {
      console.error('[Provider API] Get services error:', error);
      throw error;
    }
  },

  /**
   * Create new order with provider
   * @param {string} providerId - Provider UUID
   * @param {object} order - Order details { service, link, quantity, runs?, interval? }
   * @returns {Promise<object>} Order response with order ID
   */
  async addOrder(providerId: string, order: {
    service: number;
    link: string;
    quantity: number;
    runs?: number;
    interval?: number;
  }) {
    try {
      const response = await fetch('/api/provider/add-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_id: providerId,
          ...order,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create order');
      }

      const data = await response.json();
      console.log('[Provider API] Order created:', data.order);
      return data;
    } catch (error) {
      console.error('[Provider API] Add order error:', error);
      throw error;
    }
  },

  /**
   * Get order status from provider
   * @param {string} providerId - Provider UUID
   * @param {string|number|array} orders - Single order ID or comma-separated IDs
   * @returns {Promise<object>} Order status data
   */
  async getOrderStatus(providerId: string, orders: string | number | number[]) {
    try {
      const orderString = Array.isArray(orders) ? orders.join(',') : String(orders);
      
      const response = await fetch(
        `/api/provider/order-status?provider_id=${providerId}&orders=${encodeURIComponent(orderString)}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch order status: ${response.statusText}`);
      }

      const data = await response.json();
      return data.status;
    } catch (error) {
      console.error('[Provider API] Get order status error:', error);
      throw error;
    }
  },

  /**
   * Get provider account balance
   * @param {string} providerId - Provider UUID
   * @returns {Promise<object>} Balance and currency
   */
  async getBalance(providerId: string) {
    try {
      const response = await fetch(`/api/provider/balance?provider_id=${providerId}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch balance');
      }

      const data = await response.json();
      return {
        balance: data.balance,
        currency: data.currency,
      };
    } catch (error) {
      console.error('[Provider API] Get balance error:', error);
      throw error;
    }
  },

  /**
   * Create refill for order(s)
   * @param {string} providerId - Provider UUID
   * @param {string|number|array} orders - Single order ID or comma-separated IDs
   * @returns {Promise<object>} Refill response
   */
  async createRefill(providerId: string, orders: string | number | number[]) {
    try {
      const orderString = Array.isArray(orders) ? orders.join(',') : String(orders);

      const response = await fetch('/api/provider/refill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_id: providerId,
          orders: orderString,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create refill');
      }

      const data = await response.json();
      console.log('[Provider API] Refill created:', data.refill);
      return data;
    } catch (error) {
      console.error('[Provider API] Create refill error:', error);
      throw error;
    }
  },

  /**
   * Cancel order(s)
   * @param {string} providerId - Provider UUID
   * @param {string|number|array} orders - Single order ID or comma-separated IDs
   * @returns {Promise<object>} Cancel response
   */
  async cancelOrder(providerId: string, orders: string | number | number[]) {
    try {
      const orderString = Array.isArray(orders) ? orders.join(',') : String(orders);

      const response = await fetch('/api/provider/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_id: providerId,
          orders: orderString,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cancel order');
      }

      const data = await response.json();
      console.log('[Provider API] Order cancelled:', data.cancel);
      return data;
    } catch (error) {
      console.error('[Provider API] Cancel order error:', error);
      throw error;
    }
  },
};

export default providerAPI;
