import { getSessionUser, supabase, withSupabaseTimeout } from './supabase';
import type { User } from '../App';

const PROVIDER_SERVICES_TIMEOUT_MS = 5000;
const PROVIDER_SERVICES_CACHE_TTL_MS = 60000;
const PROVIDER_SERVICES_FAILURE_BACKOFF_MS = 15000;
const PROVIDER_SERVICE_LINK_TIMEOUT_MS = 8000;
const AUTH_LOOKUP_TIMEOUT_MS = 8000;
const SUPABASE_QUERY_TIMEOUT_MS = 12000;

let providerServicesCache: any[] = [];
let providerServicesCacheExpiresAt = 0;
let providerServicesFailureBackoffUntil = 0;

export interface ProviderServiceLink {
  providerId: string;
  providerServiceId: string;
}

function extractProviderLinkFromDescription(description: string | null | undefined): ProviderServiceLink | null {
  const text = String(description || '');
  const providerIdMatch = text.match(/Provider ID:\s*([^|]+)/i);
  const providerServiceIdMatch = text.match(/Provider Service ID:\s*([^|]+)/i);
  const providerId = providerIdMatch ? String(providerIdMatch[1]).trim() : '';
  const providerServiceId = providerServiceIdMatch ? String(providerServiceIdMatch[1]).trim() : '';

  if (!providerId || !providerServiceId) return null;
  return { providerId, providerServiceId };
}

async function fetchProviderServiceLink(serviceId: string): Promise<ProviderServiceLink | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PROVIDER_SERVICE_LINK_TIMEOUT_MS);

  try {
    const response = await fetch(
      `/api/integrations/provider-service-link?service_id=${encodeURIComponent(serviceId)}`,
      { signal: controller.signal }
    );

    if (!response.ok) {
      throw new Error(
        `Failed to resolve provider link: ${response.status} ${response.statusText}`
      );
    }

    const payload = await response.json();
    const providerLink = payload?.providerLink;
    const providerId = String(
      providerLink?.provider_id || providerLink?.providerId || ''
    ).trim();
    const providerServiceId = String(
      providerLink?.provider_service_id || providerLink?.providerServiceId || ''
    ).trim();

    if (!providerId || !providerServiceId) {
      return null;
    }

    return { providerId, providerServiceId };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.warn('[servicesAPI] provider-service-link request timed out during order submit');
    } else {
      console.error('[servicesAPI] provider-service-link request failed:', error);
    }

    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function getAuthenticatedUser() {
  const user = await getSessionUser(AUTH_LOOKUP_TIMEOUT_MS);
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user;
}

async function runSupabaseQuery<T>(operation: PromiseLike<T>, label: string) {
  return withSupabaseTimeout(operation, label, SUPABASE_QUERY_TIMEOUT_MS);
}

async function getProviderServicesSnapshot() {
  const now = Date.now();

  if (providerServicesCacheExpiresAt > now) {
    return providerServicesCache;
  }

  if (providerServicesFailureBackoffUntil > now) {
    return [];
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PROVIDER_SERVICES_TIMEOUT_MS);

  try {
    const response = await fetch('/api/integrations/provider-services', {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch provider services: ${response.status} ${response.statusText}`);
    }

    const payload = await response.json();
    const providerServices = Array.isArray(payload?.providerServices) ? payload.providerServices : [];

    providerServicesCache = providerServices;
    providerServicesCacheExpiresAt = Date.now() + PROVIDER_SERVICES_CACHE_TTL_MS;
    providerServicesFailureBackoffUntil = 0;

    return providerServices;
  } catch (error) {
    providerServicesFailureBackoffUntil = Date.now() + PROVIDER_SERVICES_FAILURE_BACKOFF_MS;

    if (error instanceof DOMException && error.name === 'AbortError') {
      console.warn('[servicesAPI] provider-services request timed out; using regular services only');
    } else {
      console.error('[servicesAPI] provider-services request failed:', error);
    }

    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  api_key?: string | null;
  role: 'user' | 'admin';
  balance: number;
  total_spent: number;
  created_at: string;
}

export interface Service {
  id: string;
  name: string;
  category: string;
  description: string | null;
  rate_per_1000: number;
  min_quantity: number;
  max_quantity: number;
  completion_time?: number | null; // hours to complete
  time_pricing?: Record<number, number> | null; // { hours: multiplier } e.g. { 6: 2.0, 12: 1.5, 24: 1.0, 48: 0.8, 72: 0.7 }
  status: 'active' | 'inactive';
}

export interface Order {
  id: string;
  user_id: string;
  service_id: string;
  provider_id?: string | null;
  link: string;
  quantity: number;
  charge: number;
  delivery_time?: number | null; // hours selected by user
  status: 'pending' | 'processing' | 'completed' | 'canceled' | 'failed';
  provider_order_id?: string | null;
  start_count?: number | null;
  remains?: number | null;
  created_at: string;
  service?: Service;
}

export interface Payment {
  id: string;
  user_id: string;
  amount: number;
  fee: number;
  total: number;
  payment_method: string;
  payment_provider: string;
  transaction_id: string | null;
  status: 'pending' | 'completed' | 'failed' | 'canceled';
  fastpay_order_id: string | null;
  created_at: string;
}

export interface Provider {
  id: string;
  name: string;
  api_url: string;
  api_key: string;
  api_secret?: string;
  balance: number;
  markup_percentage?: number | null;
  status: 'active' | 'inactive' | 'error';
  last_sync?: string;
  created_at?: string;
}

// Auth Functions
export const authAPI = {
  async signInWithGoogle(redirectHash = '#/dashboard/new-order') {
    const redirectUrl = new URL(window.location.pathname || '/', window.location.origin);
    redirectUrl.hash = redirectHash.startsWith('#') ? redirectHash : `#${redirectHash}`;

    const { data, error } = await runSupabaseQuery(
      supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl.toString(),
          queryParams: {
            prompt: 'select_account',
          },
        },
      }),
      'auth google sign in'
    );

    if (error) throw error;
    return data;
  },

  async signUp(email: string, password: string, username: string) {
    const { data, error } = await runSupabaseQuery(
      supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
          },
        },
      }),
      'auth sign up'
    );

    if (error) throw error;

    // Update username in profile
    if (data.user) {
      const { error: profileError } = await runSupabaseQuery(
        supabase
          .from('user_profiles')
          .update({ username })
          .eq('id', data.user.id),
        'auth sign up profile update'
      );

      if (profileError) {
        throw profileError;
      }
    }

    return data;
  },

  async signIn(email: string, password: string) {
    const res = await runSupabaseQuery(
      supabase.auth.signInWithPassword({
        email,
        password,
      }),
      'auth sign in'
    );

    // supabase-js returns shape { data, error }
    // Normalize and provide more actionable error messages for the UI and logs
    // so callers can display useful diagnostics when auth fails (e.g. 400 responses).
    // If there's an error object, attach status and details where available.
    // Throw a plain Error to keep consumers simple.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyRes: any = res;
    if (anyRes.error) {
      const err = anyRes.error;
      const status = err.status || (err.raw && err.raw.status) || undefined;
      const message = err.message || err.msg || JSON.stringify(err);
      const detail = anyRes?.error?.details || anyRes?.error?.hint || anyRes?.error?.message;
      const full = status ? `(${status}) ${message}` : message;
      const errObj = new Error(full + (detail ? ` — ${detail}` : ''));
      // Attach original response for debugging if needed
      (errObj as any).supabase = anyRes;
      throw errObj;
    }

    return anyRes.data;
  },

  async signOut() {
    const { error } = await runSupabaseQuery(supabase.auth.signOut(), 'auth sign out');
    if (error) throw error;
  },

  async getCurrentUser(): Promise<User | null> {
    const user = await getSessionUser(AUTH_LOOKUP_TIMEOUT_MS);
    if (!user) return null;

    const { data: profile, error } = await runSupabaseQuery(
      supabase
        .from('user_profiles')
        .select('username, role')
        .eq('id', user.id)
        .maybeSingle(),
      'auth current user profile'
    );

    if (error) throw error;

    if (!profile) return null;

    return {
      id: user.id,
      username: profile.username,
      role: profile.role,
    };
  },

  async getUserProfile(): Promise<UserProfile | null> {
    const user = await getSessionUser(AUTH_LOOKUP_TIMEOUT_MS);
    if (!user) return null;

    const { data: profile, error } = await runSupabaseQuery(
      supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle(),
      'auth user profile'
    );

    if (error) throw error;

    return profile;
  },
};

// Services Functions
export const servicesAPI = {
  async getServices(category?: string) {
    let query = supabase
      .from('services')
      .select('*')
      .eq('status', 'active')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await runSupabaseQuery(query, 'services list');
    if (error) throw error;
    return data as Service[];
  },

  async getService(id: string) {
    const { data, error } = await runSupabaseQuery(
      supabase
        .from('services')
        .select('*')
        .eq('id', id)
        .single(),
      'service detail'
    );

    if (error) throw error;
    return data as Service;
  },

  // Get merged services (regular services + provider services)
  async getMergedServices(category?: string) {
    try {
      const [regularServices, providerServices] = await Promise.all([
        this.getServices(category),
        getProviderServicesSnapshot(),
      ]);

      if (!providerServices.length) {
        return regularServices;
      }

      const providerByServiceId = new Map<string, any>();
      const providerByProviderServiceId = new Map<string, any>();
      (providerServices || []).forEach((ps: any) => {
        const serviceId = String(ps?.service_id || '').trim();
        if (!serviceId || providerByServiceId.has(serviceId)) return;
        providerByServiceId.set(serviceId, ps);
      });
      (providerServices || []).forEach((ps: any) => {
        const providerServiceId = String(ps?.provider_service_id || '').trim();
        if (!providerServiceId || providerByProviderServiceId.has(providerServiceId)) return;
        providerByProviderServiceId.set(providerServiceId, ps);
      });

      const mergedServices: Service[] = regularServices.map((service) => {
        let providerInfo = providerByServiceId.get(service.id);
        if (!providerInfo) {
          const match = String(service.description || '').match(/Provider Service ID:\s*([^|]+)/i);
          const providerServiceIdFromDescription = match ? String(match[1]).trim() : '';
          if (providerServiceIdFromDescription) {
            providerInfo = providerByProviderServiceId.get(providerServiceIdFromDescription);
          }
        }
        if (!providerInfo) return service;

        const detailParts = [
          service.description || '',
          `Provider ID: ${providerInfo.provider_id}`,
          `Provider Service ID: ${providerInfo.provider_service_id}`,
          `Provider Rate: ${providerInfo.provider_rate}`,
          `Our Rate: ${providerInfo.our_rate}`,
          `Min: ${providerInfo.min_quantity ?? service.min_quantity}`,
          `Max: ${providerInfo.max_quantity ?? service.max_quantity}`,
        ].filter(Boolean);

        return {
          ...service,
          description: detailParts.join(' | '),
          rate_per_1000: Number(providerInfo.our_rate ?? service.rate_per_1000),
          min_quantity: Number(providerInfo.min_quantity ?? service.min_quantity),
          max_quantity: Number(providerInfo.max_quantity ?? service.max_quantity),
        };
      });

      // Filter by category if provided
      if (category) {
        return mergedServices.filter(s => s.category === category);
      }

      return mergedServices;
    } catch (error) {
      console.error('Error in getMergedServices:', error);
      return this.getServices(category);
    }
  },

  async resolveProviderLink(service: Pick<Service, 'id' | 'description'>): Promise<ProviderServiceLink | null> {
    const fromDescription = extractProviderLinkFromDescription(service.description);
    if (fromDescription) {
      return fromDescription;
    }

    const cachedProviderService = (await getProviderServicesSnapshot()).find((item: any) => {
      return String(item?.service_id || '').trim() === String(service.id).trim();
    });

    if (cachedProviderService?.provider_id && cachedProviderService?.provider_service_id) {
      return {
        providerId: String(cachedProviderService.provider_id).trim(),
        providerServiceId: String(cachedProviderService.provider_service_id).trim(),
      };
    }

    return fetchProviderServiceLink(service.id);
  },
};

// Orders Functions
export const ordersAPI = {
  async createOrder(
    serviceId: string,
    link: string,
    quantity: number,
    deliveryTime: number = 24,
    providerId?: string,
    providerOrderId?: string,
    initialStatus: Order['status'] = 'pending',
    chargeOverride?: number
  ) {
    const user = await getAuthenticatedUser();
    let charge = Number.isFinite(chargeOverride) ? Number(chargeOverride) : NaN;

    if (!Number.isFinite(charge)) {
      const service = await servicesAPI.getService(serviceId);
      charge = (service.rate_per_1000 / 1000) * quantity;
    }

    // Check user balance
    const profile = await authAPI.getUserProfile();
    if (!profile || profile.balance < charge) {
      throw new Error('Insufficient balance');
    }

    // Create order with delivery time
    const { data, error } = await runSupabaseQuery(
      supabase
        .from('orders')
        .insert({
          user_id: user.id,
          service_id: serviceId,
          provider_id: providerId || null,
          provider_order_id: providerOrderId || null,
          link,
          quantity,
          charge,
          delivery_time: deliveryTime,
          status: initialStatus,
        })
        .select()
        .single(),
      'create order'
    );

    if (error) throw error;

    // Deduct balance and update spent
    const { error: balanceError } = await runSupabaseQuery(
      supabase
        .from('user_profiles')
        .update({
          balance: profile.balance - charge,
          total_spent: profile.total_spent + charge,
        })
        .eq('id', user.id),
      'order balance update'
    );

    if (balanceError) throw balanceError;

    return data as Order;
  },

  async getOrders() {
    const user = await getAuthenticatedUser();

    const { data, error } = await runSupabaseQuery(
      supabase
        .from('orders')
        .select(`
          *,
          service:services(*)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      'user orders list'
    );

    if (error) throw error;
    return data as Order[];
  },

  async getOrder(id: string) {
    const { data, error } = await runSupabaseQuery(
      supabase
        .from('orders')
        .select(`
          *,
          service:services(*)
        `)
        .eq('id', id)
        .single(),
      'order detail'
    );

    if (error) throw error;
    return data as Order;
  },
};

// Payments Functions
export const paymentsAPI = {
  async createPayment(amount: number, paymentMethod: string) {
    const user = await getAuthenticatedUser();

    const fee = amount * 0.02; // 2% processing fee
    const total = amount + fee;

    const { data, error } = await runSupabaseQuery(
      supabase
        .from('payments')
        .insert({
          user_id: user.id,
          amount,
          fee,
          total,
          payment_method: paymentMethod,
          payment_provider: 'fastpay',
        })
        .select()
        .single(),
      'create payment'
    );

    if (error) throw error;
    return data as Payment;
  },

  async getPayments() {
    const user = await getAuthenticatedUser();

    const { data, error } = await runSupabaseQuery(
      supabase
        .from('payments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      'user payments list'
    );

    if (error) throw error;
    return data as Payment[];
  },

  async updatePaymentStatus(paymentId: string, status: Payment['status'], transactionId?: string, fastpayOrderId?: string) {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (transactionId) {
      updateData.transaction_id = transactionId;
    }

    if (fastpayOrderId) {
      updateData.fastpay_order_id = fastpayOrderId;
    }

    const { data, error } = await runSupabaseQuery(
      supabase
        .from('payments')
        .update(updateData)
        .eq('id', paymentId)
        .select()
        .single(),
      'payment status update'
    );

    if (error) throw error;

    // If payment completed, update user balance
    if (status === 'completed') {
      const payment = data as Payment;
      const { data: profileData, error: profileError } = await runSupabaseQuery(
        supabase
          .from('user_profiles')
          .select('balance')
          .eq('id', payment.user_id)
          .single(),
        'payment profile lookup'
      );

      if (profileError) throw profileError;

      if (profileData) {
        const { error: updateBalanceError } = await runSupabaseQuery(
          supabase
            .from('user_profiles')
            .update({
              balance: profileData.balance + payment.amount,
            })
            .eq('id', payment.user_id),
          'payment balance credit'
        );

        if (updateBalanceError) throw updateBalanceError;
      }
    }

    return data as Payment;
  },
};

// Admin API Functions
export const adminAPI = {
  // User Management
  async getAllUsers() {
    const { data, error } = await runSupabaseQuery(
      supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false }),
      'admin users list'
    );
    if (error) throw error;
    return data as UserProfile[];
  },

  async updateUserBalance(userId: string, balance: number) {
    const { data, error } = await runSupabaseQuery(
      supabase
        .from('user_profiles')
        .update({ balance })
        .eq('id', userId)
        .select()
        .single(),
      'admin user balance update'
    );
    if (error) throw error;
    return data as UserProfile;
  },

  async updateUserRole(userId: string, role: 'user' | 'admin') {
    const { data, error } = await runSupabaseQuery(
      supabase
        .from('user_profiles')
        .update({ role })
        .eq('id', userId)
        .select()
        .single(),
      'admin user role update'
    );
    if (error) throw error;
    return data as UserProfile;
  },

  async deleteUser(userId: string) {
    const { error } = await runSupabaseQuery(
      supabase
        .from('user_profiles')
        .delete()
        .eq('id', userId),
      'admin user delete'
    );
    if (error) throw error;
  },

  // Service Management
  async getAllServices() {
    const { data, error } = await runSupabaseQuery(
      supabase
        .from('services')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true }),
      'admin services list'
    );
    if (error) throw error;
    return data as Service[];
  },

  async createService(service: Omit<Service, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await runSupabaseQuery(
      supabase
        .from('services')
        .insert(service)
        .select()
        .single(),
      'admin service create'
    );
    if (error) throw error;
    return data as Service;
  },

  async updateService(serviceId: string, updates: Partial<Service>) {
    const { data, error } = await runSupabaseQuery(
      supabase
        .from('services')
        .update(updates)
        .eq('id', serviceId)
        .select()
        .single(),
      'admin service update'
    );
    if (error) throw error;
    return data as Service;
  },

  async deleteService(serviceId: string) {
    const { error } = await runSupabaseQuery(
      supabase
        .from('services')
        .delete()
        .eq('id', serviceId),
      'admin service delete'
    );
    if (error) throw error;
  },

  // Provider Management
  async getAllProviders() {
    const { data, error } = await runSupabaseQuery(
      supabase
        .from('providers')
        .select('*')
        .order('created_at', { ascending: false }),
      'admin providers list'
    );
    if (error) throw error;
    return data;
  },

  async createProvider(provider: any) {
    const { data, error } = await runSupabaseQuery(
      supabase
        .from('providers')
        .insert(provider)
        .select()
        .single(),
      'admin provider create'
    );
    if (error) throw error;
    return data;
  },

  async updateProvider(providerId: string, updates: any) {
    const { data, error } = await runSupabaseQuery(
      supabase
        .from('providers')
        .update(updates)
        .eq('id', providerId)
        .select()
        .single(),
      'admin provider update'
    );
    if (error) throw error;
    return data;
  },

  async deleteProvider(providerId: string) {
    const { error } = await runSupabaseQuery(
      supabase
        .from('providers')
        .delete()
        .eq('id', providerId),
      'admin provider delete'
    );
    if (error) throw error;
  },

  // Order Management
  async getAllOrders() {
    const { data, error } = await runSupabaseQuery(
      supabase
        .from('orders')
        .select(`
          *,
          service:services(*),
          user:user_profiles(username, email)
        `)
        .order('created_at', { ascending: false }),
      'admin orders list'
    );
    if (error) throw error;
    return data;
  },

  async updateOrderStatus(orderId: string, status: Order['status']) {
    const { data, error } = await runSupabaseQuery(
      supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId)
        .select()
        .single(),
      'admin order status update'
    );
    if (error) throw error;
    return data as Order;
  },

  // Payment Logs
  async getAllPayments() {
    const { data, error } = await runSupabaseQuery(
      supabase
        .from('payments')
        .select(`
          *,
          user:user_profiles(username, email)
        `)
        .order('created_at', { ascending: false }),
      'admin payments list'
    );
    if (error) throw error;
    return data;
  },

  async getPaymentLogs() {
    const { data, error } = await runSupabaseQuery(
      supabase
        .from('payment_logs')
        .select(`
          *,
          user:user_profiles(username, email),
          payment:payments(*)
        `)
        .order('created_at', { ascending: false }),
      'admin payment logs'
    );
    if (error) throw error;
    return data;
  },

  async createPaymentLog(paymentId: string, userId: string, action: string, details: any) {
    const { data, error } = await runSupabaseQuery(
      supabase
        .from('payment_logs')
        .insert({
          payment_id: paymentId,
          user_id: userId,
          action,
          details,
        })
        .select()
        .single(),
      'admin payment log create'
    );
    if (error) throw error;
    return data;
  },

  // Dashboard Statistics
  async getDashboardStats() {
    const [usersResult, ordersResult, paymentsResult, servicesResult] = await Promise.all([
      runSupabaseQuery(
        supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
        'admin dashboard users count'
      ),
      runSupabaseQuery(
        supabase.from('orders').select('id, status, charge', { count: 'exact' }),
        'admin dashboard orders'
      ),
      runSupabaseQuery(
        supabase.from('payments').select('id, amount, status', { count: 'exact' }),
        'admin dashboard payments'
      ),
      runSupabaseQuery(
        supabase.from('services').select('id', { count: 'exact', head: true }),
        'admin dashboard services count'
      ),
    ]);

    if (usersResult.error) throw usersResult.error;
    if (ordersResult.error) throw ordersResult.error;
    if (paymentsResult.error) throw paymentsResult.error;
    if (servicesResult.error) throw servicesResult.error;

    const totalRevenue = paymentsResult.data
      ?.filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + Number(p.amount), 0) || 0;

    const pendingOrders = ordersResult.data
      ?.filter(o => o.status === 'pending').length || 0;

    const completedOrders = ordersResult.data
      ?.filter(o => o.status === 'completed').length || 0;

    return {
      totalUsers: usersResult.count || 0,
      totalOrders: ordersResult.count || 0,
      totalRevenue,
      totalServices: servicesResult.count || 0,
      pendingOrders,
      completedOrders,
    };
  },

  // Get total users count
  async getUsersCount() {
    const { count, error } = await runSupabaseQuery(
      supabase
        .from('user_profiles')
        .select('id', { count: 'exact', head: true }),
      'admin users count'
    );
    if (error) throw error;
    return count || 0;
  },

  // Get total support tickets count (open tickets)
  async getSupportTicketsCount() {
    const { count, error } = await runSupabaseQuery(
      supabase
        .from('support_tickets')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'open'),
      'admin support tickets count'
    );
    if (error) throw error;
    return count || 0;
  },

  // Get all support tickets
  async getAllSupportTickets() {
    const { data, error } = await runSupabaseQuery(
      supabase
        .from('support_tickets')
        .select(`
          *,
          user:user_profiles(username, email)
        `)
        .order('created_at', { ascending: false }),
      'support tickets list'
    );
    if (error) throw error;
    return data;
  },

  // Update support ticket
  async updateSupportTicket(ticketId: string, updates: any) {
    const { data, error } = await runSupabaseQuery(
      supabase
        .from('support_tickets')
        .update(updates)
        .eq('id', ticketId)
        .select()
        .single(),
      'support ticket update'
    );
    if (error) throw error;
    return data;
  },

  // Create support ticket reply
  async createSupportTicketReply(ticketId: string, reply: string) {
    return this.updateSupportTicket(ticketId, {
      reply,
      status: 'resolved',
      updated_at: new Date().toISOString(),
    });
  },

  // Announcements Management
  async getAllAnnouncements() {
    const { data, error } = await runSupabaseQuery(
      supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false }),
      'announcements list'
    );
    if (error) throw error;
    return data;
  },

  async getPublishedAnnouncements() {
    const { data, error } = await runSupabaseQuery(
      supabase
        .from('announcements')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false }),
      'published announcements'
    );
    if (error) throw error;
    return data;
  },

  async createAnnouncement(announcement: any) {
    const { data, error } = await runSupabaseQuery(
      supabase
        .from('announcements')
        .insert(announcement)
        .select()
        .single(),
      'announcement create'
    );
    if (error) throw error;
    return data;
  },

  async updateAnnouncement(announcementId: string, updates: any) {
    const { data, error } = await runSupabaseQuery(
      supabase
        .from('announcements')
        .update(updates)
        .eq('id', announcementId)
        .select()
        .single(),
      'announcement update'
    );
    if (error) throw error;
    return data;
  },

  async deleteAnnouncement(announcementId: string) {
    const { error } = await runSupabaseQuery(
      supabase
        .from('announcements')
        .delete()
        .eq('id', announcementId),
      'announcement delete'
    );
    if (error) throw error;
  },

  // App Settings (singleton row stored in `app_settings` table with id = 'default')
  async getSettings() {
    const response = await fetch('/api/admin/settings');
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload?.error || 'Failed to load settings');
    }

    return payload?.settings ?? null;
  },

  async saveSettings(config: any) {
    const response = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ config }),
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload?.error || 'Failed to save settings');
    }

    return payload?.settings ?? {};
  },
};
