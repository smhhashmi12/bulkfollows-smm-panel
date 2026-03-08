-- ============================================
-- PROVIDER MANAGEMENT ENHANCEMENT
-- ============================================

-- Update Providers table with more details
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS api_secret TEXT;
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS balance DECIMAL(10, 2) DEFAULT 0.00;
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS markup_percentage DECIMAL(5, 2) DEFAULT 0.00;
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS last_sync TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS commission_type TEXT DEFAULT 'percentage' CHECK (commission_type IN ('percentage', 'fixed', 'dynamic'));
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS commission_value DECIMAL(10, 2) DEFAULT 0.00;
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS min_payout DECIMAL(10, 2) DEFAULT 0.00;
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS description TEXT;

-- Provider Services Mapping Table
CREATE TABLE IF NOT EXISTS public.provider_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  provider_service_id TEXT NOT NULL, -- External provider's service ID
  provider_rate DECIMAL(18, 6) NOT NULL, -- Cost per 1000 from provider
  our_rate DECIMAL(18, 6) NOT NULL, -- Price we charge customers
  min_quantity BIGINT,
  max_quantity BIGINT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(provider_id, provider_service_id)
);

-- ============================================
-- EARNINGS & FINANCIAL MANAGEMENT
-- ============================================

-- Platform Earnings Table
CREATE TABLE IF NOT EXISTS public.platform_earnings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES public.providers(id) ON DELETE SET NULL,
  
  -- Revenue breakdown
  customer_charge DECIMAL(10, 2) NOT NULL, -- Amount charged to customer
  provider_cost DECIMAL(10, 2) NOT NULL, -- Amount paid to provider
  platform_profit DECIMAL(10, 2) NOT NULL, -- Our profit
  platform_commission DECIMAL(10, 2) DEFAULT 0.00, -- Commission from provider
  
  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  
  -- Dates
  order_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completion_date TIMESTAMP WITH TIME ZONE,
  payout_date TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Provider Payouts Table
CREATE TABLE IF NOT EXISTS public.provider_payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  
  -- Payout details
  total_amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  payout_method TEXT DEFAULT 'bank_transfer', -- bank_transfer, paypal, crypto, etc
  payout_account TEXT, -- Bank details, PayPal email, wallet address
  
  -- Period
  period_from TIMESTAMP WITH TIME ZONE NOT NULL,
  period_to TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  
  -- Reference
  reference_number TEXT UNIQUE,
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Provider Wallet/Balance History
CREATE TABLE IF NOT EXISTS public.provider_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  
  -- Transaction details
  type TEXT NOT NULL CHECK (type IN ('earning', 'payout', 'refund', 'adjustment')),
  amount DECIMAL(10, 2) NOT NULL,
  description TEXT NOT NULL,
  
  -- Reference
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  payout_id UUID REFERENCES public.provider_payouts(id) ON DELETE SET NULL,
  
  -- Balance tracking
  balance_before DECIMAL(10, 2) NOT NULL,
  balance_after DECIMAL(10, 2) NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Platform Financial Summary Table
CREATE TABLE IF NOT EXISTS public.platform_summary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE UNIQUE NOT NULL,
  
  -- Income
  total_customer_charges DECIMAL(10, 2) DEFAULT 0.00,
  total_payments_received DECIMAL(10, 2) DEFAULT 0.00,
  
  -- Expenses
  total_provider_costs DECIMAL(10, 2) DEFAULT 0.00,
  total_provider_payouts DECIMAL(10, 2) DEFAULT 0.00,
  
  -- Profit
  gross_profit DECIMAL(10, 2) DEFAULT 0.00,
  net_profit DECIMAL(10, 2) DEFAULT 0.00,
  
  -- Metrics
  total_orders INTEGER DEFAULT 0,
  successful_orders INTEGER DEFAULT 0,
  failed_orders INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_platform_earnings_order_id ON public.platform_earnings(order_id);
CREATE INDEX IF NOT EXISTS idx_platform_earnings_user_id ON public.platform_earnings(user_id);
CREATE INDEX IF NOT EXISTS idx_platform_earnings_provider_id ON public.platform_earnings(provider_id);
CREATE INDEX IF NOT EXISTS idx_platform_earnings_status ON public.platform_earnings(status);
CREATE INDEX IF NOT EXISTS idx_platform_earnings_date ON public.platform_earnings(order_date DESC);

CREATE INDEX IF NOT EXISTS idx_provider_payouts_provider_id ON public.provider_payouts(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_payouts_status ON public.provider_payouts(status);
CREATE INDEX IF NOT EXISTS idx_provider_payouts_date ON public.provider_payouts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_provider_transactions_provider_id ON public.provider_transactions(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_transactions_type ON public.provider_transactions(type);
CREATE INDEX IF NOT EXISTS idx_provider_transactions_date ON public.provider_transactions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_provider_services_provider_id ON public.provider_services(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_services_service_id ON public.provider_services(service_id);

CREATE INDEX IF NOT EXISTS idx_platform_summary_date ON public.platform_summary(date DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.platform_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_summary ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own earnings
CREATE POLICY "Users see own earnings" ON public.platform_earnings
  FOR SELECT USING (auth.uid() = user_id);

-- RLS Policy: Admins can see all earnings
CREATE POLICY "Admins see all earnings" ON public.platform_earnings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policy: Only admins can see provider payouts
CREATE POLICY "Admins manage provider payouts" ON public.provider_payouts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policy: Only admins can see provider transactions
CREATE POLICY "Admins see provider transactions" ON public.provider_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policy: Only admins can manage provider services
CREATE POLICY "Admins manage provider services" ON public.provider_services
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policy: Only admins can see platform summary
CREATE POLICY "Admins see platform summary" ON public.platform_summary
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
