-- Margin management, versioning, competitor pricing, and quality ratings
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.provider_margin_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID REFERENCES public.providers(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  category TEXT,
  margin_type TEXT NOT NULL DEFAULT 'percent' CHECK (margin_type IN ('percent', 'fixed')),
  margin_value DECIMAL(10, 4) NOT NULL DEFAULT 0.00,
  min_margin DECIMAL(10, 4),
  max_margin DECIMAL(10, 4),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  priority INTEGER NOT NULL DEFAULT 100,
  effective_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  effective_to TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.provider_margin_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID REFERENCES public.providers(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'csv', 'template', 'api')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.provider_margin_version_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version_id UUID NOT NULL REFERENCES public.provider_margin_versions(id) ON DELETE CASCADE,
  provider_service_id TEXT NOT NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  old_margin_type TEXT,
  old_margin_value DECIMAL(10, 4),
  new_margin_type TEXT,
  new_margin_value DECIMAL(10, 4),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.competitor_prices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
  provider_name TEXT NOT NULL,
  price_per_1000 DECIMAL(10, 4) NOT NULL DEFAULT 0.00,
  quality_score INTEGER DEFAULT 0,
  delivery_time_hours INTEGER DEFAULT 0,
  captured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.provider_quality_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  quality_score INTEGER NOT NULL DEFAULT 3 CHECK (quality_score BETWEEN 1 AND 5),
  notes TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'provider_margin_rules_unique_scope'
      AND conrelid = 'public.provider_margin_rules'::regclass
  ) THEN
    ALTER TABLE public.provider_margin_rules
      ADD CONSTRAINT provider_margin_rules_unique_scope
      UNIQUE (provider_id, service_id, category, margin_type, margin_value, active, priority);
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_provider_margin_rules_provider_id ON public.provider_margin_rules(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_margin_rules_service_id ON public.provider_margin_rules(service_id);
CREATE INDEX IF NOT EXISTS idx_provider_margin_rules_category ON public.provider_margin_rules(category);
CREATE INDEX IF NOT EXISTS idx_provider_margin_rules_active ON public.provider_margin_rules(active);
CREATE INDEX IF NOT EXISTS idx_provider_margin_rules_priority ON public.provider_margin_rules(priority);

CREATE INDEX IF NOT EXISTS idx_provider_margin_versions_provider_id ON public.provider_margin_versions(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_margin_version_items_version_id ON public.provider_margin_version_items(version_id);
CREATE INDEX IF NOT EXISTS idx_competitor_prices_service_id ON public.competitor_prices(service_id);
CREATE INDEX IF NOT EXISTS idx_provider_quality_ratings_provider_id ON public.provider_quality_ratings(provider_id);

ALTER TABLE public.provider_margin_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_margin_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_margin_version_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_quality_ratings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'provider_margin_rules'
      AND policyname = 'Admins can manage margin rules'
  ) THEN
    CREATE POLICY "Admins can manage margin rules"
      ON public.provider_margin_rules FOR ALL
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
      AND tablename = 'provider_margin_versions'
      AND policyname = 'Admins can manage margin versions'
  ) THEN
    CREATE POLICY "Admins can manage margin versions"
      ON public.provider_margin_versions FOR ALL
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
      AND tablename = 'provider_margin_version_items'
      AND policyname = 'Admins can manage margin version items'
  ) THEN
    CREATE POLICY "Admins can manage margin version items"
      ON public.provider_margin_version_items FOR ALL
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
      AND tablename = 'competitor_prices'
      AND policyname = 'Admins can manage competitor prices'
  ) THEN
    CREATE POLICY "Admins can manage competitor prices"
      ON public.competitor_prices FOR ALL
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
      AND tablename = 'provider_quality_ratings'
      AND policyname = 'Admins can manage provider quality ratings'
  ) THEN
    CREATE POLICY "Admins can manage provider quality ratings"
      ON public.provider_quality_ratings FOR ALL
      USING (public.is_admin(auth.uid()))
      WITH CHECK (public.is_admin(auth.uid()));
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS update_provider_margin_rules_updated_at ON public.provider_margin_rules;
CREATE TRIGGER update_provider_margin_rules_updated_at
  BEFORE UPDATE ON public.provider_margin_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

