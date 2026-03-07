-- Bring older databases in sync with the current provider, earnings, and API-key features.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE OR REPLACE FUNCTION public.generate_api_key()
RETURNS TEXT AS $$
DECLARE
  generated_key TEXT;
BEGIN
  LOOP
    generated_key := 'sk_' || substr(md5(uuid_generate_v4()::text || clock_timestamp()::text || random()::text), 1, 32);
    EXIT WHEN NOT EXISTS (
      SELECT 1
      FROM public.user_profiles
      WHERE api_key = generated_key
    );
  END LOOP;

  RETURN generated_key;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS api_key TEXT;

ALTER TABLE public.user_profiles
  ALTER COLUMN api_key SET DEFAULT public.generate_api_key();

UPDATE public.user_profiles
SET api_key = public.generate_api_key()
WHERE api_key IS NULL OR btrim(api_key) = '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_profiles_api_key_key'
      AND conrelid = 'public.user_profiles'::regclass
  ) THEN
    ALTER TABLE public.user_profiles
      ADD CONSTRAINT user_profiles_api_key_key UNIQUE (api_key);
  END IF;
END;
$$;

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS completion_time INTEGER DEFAULT 24,
  ADD COLUMN IF NOT EXISTS time_pricing JSONB DEFAULT '{"6": 2.0, "12": 1.5, "24": 1.0, "48": 0.8, "72": 0.7}'::jsonb;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_time INTEGER DEFAULT 24;

ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS api_secret TEXT,
  ADD COLUMN IF NOT EXISTS balance DECIMAL(10, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS markup_percentage DECIMAL(5, 2) DEFAULT 0.00,
  ADD COLUMN IF NOT EXISTS last_sync TIMESTAMP WITH TIME ZONE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'providers_status_check'
      AND conrelid = 'public.providers'::regclass
  ) THEN
    ALTER TABLE public.providers DROP CONSTRAINT providers_status_check;
  END IF;

  ALTER TABLE public.providers
    ADD CONSTRAINT providers_status_check CHECK (status IN ('active', 'inactive', 'error'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END;
$$;

CREATE TABLE IF NOT EXISTS public.provider_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  provider_service_id TEXT NOT NULL,
  provider_rate DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  our_rate DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  min_quantity INTEGER DEFAULT 1,
  max_quantity INTEGER DEFAULT 10000,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.platform_earnings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES public.providers(id) ON DELETE SET NULL,
  customer_charge DECIMAL(10, 2) NOT NULL,
  provider_cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  platform_profit DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  platform_commission DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'canceled')),
  order_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completion_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.provider_payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  payout_method TEXT NOT NULL,
  payout_account TEXT,
  period_from TIMESTAMP WITH TIME ZONE NOT NULL,
  period_to TIMESTAMP WITH TIME ZONE NOT NULL,
  reference_number TEXT NOT NULL UNIQUE,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.provider_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('earning', 'payout', 'refund', 'adjustment')),
  amount DECIMAL(10, 2) NOT NULL,
  description TEXT,
  payout_id UUID REFERENCES public.provider_payouts(id) ON DELETE SET NULL,
  balance_before DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  balance_after DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.platform_summary (
  date DATE PRIMARY KEY,
  total_customer_charges DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  total_provider_costs DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  gross_profit DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  net_profit DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  total_orders INTEGER NOT NULL DEFAULT 0,
  successful_orders INTEGER NOT NULL DEFAULT 0,
  failed_orders INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'provider_services_provider_id_provider_service_id_key'
      AND conrelid = 'public.provider_services'::regclass
  ) THEN
    ALTER TABLE public.provider_services
      ADD CONSTRAINT provider_services_provider_id_provider_service_id_key
      UNIQUE (provider_id, provider_service_id);
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'platform_earnings_order_id_key'
      AND conrelid = 'public.platform_earnings'::regclass
  ) THEN
    ALTER TABLE public.platform_earnings
      ADD CONSTRAINT platform_earnings_order_id_key UNIQUE (order_id);
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_services_completion_time ON public.services(completion_time);
CREATE INDEX IF NOT EXISTS idx_payments_fastpay_order_id ON public.payments(fastpay_order_id);
CREATE INDEX IF NOT EXISTS idx_provider_services_provider_id ON public.provider_services(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_services_service_id ON public.provider_services(service_id);
CREATE INDEX IF NOT EXISTS idx_provider_services_status ON public.provider_services(status);
CREATE INDEX IF NOT EXISTS idx_platform_earnings_provider_id ON public.platform_earnings(provider_id);
CREATE INDEX IF NOT EXISTS idx_platform_earnings_order_date ON public.platform_earnings(order_date DESC);
CREATE INDEX IF NOT EXISTS idx_provider_payouts_provider_id ON public.provider_payouts(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_payouts_status ON public.provider_payouts(status);
CREATE INDEX IF NOT EXISTS idx_provider_transactions_provider_id ON public.provider_transactions(provider_id);
CREATE INDEX IF NOT EXISTS idx_platform_summary_updated_at ON public.platform_summary(updated_at DESC);

ALTER TABLE public.provider_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_summary ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'provider_services'
      AND policyname = 'Admins can manage provider services'
  ) THEN
    CREATE POLICY "Admins can manage provider services"
      ON public.provider_services FOR ALL
      USING (public.is_admin(auth.uid()))
      WITH CHECK (public.is_admin(auth.uid()));
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'platform_earnings'
      AND policyname = 'Admins can manage platform earnings'
  ) THEN
    CREATE POLICY "Admins can manage platform earnings"
      ON public.platform_earnings FOR ALL
      USING (public.is_admin(auth.uid()))
      WITH CHECK (public.is_admin(auth.uid()));
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'provider_payouts'
      AND policyname = 'Admins can manage provider payouts'
  ) THEN
    CREATE POLICY "Admins can manage provider payouts"
      ON public.provider_payouts FOR ALL
      USING (public.is_admin(auth.uid()))
      WITH CHECK (public.is_admin(auth.uid()));
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'provider_transactions'
      AND policyname = 'Admins can manage provider transactions'
  ) THEN
    CREATE POLICY "Admins can manage provider transactions"
      ON public.provider_transactions FOR ALL
      USING (public.is_admin(auth.uid()))
      WITH CHECK (public.is_admin(auth.uid()));
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'platform_summary'
      AND policyname = 'Admins can manage platform summary'
  ) THEN
    CREATE POLICY "Admins can manage platform summary"
      ON public.platform_summary FOR ALL
      USING (public.is_admin(auth.uid()))
      WITH CHECK (public.is_admin(auth.uid()));
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS update_providers_updated_at ON public.providers;
CREATE TRIGGER update_providers_updated_at
  BEFORE UPDATE ON public.providers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_provider_services_updated_at ON public.provider_services;
CREATE TRIGGER update_provider_services_updated_at
  BEFORE UPDATE ON public.provider_services
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_provider_payouts_updated_at ON public.provider_payouts;
CREATE TRIGGER update_provider_payouts_updated_at
  BEFORE UPDATE ON public.provider_payouts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_platform_summary_updated_at ON public.platform_summary;
CREATE TRIGGER update_platform_summary_updated_at
  BEFORE UPDATE ON public.platform_summary
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
