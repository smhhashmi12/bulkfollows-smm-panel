-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User Profiles Table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  api_key TEXT UNIQUE,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  balance DECIMAL(10, 2) DEFAULT 0.00,
  total_spent DECIMAL(10, 2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Services Table
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  rate_per_1000 DECIMAL(18, 6) NOT NULL,
  min_quantity BIGINT DEFAULT 100,
  max_quantity BIGINT DEFAULT 10000,
  completion_time INTEGER DEFAULT 24,
  time_pricing JSONB DEFAULT '{"6": 2.0, "12": 1.5, "24": 1.0, "48": 0.8, "72": 0.7}'::jsonb,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Providers Table
CREATE TABLE IF NOT EXISTS public.providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  api_key TEXT,
  api_secret TEXT,
  api_url TEXT,
  balance DECIMAL(10, 2) DEFAULT 0.00,
  markup_percentage DECIMAL(5, 2) DEFAULT 0.00,
  last_sync TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Provider Service Mapping Table
CREATE TABLE IF NOT EXISTS public.provider_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  provider_service_id TEXT NOT NULL,
  provider_rate DECIMAL(18, 6) NOT NULL DEFAULT 0.00,
  our_rate DECIMAL(18, 6) NOT NULL DEFAULT 0.00,
  min_quantity BIGINT DEFAULT 1,
  max_quantity BIGINT DEFAULT 10000,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (provider_id, provider_service_id)
);

-- Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  provider_id UUID REFERENCES public.providers(id) ON DELETE SET NULL,
  link TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  charge DECIMAL(10, 2) NOT NULL,
  delivery_time INTEGER DEFAULT 24,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'canceled', 'failed')),
  provider_order_id TEXT,
  start_count INTEGER,
  remains INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  fee DECIMAL(10, 2) DEFAULT 0.00,
  total DECIMAL(10, 2) NOT NULL,
  payment_method TEXT NOT NULL,
  payment_provider TEXT DEFAULT 'fastpay',
  transaction_id TEXT UNIQUE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'canceled')),
  fastpay_order_id TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment Logs Table (for admin tracking)
CREATE TABLE IF NOT EXISTS public.payment_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID REFERENCES public.payments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Provider/platform earnings tracking
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (order_id)
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

-- Helper for generating stable API keys for user-facing integrations
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
  ALTER COLUMN api_key SET DEFAULT public.generate_api_key();

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id ON public.payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payments_fastpay_order_id ON public.payments(fastpay_order_id);
CREATE INDEX IF NOT EXISTS idx_services_category ON public.services(category);
CREATE INDEX IF NOT EXISTS idx_services_status ON public.services(status);
CREATE INDEX IF NOT EXISTS idx_provider_services_provider_id ON public.provider_services(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_services_service_id ON public.provider_services(service_id);
CREATE INDEX IF NOT EXISTS idx_provider_services_status ON public.provider_services(status);
CREATE INDEX IF NOT EXISTS idx_platform_earnings_provider_id ON public.platform_earnings(provider_id);
CREATE INDEX IF NOT EXISTS idx_platform_earnings_order_date ON public.platform_earnings(order_date DESC);
CREATE INDEX IF NOT EXISTS idx_provider_payouts_provider_id ON public.provider_payouts(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_payouts_status ON public.provider_payouts(status);
CREATE INDEX IF NOT EXISTS idx_provider_transactions_provider_id ON public.provider_transactions(provider_id);
CREATE INDEX IF NOT EXISTS idx_platform_summary_updated_at ON public.platform_summary(updated_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_summary ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view their own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- Helper function to check if user is admin (avoids infinite recursion in RLS)
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role FROM public.user_profiles WHERE id = user_id LIMIT 1;
  RETURN user_role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Admins can view all profiles"
  ON public.user_profiles FOR SELECT
  USING (public.is_admin(auth.uid()));

-- RLS Policies for services
CREATE POLICY "Anyone can view active services"
  ON public.services FOR SELECT
  USING (status = 'active');

CREATE POLICY "Admins can manage services"
  ON public.services FOR ALL
  USING (public.is_admin(auth.uid()));

-- RLS Policies for providers
CREATE POLICY "Admins can manage providers"
  ON public.providers FOR ALL
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage provider services"
  ON public.provider_services FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- RLS Policies for orders
CREATE POLICY "Users can view their own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all orders"
  ON public.orders FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update all orders"
  ON public.orders FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- RLS Policies for payments
CREATE POLICY "Users can view their own payments"
  ON public.payments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own payments"
  ON public.payments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all payments"
  ON public.payments FOR SELECT
  USING (public.is_admin(auth.uid()));

-- RLS Policies for payment_logs
CREATE POLICY "Admins can view all payment logs"
  ON public.payment_logs FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage platform earnings"
  ON public.platform_earnings FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage provider payouts"
  ON public.provider_payouts FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage provider transactions"
  ON public.provider_transactions FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage platform summary"
  ON public.platform_summary FOR ALL
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_username TEXT := NULL;
  candidate_username TEXT := NULL;
  counter INT := 0;
  has_raw boolean := false;
  has_user_meta boolean := false;
BEGIN
  -- If there is already a profile for this auth user id, do nothing.
  IF EXISTS(SELECT 1 FROM public.user_profiles WHERE id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- If the email is already in use by another profile, abort gracefully without error
  -- to avoid blocking auth.user creation (the dashboard shows a generic DB error)
  IF EXISTS(SELECT 1 FROM public.user_profiles WHERE email = NEW.email AND id <> NEW.id) THEN
    RETURN NEW;
  END IF;

  -- Detect if auth.users has raw_user_meta_data or user_metadata columns
  SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'raw_user_meta_data') INTO has_raw;
  SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'user_metadata') INTO has_user_meta;

  IF has_raw THEN
    base_username := COALESCE((NEW.raw_user_meta_data->>'username')::text, split_part(NEW.email, '@', 1));
  ELSIF has_user_meta THEN
    base_username := COALESCE((NEW.user_metadata->>'username')::text, split_part(NEW.email, '@', 1));
  ELSE
    base_username := split_part(NEW.email, '@', 1);
  END IF;

  candidate_username := base_username;

  -- Ensure username uniqueness: append a numeric suffix if necessary
  WHILE EXISTS(SELECT 1 FROM public.user_profiles WHERE username = candidate_username) LOOP
    counter := counter + 1;
    candidate_username := base_username || '_' || counter;
  END LOOP;

  INSERT INTO public.user_profiles (id, email, username)
  VALUES (NEW.id, NEW.email, candidate_username);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Useful queries for debugging duplicate username/email issues. Run them in SQL Editor:
-- Find profiles with the given email
-- SELECT id, username, email FROM public.user_profiles WHERE email = 'smh.hashmi12@gmail.com';
-- Find profiles with the same username base
-- SELECT id, username, email FROM public.user_profiles WHERE username ILIKE 'smh.hashmi12%';
-- If a conflicting username exists and you need to rename it:
-- UPDATE public.user_profiles SET username = username || '_old' WHERE id = '<conflicting-id>';

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_providers_updated_at BEFORE UPDATE ON public.providers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_provider_services_updated_at BEFORE UPDATE ON public.provider_services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_provider_payouts_updated_at BEFORE UPDATE ON public.provider_payouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_platform_summary_updated_at BEFORE UPDATE ON public.platform_summary
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- App Settings (singleton store for site-wide configuration)
CREATE TABLE IF NOT EXISTS public.app_settings (
  id TEXT PRIMARY KEY,
  config JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert empty default settings row if not present
INSERT INTO public.app_settings (id, config)
VALUES ('default', '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Support Tickets Table
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  reply TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in-progress', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on support_tickets
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for support_tickets
CREATE POLICY "Users can view their own tickets"
  ON public.support_tickets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tickets"
  ON public.support_tickets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tickets"
  ON public.support_tickets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all tickets"
  ON public.support_tickets FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update all tickets"
  ON public.support_tickets FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete tickets"
  ON public.support_tickets FOR DELETE
  USING (public.is_admin(auth.uid()));

-- Trigger for support_tickets updated_at
CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Announcements Table
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success')),
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on announcements
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for announcements
CREATE POLICY "Anyone can view published announcements"
  ON public.announcements FOR SELECT
  USING (status = 'published');

CREATE POLICY "Admins can view all announcements"
  ON public.announcements FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage announcements"
  ON public.announcements FOR ALL
  USING (public.is_admin(auth.uid()));

-- Trigger for announcements updated_at
CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Live Chat Channels Table
CREATE TABLE IF NOT EXISTS public.chat_channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'pending', 'closed')),
  last_message TEXT,
  last_sender_role TEXT CHECK (last_sender_role IN ('user', 'admin')),
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, platform)
);

-- Live Chat Messages Table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id UUID NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('user', 'admin')),
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_channels_user_id ON public.chat_channels(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_channels_platform ON public.chat_channels(platform);
CREATE INDEX IF NOT EXISTS idx_chat_messages_channel_id ON public.chat_messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at DESC);

-- Enable RLS on chat tables
ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_channels
CREATE POLICY "Users can view their own chat channels"
  ON public.chat_channels FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own chat channels"
  ON public.chat_channels FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat channels"
  ON public.chat_channels FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all chat channels"
  ON public.chat_channels FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update all chat channels"
  ON public.chat_channels FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- RLS Policies for chat_messages
CREATE POLICY "Users can view messages in their channels"
  ON public.chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.chat_channels c
      WHERE c.id = chat_messages.channel_id
        AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages in their channels"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.chat_channels c
      WHERE c.id = chat_messages.channel_id
        AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all chat messages"
  ON public.chat_messages FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can send chat messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

-- Trigger to update channel metadata on new messages
CREATE OR REPLACE FUNCTION public.update_chat_channel_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.chat_channels
  SET last_message = NEW.body,
      last_sender_role = NEW.sender_role,
      last_message_at = NEW.created_at,
      updated_at = NOW()
  WHERE id = NEW.channel_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_chat_channel_on_message ON public.chat_messages;
CREATE TRIGGER update_chat_channel_on_message
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_chat_channel_on_message();

-- Trigger for chat_channels updated_at
DROP TRIGGER IF EXISTS update_chat_channels_updated_at ON public.chat_channels;
CREATE TRIGGER update_chat_channels_updated_at BEFORE UPDATE ON public.chat_channels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_channels;

