-- Add net fee configuration to automation settings
ALTER TABLE public.automation_settings 
ADD COLUMN IF NOT EXISTS net_fee_per_kwh NUMERIC(6,4) DEFAULT 0.30,
ADD COLUMN IF NOT EXISTS electricity_provider TEXT DEFAULT 'tibber';

-- Add comment to explain net fee
COMMENT ON COLUMN public.automation_settings.net_fee_per_kwh IS 'Network transmission fee in SEK/kWh (typically 20-40 öre/kWh)';
COMMENT ON COLUMN public.automation_settings.electricity_provider IS 'Primary electricity price provider: tibber, elpriset';

-- Update existing records with default net fee
UPDATE public.automation_settings 
SET net_fee_per_kwh = 0.30, electricity_provider = 'tibber'
WHERE net_fee_per_kwh IS NULL OR electricity_provider IS NULL;
