import { supabase } from './supabase';
import type { User } from '../App';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
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
  link: string;
  quantity: number;
  charge: number;
  delivery_time?: number | null; // hours selected by user
  status: 'pending' | 'processing' | 'completed' | 'canceled' | 'failed';
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
  status: 'active' | 'inactive' | 'error';
  last_sync?: string;
  created_at?: string;
}

// Auth Functions
export const authAPI = {
  async signUp(email: string, password: string, username: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
        },
      },
    });

    if (error) throw error;

    // Update username in profile
    if (data.user) {
      await supabase
        .from('user_profiles')
        .update({ username })
        .eq('id', data.user.id);
    }

    return data;
  },

  async signIn(email: string, password: string) {
    const res = await supabase.auth.signInWithPassword({
      email,
      password,
    });

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
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('username, role')
      .eq('id', user.id)
      .maybeSingle();

    if (error) throw error;

    if (!profile) return null;

    return {
      id: user.id,
      username: profile.username,
      role: profile.role,
    };
  },

  async getUserProfile(): Promise<UserProfile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

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

    const { data, error } = await query;
    if (error) throw error;
    return data as Service[];
  },

  async getService(id: string) {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Service;
  },

  // Get merged services (regular services + provider services)
  async getMergedServices(category?: string) {
    try {
      const regularServices = await this.getServices(category);

      // Read provider services from server endpoint (bypasses RLS for non-admin users).
      const response = await fetch('/api/integrations/provider-services');
      if (!response.ok) {
        console.error('Error fetching provider services from integration endpoint');
        return regularServices;
      }

      const payload = await response.json();
      const providerServices = payload?.providerServices || [];

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
};

// Orders Functions
export const ordersAPI = {
  async createOrder(
    serviceId: string,
    link: string,
    quantity: number,
    deliveryTime: number = 24
  ) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get service details with real data from database
    const service = await servicesAPI.getService(serviceId);
    
    // Calculate charge with time-based multiplier
    const basePrice = (service.rate_per_1000 / 1000) * quantity;
    const charge = basePrice;

    // Check user balance
    const profile = await authAPI.getUserProfile();
    if (!profile || profile.balance < charge) {
      throw new Error('Insufficient balance');
    }

    // Create order with delivery time
    const { data, error } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        service_id: serviceId,
        link,
        quantity,
        charge,
        delivery_time: deliveryTime,
      })
      .select()
      .single();

    if (error) throw error;

    // Deduct balance and update spent
    await supabase
      .from('user_profiles')
      .update({
        balance: profile.balance - charge,
        total_spent: profile.total_spent + charge,
      })
      .eq('id', user.id);

    return data as Order;
  },

  async getOrders() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        service:services(*)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Order[];
  },

  async getOrder(id: string) {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        service:services(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Order;
  },
};

// Payments Functions
export const paymentsAPI = {
  async createPayment(amount: number, paymentMethod: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const fee = amount * 0.02; // 2% processing fee
    const total = amount + fee;

    const { data, error } = await supabase
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
      .single();

    if (error) throw error;
    return data as Payment;
  },

  async getPayments() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

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

    const { data, error } = await supabase
      .from('payments')
      .update(updateData)
      .eq('id', paymentId)
      .select()
      .single();

    if (error) throw error;

    // If payment completed, update user balance
    if (status === 'completed') {
      const payment = data as Payment;
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('balance')
        .eq('id', payment.user_id)
        .single();

      if (profileData) {
        await supabase
          .from('user_profiles')
          .update({
            balance: profileData.balance + payment.amount,
          })
          .eq('id', payment.user_id);
      }
    }

    return data as Payment;
  },
};

// Admin API Functions
export const adminAPI = {
  // User Management
  async getAllUsers() {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as UserProfile[];
  },

  async updateUserBalance(userId: string, balance: number) {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({ balance })
      .eq('id', userId)
      .select()
      .single();
    if (error) throw error;
    return data as UserProfile;
  },

  async updateUserRole(userId: string, role: 'user' | 'admin') {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({ role })
      .eq('id', userId)
      .select()
      .single();
    if (error) throw error;
    return data as UserProfile;
  },

  async deleteUser(userId: string) {
    const { error } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', userId);
    if (error) throw error;
  },

  // Service Management
  async getAllServices() {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });
    if (error) throw error;
    return data as Service[];
  },

  async createService(service: Omit<Service, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('services')
      .insert(service)
      .select()
      .single();
    if (error) throw error;
    return data as Service;
  },

  async updateService(serviceId: string, updates: Partial<Service>) {
    const { data, error } = await supabase
      .from('services')
      .update(updates)
      .eq('id', serviceId)
      .select()
      .single();
    if (error) throw error;
    return data as Service;
  },

  async deleteService(serviceId: string) {
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', serviceId);
    if (error) throw error;
  },

  // Provider Management
  async getAllProviders() {
    const { data, error } = await supabase
      .from('providers')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async createProvider(provider: any) {
    const { data, error } = await supabase
      .from('providers')
      .insert(provider)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateProvider(providerId: string, updates: any) {
    const { data, error } = await supabase
      .from('providers')
      .update(updates)
      .eq('id', providerId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteProvider(providerId: string) {
    const { error } = await supabase
      .from('providers')
      .delete()
      .eq('id', providerId);
    if (error) throw error;
  },

  // Order Management
  async getAllOrders() {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        service:services(*),
        user:user_profiles(username, email)
      `)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async updateOrderStatus(orderId: string, status: Order['status']) {
    const { data, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId)
      .select()
      .single();
    if (error) throw error;
    return data as Order;
  },

  // Payment Logs
  async getAllPayments() {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        user:user_profiles(username, email)
      `)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getPaymentLogs() {
    const { data, error } = await supabase
      .from('payment_logs')
      .select(`
        *,
        user:user_profiles(username, email),
        payment:payments(*)
      `)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async createPaymentLog(paymentId: string, userId: string, action: string, details: any) {
    const { data, error } = await supabase
      .from('payment_logs')
      .insert({
        payment_id: paymentId,
        user_id: userId,
        action,
        details,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Dashboard Statistics
  async getDashboardStats() {
    const [usersResult, ordersResult, paymentsResult, servicesResult] = await Promise.all([
      supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
      supabase.from('orders').select('id, status, charge', { count: 'exact' }),
      supabase.from('payments').select('id, amount, status', { count: 'exact' }),
      supabase.from('services').select('id', { count: 'exact', head: true }),
    ]);

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
    const { count, error } = await supabase
      .from('user_profiles')
      .select('id', { count: 'exact', head: true });
    if (error) throw error;
    return count || 0;
  },

  // Get total support tickets count (open tickets)
  async getSupportTicketsCount() {
    const { count, error } = await supabase
      .from('support_tickets')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'open');
    if (error) throw error;
    return count || 0;
  },

  // Get all support tickets
  async getAllSupportTickets() {
    const { data, error } = await supabase
      .from('support_tickets')
      .select(`
        *,
        user:user_profiles(username, email)
      `)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  // Update support ticket
  async updateSupportTicket(ticketId: string, updates: any) {
    const { data, error } = await supabase
      .from('support_tickets')
      .update(updates)
      .eq('id', ticketId)
      .select()
      .single();
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
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async getPublishedAnnouncements() {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('status', 'published')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async createAnnouncement(announcement: any) {
    const { data, error } = await supabase
      .from('announcements')
      .insert(announcement)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateAnnouncement(announcementId: string, updates: any) {
    const { data, error } = await supabase
      .from('announcements')
      .update(updates)
      .eq('id', announcementId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteAnnouncement(announcementId: string) {
    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', announcementId);
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
