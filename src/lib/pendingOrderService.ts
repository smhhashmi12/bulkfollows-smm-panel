const PENDING_ORDER_SERVICE_KEY = 'dashboard.pendingOrderServiceId';

export const storePendingOrderServiceId = (serviceId: string) => {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(PENDING_ORDER_SERVICE_KEY, serviceId);
};

export const consumePendingOrderServiceId = (): string | null => {
  if (typeof window === 'undefined') return null;
  const value = window.sessionStorage.getItem(PENDING_ORDER_SERVICE_KEY);
  if (!value) return null;
  window.sessionStorage.removeItem(PENDING_ORDER_SERVICE_KEY);
  return value;
};
