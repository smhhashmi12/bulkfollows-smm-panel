ALTER TABLE public.services
  ALTER COLUMN rate_per_1000 TYPE DECIMAL(18, 6),
  ALTER COLUMN min_quantity TYPE BIGINT,
  ALTER COLUMN max_quantity TYPE BIGINT;

ALTER TABLE public.provider_services
  ALTER COLUMN provider_rate TYPE DECIMAL(18, 6),
  ALTER COLUMN our_rate TYPE DECIMAL(18, 6),
  ALTER COLUMN min_quantity TYPE BIGINT,
  ALTER COLUMN max_quantity TYPE BIGINT;
