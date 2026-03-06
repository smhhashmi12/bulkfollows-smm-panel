import { supabase } from './supabase';

type DerivedSummaryRow = {
  date: string;
  total_customer_charges: number;
  total_provider_costs: number;
  gross_profit: number;
  net_profit: number;
  total_orders: number;
  successful_orders: number;
  failed_orders: number;
};

type ProviderBreakdownRow = {
  provider_id: string;
  provider_name: string;
  revenue: number;
  expenses: number;
  profit: number;
  orders: number;
};

// ============================================
// PROVIDER INTEGRATION API
// ============================================

export const providerIntegrationAPI = {
  // Provider Service Mapping
  async mapProviderService(
    providerId: string,
    serviceId: string,
    providerServiceId: string,
    providerRate: number,
    ourRate: number,
    minQuantity?: number,
    maxQuantity?: number
  ) {
    const { data, error } = await supabase
      .from('provider_services')
      .insert({
        provider_id: providerId,
        service_id: serviceId,
        provider_service_id: providerServiceId,
        provider_rate: providerRate,
        our_rate: ourRate,
        min_quantity: minQuantity,
        max_quantity: maxQuantity,
        status: 'active',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get provider services
  async getProviderServices(providerId: string) {
    const { data, error } = await supabase
      .from('provider_services')
      .select(`
        *,
        service:services(name, category),
        provider:providers(name, api_url)
      `)
      .eq('provider_id', providerId)
      .eq('status', 'active');

    if (error) throw error;
    return data;
  },

  // Sync services from provider API
  async syncProviderServices(providerId: string, apiCallFunction: any) {
    try {
      const provider = await this.getProvider(providerId);
      if (!provider) throw new Error('Provider not found');

      // Call the provider's API to get their service list
      const providerServices = await apiCallFunction(provider);

      // Map and insert services
      const syncResults = [];
      for (const providerService of providerServices) {
        try {
          // Find or create corresponding service in our system
          const { data: existingService } = await supabase
            .from('services')
            .select('id')
            .eq('name', providerService.name)
            .eq('category', providerService.category)
            .single();

          let serviceId = existingService?.id;

          // If service doesn't exist, create it
          if (!serviceId) {
            const { data: newService, error: createError } = await supabase
              .from('services')
              .insert({
                name: providerService.name,
                category: providerService.category,
                description: providerService.description,
                rate_per_1000: providerService.rate_per_1000,
                min_quantity: providerService.min_quantity || 100,
                max_quantity: providerService.max_quantity || 10000,
                status: 'active',
              })
              .select()
              .single();

            if (createError) throw createError;
            serviceId = newService.id;
          }

          // Map the provider service
          const { data: mapping } = await supabase
            .from('provider_services')
            .insert({
              provider_id: providerId,
              service_id: serviceId,
              provider_service_id: providerService.id,
              provider_rate: providerService.rate_per_1000,
              our_rate: providerService.rate_per_1000 * 1.5, // 50% markup
              min_quantity: providerService.min_quantity,
              max_quantity: providerService.max_quantity,
              status: 'active',
            })
            .select()
            .single();

          syncResults.push({
            status: 'success',
            serviceId,
            mapping,
          });
        } catch (error: any) {
          syncResults.push({
            status: 'error',
            serviceName: providerService.name,
            error: error.message,
          });
        }
      }

      // Update last sync time
      await supabase
        .from('providers')
        .update({ last_sync: new Date().toISOString() })
        .eq('id', providerId);

      return syncResults;
    } catch (error) {
      console.error('Error syncing provider services:', error);
      throw error;
    }
  },

  // Get provider details
  async getProvider(providerId: string) {
    const { data, error } = await supabase
      .from('providers')
      .select('*')
      .eq('id', providerId)
      .single();

    if (error) throw error;
    return data;
  },

  // Place order with provider
  async placeOrderWithProvider(
    orderId: string,
    providerId: string,
    providerServiceId: string,
    quantity: number,
    link: string
  ) {
    try {
      const provider = await this.getProvider(providerId);
      if (!provider) throw new Error('Provider not found');

      // Call provider API to place order
      const response = await fetch(provider.api_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${provider.api_key}`,
        },
        body: JSON.stringify({
          service: providerServiceId,
          link,
          quantity,
        }),
      });

      if (!response.ok) {
        throw new Error(`Provider API error: ${response.statusText}`);
      }

      const providerOrder = await response.json();

      // Save the provider order ID
      await supabase
        .from('orders')
        .update({
          provider_id: providerId,
          provider_order_id: providerOrder.order_id || providerOrder.id,
        })
        .eq('id', orderId);

      return providerOrder;
    } catch (error) {
      console.error('Error placing order with provider:', error);
      throw error;
    }
  },

  // Check order status with provider
  async checkOrderStatusWithProvider(providerId: string, providerOrderId: string) {
    try {
      const provider = await this.getProvider(providerId);
      if (!provider) throw new Error('Provider not found');

      const response = await fetch(`${provider.api_url}/orders/${providerOrderId}`, {
        headers: {
          'Authorization': `Bearer ${provider.api_key}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Provider API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error checking order status:', error);
      throw error;
    }
  },
};

// ============================================
// PLATFORM EARNINGS & FINANCIAL API
// ============================================

export const earningsAPI = {
  async buildDerivedFinancialReport(startDate: string, endDate: string) {
    const startAt = `${startDate}T00:00:00Z`;
    const endAt = `${endDate}T23:59:59Z`;

    const [{ data: orders, error: ordersError }, { data: providerMappings, error: mapError }, { data: providers, error: providersError }] = await Promise.all([
      supabase
        .from('orders')
        .select(`
          id,
          service_id,
          provider_id,
          charge,
          quantity,
          status,
          created_at,
          service:services(description, rate_per_1000)
        `)
        .gte('created_at', startAt)
        .lte('created_at', endAt),
      supabase
        .from('provider_services')
        .select('service_id, provider_id, provider_rate, our_rate, status'),
      supabase
        .from('providers')
        .select('id, name')
    ]);

    if (ordersError) throw ordersError;
    if (mapError) throw mapError;
    if (providersError) throw providersError;

    const providerRateByServiceId = new Map<string, number>();
    const providerIdByServiceId = new Map<string, string>();
    (providerMappings || []).forEach((row: any) => {
      const serviceId = String(row.service_id || '').trim();
      if (!serviceId || providerRateByServiceId.has(serviceId)) return;
      providerRateByServiceId.set(serviceId, Number(row.provider_rate || 0));
      if (row.provider_id) {
        providerIdByServiceId.set(serviceId, String(row.provider_id));
      }
    });

    const parseProviderRateFromDescription = (description: string) => {
      const match = String(description || '').match(/Provider Rate:\s*([0-9.]+)/i);
      if (!match) return 0;
      const value = Number(match[1]);
      return Number.isFinite(value) ? value : 0;
    };
    const parseProviderIdFromDescription = (description: string) => {
      const match = String(description || '').match(/Provider ID:\s*([^|]+)/i);
      return match ? String(match[1]).trim() : '';
    };

    const byDate = new Map<string, DerivedSummaryRow>();
    const byProvider = new Map<string, ProviderBreakdownRow>();
    const providerNameById = new Map<string, string>();
    (providers || []).forEach((p: any) => {
      providerNameById.set(String(p.id), String(p.name || 'Unknown Provider'));
    });

    (orders || []).forEach((order: any) => {
      const orderDate = new Date(order.created_at).toISOString().slice(0, 10);
      const revenue = Number(order.charge || 0);
      const quantity = Number(order.quantity || 0);

      const serviceNode = Array.isArray(order.service) ? order.service[0] : order.service;
      const serviceDescription = String(serviceNode?.description || '');

      const mappedProviderRate = providerRateByServiceId.get(String(order.service_id || '').trim()) || 0;
      const providerRate = mappedProviderRate > 0 ? mappedProviderRate : parseProviderRateFromDescription(serviceDescription);
      const providerCost = (providerRate / 1000) * quantity;
      const profit = revenue - providerCost;
      const providerId =
        String(order.provider_id || '').trim() ||
        parseProviderIdFromDescription(serviceDescription) ||
        String(providerIdByServiceId.get(String(order.service_id || '').trim()) || '').trim();

      const prev = byDate.get(orderDate) || {
        date: orderDate,
        total_customer_charges: 0,
        total_provider_costs: 0,
        gross_profit: 0,
        net_profit: 0,
        total_orders: 0,
        successful_orders: 0,
        failed_orders: 0,
      };

      prev.total_customer_charges += revenue;
      prev.total_provider_costs += providerCost;
      prev.gross_profit += profit;
      prev.net_profit += profit;
      prev.total_orders += 1;

      const status = String(order.status || '').toLowerCase();
      if (status === 'completed' || status === 'processing' || status === 'pending') {
        prev.successful_orders += 1;
      }
      if (status === 'failed' || status === 'canceled') {
        prev.failed_orders += 1;
      }

      byDate.set(orderDate, prev);

      if (providerId) {
        const providerPrev = byProvider.get(providerId) || {
          provider_id: providerId,
          provider_name: providerNameById.get(providerId) || 'Unknown Provider',
          revenue: 0,
          expenses: 0,
          profit: 0,
          orders: 0,
        };
        providerPrev.revenue += revenue;
        providerPrev.expenses += providerCost;
        providerPrev.profit += profit;
        providerPrev.orders += 1;
        byProvider.set(providerId, providerPrev);
      }
    });

    const summaries = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
    const providerBreakdown = Array.from(byProvider.values()).sort((a, b) => b.profit - a.profit);

    const totals = {
      totalCustomerCharges: summaries.reduce((sum, s) => sum + Number(s.total_customer_charges), 0),
      totalProviderCosts: summaries.reduce((sum, s) => sum + Number(s.total_provider_costs), 0),
      totalProfit: summaries.reduce((sum, s) => sum + Number(s.net_profit), 0),
      totalOrders: summaries.reduce((sum, s) => sum + Number(s.total_orders), 0),
      successRate: summaries.reduce((sum, s) => sum + Number(s.total_orders), 0) > 0
        ? (
            summaries.reduce((sum, s) => sum + Number(s.successful_orders), 0) /
            summaries.reduce((sum, s) => sum + Number(s.total_orders), 0) * 100
          ).toFixed(2)
        : '0.00',
    };

    return { summaries, totals, providerBreakdown };
  },

  // Record order earnings
  async recordOrderEarning(
    orderId: string,
    userId: string,
    providerId: string | null,
    customerCharge: number,
    providerCost: number,
    platformCommission: number = 0
  ) {
    const platformProfit = customerCharge - providerCost - platformCommission;

    const { data, error } = await supabase
      .from('platform_earnings')
      .insert({
        order_id: orderId,
        user_id: userId,
        provider_id: providerId,
        customer_charge: customerCharge,
        provider_cost: providerCost,
        platform_profit: platformProfit,
        platform_commission: platformCommission,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Complete order earning (when order is completed)
  async completeOrderEarning(orderId: string) {
    const { data, error } = await supabase
      .from('platform_earnings')
      .update({
        status: 'completed',
        completion_date: new Date().toISOString(),
      })
      .eq('order_id', orderId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get earnings for specific period
  async getEarningsByPeriod(startDate: string, endDate: string) {
    try {
      const startAt = `${startDate}T00:00:00Z`;
      const endAt = `${endDate}T23:59:59Z`;
      const { data, error } = await supabase
        .from('platform_earnings')
        .select('*')
        .gte('order_date', startAt)
        .lte('order_date', endAt)
        .eq('status', 'completed');

      if (error) throw error;

      if ((data || []).length > 0) {
        const totals = {
          totalCustomerCharges: data.reduce((sum, e) => sum + Number(e.customer_charge), 0),
          totalProviderCosts: data.reduce((sum, e) => sum + Number(e.provider_cost), 0),
          totalPlatformProfit: data.reduce((sum, e) => sum + Number(e.platform_profit), 0),
          totalPlatformCommission: data.reduce((sum, e) => sum + Number(e.platform_commission), 0),
          count: data.length,
        };
        return { earnings: data, totals };
      }
    } catch (error) {
      // Fall through to derived real-time earnings when platform_earnings is not populated
      console.warn('[earningsAPI] Falling back to derived earnings:', error);
    }

    const report = await this.buildDerivedFinancialReport(startDate, endDate);
    const flattenedEarnings = report.summaries.map((row: any) => ({
      order_date: `${row.date}T00:00:00Z`,
      customer_charge: row.total_customer_charges,
      provider_cost: row.total_provider_costs,
      platform_profit: row.net_profit,
      platform_commission: 0,
      status: 'completed',
      provider_id: null,
    }));
    return {
      earnings: flattenedEarnings,
      totals: {
        totalCustomerCharges: report.totals.totalCustomerCharges,
        totalProviderCosts: report.totals.totalProviderCosts,
        totalPlatformProfit: report.totals.totalProfit,
        totalPlatformCommission: 0,
        count: report.totals.totalOrders,
      },
    };
  },

  // Get provider payouts
  async getProviderPayouts(providerId?: string) {
    let query = supabase
      .from('provider_payouts')
      .select('*')
      .order('created_at', { ascending: false });

    if (providerId && String(providerId).trim() !== '') {
      query = query.eq('provider_id', providerId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  },

  // Create provider payout
  async createProviderPayout(
    providerId: string,
    periodFrom: string,
    periodTo: string,
    payoutMethod: string,
    payoutAccount: string
  ) {
    try {
      const startAt = `${periodFrom}T00:00:00Z`;
      const endAt = `${periodTo}T23:59:59Z`;

      const [{ data: orders, error: ordersError }, { data: providerMappings, error: mappingsError }] = await Promise.all([
        supabase
          .from('orders')
          .select('service_id, quantity, created_at')
          .gte('created_at', startAt)
          .lte('created_at', endAt),
        supabase
          .from('provider_services')
          .select('provider_id, service_id, provider_rate')
          .eq('provider_id', providerId),
      ]);

      if (ordersError) throw ordersError;
      if (mappingsError) throw mappingsError;

      const rateByService = new Map<string, number>();
      (providerMappings || []).forEach((row: any) => {
        const sid = String(row.service_id || '').trim();
        if (!sid || rateByService.has(sid)) return;
        rateByService.set(sid, Number(row.provider_rate || 0));
      });

      const totalAmount = (orders || []).reduce((sum: number, order: any) => {
        const sid = String(order.service_id || '').trim();
        const providerRate = rateByService.get(sid) || 0;
        if (providerRate <= 0) return sum;
        return sum + (providerRate / 1000) * Number(order.quantity || 0);
      }, 0);

      // Create payout record
      const { data, error } = await supabase
        .from('provider_payouts')
        .insert({
          provider_id: providerId,
          total_amount: totalAmount,
          period_from: `${periodFrom}T00:00:00Z`,
          period_to: `${periodTo}T23:59:59Z`,
          payout_method: payoutMethod,
          payout_account: payoutAccount,
          status: 'pending',
          reference_number: `PAYOUT-${providerId.slice(0, 8)}-${Date.now()}`,
        })
        .select()
        .single();

      if (error) throw error;

      // Record transaction for provider
      await this.recordProviderTransaction(
        providerId,
        'payout',
        totalAmount,
        `Payout for period ${periodFrom} to ${periodTo}`,
        data.id
      );

      return data;
    } catch (error) {
      console.error('Error creating payout:', error);
      throw error;
    }
  },

  // Record provider transaction
  async recordProviderTransaction(
    providerId: string,
    type: 'earning' | 'payout' | 'refund' | 'adjustment',
    amount: number,
    description: string,
    relatedId?: string
  ) {
    // Get current provider balance
    const { data: provider } = await supabase
      .from('providers')
      .select('balance')
      .eq('id', providerId)
      .single();

    const currentBalance = provider?.balance || 0;
    const newBalance = type === 'earning' || type === 'adjustment'
      ? currentBalance + amount
      : currentBalance - amount;

    // Record transaction
    const { data, error } = await supabase
      .from('provider_transactions')
      .insert({
        provider_id: providerId,
        type,
        amount,
        description,
        payout_id: type === 'payout' ? relatedId : null,
        balance_before: currentBalance,
        balance_after: newBalance,
      })
      .select()
      .single();

    if (error) throw error;

    // Update provider balance
    await supabase
      .from('providers')
      .update({ balance: newBalance })
      .eq('id', providerId);

    return data;
  },

  // Get platform financial summary for a date
  async getPlatformSummary(date: string) {
    const { data, error } = await supabase
      .from('platform_summary')
      .select('*')
      .eq('date', date)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  },

  // Update platform summary
  async updatePlatformSummary(date: string, summary: any) {
    const existingSummary = await this.getPlatformSummary(date);

    if (existingSummary) {
      const { data, error } = await supabase
        .from('platform_summary')
        .update(summary)
        .eq('date', date)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase
        .from('platform_summary')
        .insert({
          date,
          ...summary,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  },

  // Calculate daily summary
  async calculateDailySummary(date: string) {
    const startDate = `${date}T00:00:00Z`;
    const endDate = `${date}T23:59:59Z`;

    const { data: earnings, error: earningsError } = await supabase
      .from('platform_earnings')
      .select('*')
      .gte('order_date', startDate)
      .lte('order_date', endDate);

    if (earningsError) throw earningsError;

    const summary = {
      total_customer_charges: earnings.reduce((sum, e) => sum + Number(e.customer_charge), 0),
      total_provider_costs: earnings.reduce((sum, e) => sum + Number(e.provider_cost), 0),
      gross_profit: earnings.reduce((sum, e) => sum + (Number(e.customer_charge) - Number(e.provider_cost)), 0),
      net_profit: earnings.reduce((sum, e) => sum + Number(e.platform_profit), 0),
      total_orders: earnings.length,
      successful_orders: earnings.filter(e => e.status === 'completed').length,
      failed_orders: earnings.filter(e => e.status === 'failed').length,
    };

    return this.updatePlatformSummary(date, summary);
  },

  // Get financial report for date range
  async getFinancialReport(startDate: string, endDate: string) {
    // Always return real-time derived data so earnings screen reflects latest orders instantly.
    return this.buildDerivedFinancialReport(startDate, endDate);
  },
};
