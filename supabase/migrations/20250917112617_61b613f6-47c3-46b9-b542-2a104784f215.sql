-- Create a table to persist Tuya configuration so it survives preview URL changes
-- This stores a single shared config row with id = 'default'

-- Create table
CREATE TABLE IF NOT EXISTS public.tuya_config (
  id text PRIMARY KEY DEFAULT 'default',
  client_id text NOT NULL DEFAULT '',
  client_secret text NOT NULL DEFAULT '',
  uid text NOT NULL DEFAULT '',
  device_id text NOT NULL DEFAULT '',
  dp_power_code text NOT NULL DEFAULT 'Power',
  dp_settemp_code text NOT NULL DEFAULT 'SetTemp',
  dp_mode_code text NOT NULL DEFAULT 'SetMode',
  dp_silent_code text NOT NULL DEFAULT 'SilentMdoe',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS (note: open policies below restrict to the single default row)
ALTER TABLE public.tuya_config ENABLE ROW LEVEL SECURITY;

-- Policies: allow anyone (anon) to read/insert/update the single default row
CREATE POLICY "Allow read default tuya_config"
ON public.tuya_config
FOR SELECT
USING (id = 'default');

CREATE POLICY "Allow insert default tuya_config"
ON public.tuya_config
FOR INSERT
WITH CHECK (id = 'default');

CREATE POLICY "Allow update default tuya_config"
ON public.tuya_config
FOR UPDATE
USING (id = 'default');

-- Keep updated_at fresh
CREATE TRIGGER update_tuya_config_updated_at
BEFORE UPDATE ON public.tuya_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();