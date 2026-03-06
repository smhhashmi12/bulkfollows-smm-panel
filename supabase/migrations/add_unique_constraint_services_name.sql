-- Add unique constraint to services.name column to enable upsert operations
-- This allows sync-provider-services.ts to use: .upsert(localServices, { onConflict: 'name' })

ALTER TABLE public.services
ADD CONSTRAINT services_name_key UNIQUE (name);
