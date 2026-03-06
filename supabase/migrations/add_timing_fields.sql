-- Migration: Add timing fields to services table
-- Description: Add completion_time and time_pricing columns to support time-based dynamic pricing

ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS completion_time INTEGER DEFAULT 24,
ADD COLUMN IF NOT EXISTS time_pricing JSONB DEFAULT '{"6": 2.0, "12": 1.5, "24": 1.0, "48": 0.8, "72": 0.7}'::jsonb;

-- Add column to orders table to track selected delivery time
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS delivery_time INTEGER DEFAULT 24;

-- Create index on completion_time for faster queries
CREATE INDEX IF NOT EXISTS idx_services_completion_time ON public.services(completion_time);

-- Add updated_at trigger to orders table if not exists
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION update_orders_updated_at();
