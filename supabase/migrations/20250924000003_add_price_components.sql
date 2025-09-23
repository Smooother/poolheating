-- Add price component fields to price_data table
ALTER TABLE public.price_data 
ADD COLUMN IF NOT EXISTS energy_price DECIMAL(10,4),
ADD COLUMN IF NOT EXISTS tax_price DECIMAL(10,4),
ADD COLUMN IF NOT EXISTS net_fee DECIMAL(10,4),
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'elpriset';

-- Add comment to explain price composition
COMMENT ON COLUMN public.price_data.price_value IS 'Total price paid by consumer (energy + tax + net fee)';
COMMENT ON COLUMN public.price_data.energy_price IS 'Base electricity price (spot market)';
COMMENT ON COLUMN public.price_data.tax_price IS 'Tax component of total price';
COMMENT ON COLUMN public.price_data.net_fee IS 'Network transmission fee';
COMMENT ON COLUMN public.price_data.source IS 'Data source: elpriset, tibber, etc.';
