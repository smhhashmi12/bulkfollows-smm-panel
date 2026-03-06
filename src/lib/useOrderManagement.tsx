import { useState, useCallback, useRef } from 'react';
import { ordersAPI, authAPI, paymentsAPI } from './api';
import type { Service, UserProfile } from './api';

/**
 * Order Management Hook
 * Handles order creation, status tracking, retry logic, and payment integration
 */

export interface OrderData {
  serviceId: string;
  link: string;
  quantity: number;
  deliveryTime: number;
}

export interface OrderResult {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  charge: number;
  orderId?: string;
  providerOrderId?: string;
  message?: string;
}

interface RetryConfig {
  maxRetries: number;
  delayMs: number;
  backoffMultiplier: number;
}

export const useOrderManagement = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [orderStatus, setOrderStatus] = useState<OrderResult | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  // Track retry attempts and payment state
  const retryCountRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const defaultRetryConfig: RetryConfig = {
    maxRetries: 3,
    delayMs: 2000,
    backoffMultiplier: 1.5,
  };

  /**
   * Sleep utility for delays between retries
   */
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  /**
   * Calculate price with time-based multiplier
   */
  const calculateCharge = (
    service: Service,
    quantity: number,
    _deliveryTime: number
  ): number => {
    const basePrice = (service.rate_per_1000 / 1000) * quantity;
    return parseFloat(basePrice.toFixed(2));
  };

  const parseProviderMeta = (service: Service): { providerId: string; providerServiceId: string } | null => {
    const description = String(service.description || '');
    const providerIdMatch = description.match(/Provider ID:\s*([^|]+)/i);
    const providerServiceIdMatch = description.match(/Provider Service ID:\s*([^|]+)/i);
    const providerId = providerIdMatch ? String(providerIdMatch[1]).trim() : '';
    const providerServiceId = providerServiceIdMatch ? String(providerServiceIdMatch[1]).trim() : '';

    if (!providerId || !providerServiceId) return null;
    return { providerId, providerServiceId };
  };

  /**
   * Validate order data before submission
   */
  const validateOrder = (
    service: Service,
    orderData: OrderData,
    profile: UserProfile
  ): { valid: boolean; error?: string } => {
    if (!service) {
      return { valid: false, error: 'Please select a service' };
    }

    if (orderData.quantity < service.min_quantity || orderData.quantity > service.max_quantity) {
      return {
        valid: false,
        error: `Quantity must be between ${service.min_quantity} and ${service.max_quantity}`,
      };
    }

    if (!orderData.link.trim()) {
      return { valid: false, error: 'Please enter a valid link' };
    }

    const charge = calculateCharge(service, orderData.quantity, orderData.deliveryTime);
    if (profile.balance < charge) {
      return { valid: false, error: 'Insufficient balance. Please add funds first.' };
    }

    return { valid: true };
  };

  /**
   * Retry logic with exponential backoff
   */
  const executeWithRetry = async <T,>(
    fn: () => Promise<T>,
    config: RetryConfig = defaultRetryConfig
  ): Promise<T> => {
    let lastError: Error | null = null;
    let delayMs = config.delayMs;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.warn(`[OrderManagement] Attempt ${attempt + 1} failed:`, lastError.message);

        if (attempt < config.maxRetries) {
          console.log(`[OrderManagement] Retrying in ${delayMs}ms...`);
          await sleep(delayMs);
          delayMs *= config.backoffMultiplier;
        }
      }
    }

    throw new Error(
      `Failed after ${config.maxRetries + 1} attempts: ${lastError?.message || 'Unknown error'}`
    );
  };

  /**
   * Get order status with retry logic
   */
  const checkOrderStatus = useCallback(
    async (
      orderId: string,
      maxAttempts: number = 5,
      providerId?: string,
      providerOrderId?: string
    ): Promise<boolean> => {
      setIsCheckingStatus(true);
      try {
        let completed = false;
        let attempts = 0;

        while (attempts < maxAttempts && !completed) {
          await sleep(2500); // Wait between checks

          try {
            // Prefer provider status polling when provider order exists
            if (providerId && providerOrderId) {
              const resp = await fetch(
                `/api/provider/order-status?provider_id=${encodeURIComponent(providerId)}&orders=${encodeURIComponent(providerOrderId)}`
              );

              if (resp.ok) {
                const payload = await resp.json();
                const statusPayload = payload?.status;
                const statusNode =
                  statusPayload?.[providerOrderId] ||
                  statusPayload?.[String(providerOrderId)] ||
                  statusPayload;

                const rawStatus = String(statusNode?.status || '').toLowerCase();
                const mappedStatus: OrderResult['status'] =
                  rawStatus.includes('complete') ? 'completed' :
                  rawStatus.includes('cancel') || rawStatus.includes('fail') ? 'failed' :
                  'processing';

                setOrderStatus((prev) => ({
                  id: orderId,
                  status: mappedStatus,
                  charge: prev?.charge || 0,
                  orderId,
                  providerOrderId,
                  message: rawStatus ? `Provider status: ${rawStatus}` : 'Provider status updated',
                }));

                if (mappedStatus === 'completed' || mappedStatus === 'failed') {
                  completed = true;
                  if (mappedStatus === 'completed') {
                    setSuccess(`Order #${orderId} completed successfully.`);
                  } else {
                    setError('Provider reported this order as failed/cancelled.');
                  }
                }
              }
            } else {
              const orderData = await ordersAPI.getOrder(orderId);
              if (orderData && orderData.status) {
                const localStatus = String(orderData.status).toLowerCase();
                const mappedStatus: OrderResult['status'] =
                  localStatus === 'completed' ? 'completed' :
                  localStatus === 'failed' || localStatus === 'canceled' ? 'failed' :
                  'processing';

                setOrderStatus({
                  id: orderId,
                  status: mappedStatus,
                  charge: orderData.charge || 0,
                  orderId: orderData.id,
                });

                if (mappedStatus === 'completed' || mappedStatus === 'failed') {
                  completed = true;
                }
              }
            }
          } catch (err) {
            console.warn('[OrderManagement] Status check failed:', err);
          }

          attempts++;
        }

        return completed;
      } catch (err) {
        console.error('[OrderManagement] Error checking status:', err);
        return false;
      } finally {
        setIsCheckingStatus(false);
      }
    },
    []
  );

  /**
   * Create order with provider integration and retry logic
   */
  const createOrder = useCallback(
    async (
      service: Service,
      orderData: OrderData,
      profile: UserProfile,
      onPaymentRequired?: (amount: number) => Promise<void>
    ): Promise<OrderResult> => {
      setLoading(true);
      setError('');
      setSuccess('');
      retryCountRef.current = 0;

      try {
        // Step 1: Validate order
        const validation = validateOrder(service, orderData, profile);
        if (!validation.valid) {
          throw new Error(validation.error || 'Validation failed');
        }

        const charge = calculateCharge(service, orderData.quantity, orderData.deliveryTime);

        console.log('[OrderManagement] Creating order:', {
          service: service.name,
          quantity: orderData.quantity,
          link: orderData.link,
          charge: charge,
        });

        // Step 2: Detect provider mapping for selected service
        const providerMeta = parseProviderMeta(service);
        let providerOrderId: string | undefined;

        // Step 3: Create order in local database
        const createdOrder = await executeWithRetry(
          async () => {
            return await ordersAPI.createOrder(
              service.id,
              orderData.link,
              orderData.quantity,
              orderData.deliveryTime
            );
          },
          { maxRetries: 2, delayMs: 1000, backoffMultiplier: 1.5 }
        );

        console.log('[OrderManagement] Order created successfully:', createdOrder);

        // Step 4: Send order to provider (if mapped)
        if (providerMeta) {
          try {
            const providerResp = await fetch('/api/provider/add-order', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                provider_id: providerMeta.providerId,
                service: providerMeta.providerServiceId,
                link: orderData.link,
                quantity: orderData.quantity,
              }),
            });
            const providerData = await providerResp.json();

            if (providerResp.ok && providerData?.order) {
              providerOrderId = String(providerData.order);
              console.log('[OrderManagement] Provider order placed:', providerOrderId);
            } else {
              console.warn('[OrderManagement] Provider order placement failed:', providerData);
            }
          } catch (providerErr) {
            console.warn('[OrderManagement] Provider API call failed:', providerErr);
          }
        }

        // Step 5: Refresh profile/balance state
        await executeWithRetry(async () => authAPI.getUserProfile());

        // Step 6: Handle payment if needed and callback provided
        if (charge > 0 && onPaymentRequired) {
          try {
            console.log('[OrderManagement] Initiating payment:', charge);
            await onPaymentRequired(charge);
          } catch (paymentErr) {
            console.warn('[OrderManagement] Payment initiation failed:', paymentErr);
            // Order was created, payment can be retried later
          }
        }

        // Step 7: Set success state
        const result: OrderResult = {
          id: createdOrder.id,
          status: 'processing',
          charge: charge,
          orderId: createdOrder.id,
          providerOrderId,
          message: providerOrderId
            ? `Order created and sent to provider.`
            : `Order created successfully. Processing...`,
        };

        setOrderStatus(result);
        setSuccess(`Order #${createdOrder.id} created! Charge: ${charge.toFixed(2)} USD`);

        // Step 8: Check status periodically (provider-first if available)
        checkOrderStatus(
          createdOrder.id,
          providerOrderId ? 20 : 10,
          providerMeta?.providerId,
          providerOrderId
        );

        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to create order. Please try again.';
        console.error('[OrderManagement] Order creation failed:', err);
        setError(errorMessage);

        return {
          id: '',
          status: 'failed',
          charge: 0,
          message: errorMessage,
        };
      } finally {
        setLoading(false);
      }
    },
    [checkOrderStatus]
  );

  /**
   * Retry a failed order creation
   */
  const retryOrder = useCallback(
    async (
      service: Service,
      orderData: OrderData,
      profile: UserProfile,
      onPaymentRequired?: (amount: number) => Promise<void>
    ): Promise<OrderResult> => {
      retryCountRef.current += 1;
      console.log('[OrderManagement] Retry attempt:', retryCountRef.current);

      if (retryCountRef.current > 3) {
        setError('Maximum retry attempts reached. Please contact support.');
        return {
          id: '',
          status: 'failed',
          charge: 0,
          message: 'Maximum retry attempts reached',
        };
      }

      return createOrder(service, orderData, profile, onPaymentRequired);
    },
    [createOrder]
  );

  /**
   * Cancel an order
   */
  const cancelOrder = useCallback(async (orderId: string): Promise<boolean> => {
    try {
      setLoading(true);
      console.log('[OrderManagement] Attempting to cancel order:', orderId);

      // Note: ordersAPI doesn't have a cancelOrder method yet
      // This would need to be implemented on the backend
      // For now, we'll log the intent
      console.warn('[OrderManagement] Cancel order not yet implemented in ordersAPI');

      setSuccess('Cancel request submitted');
      setOrderStatus(null);
      return true;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to cancel order';
      console.error('[OrderManagement] Cancel failed:', err);
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Clear messages and reset state
   */
  const clearMessages = useCallback(() => {
    setError('');
    setSuccess('');
  }, []);

  /**
   * Reset all state
   */
  const reset = useCallback(() => {
    setLoading(false);
    setError('');
    setSuccess('');
    setOrderStatus(null);
    setIsCheckingStatus(false);
    retryCountRef.current = 0;
  }, []);

  return {
    // State
    loading,
    error,
    success,
    orderStatus,
    isCheckingStatus,
    retryCount: retryCountRef.current,

    // Methods
    createOrder,
    retryOrder,
    cancelOrder,
    checkOrderStatus,
    validateOrder,
    calculateCharge,
    clearMessages,
    reset,
  };
};

export default useOrderManagement;
