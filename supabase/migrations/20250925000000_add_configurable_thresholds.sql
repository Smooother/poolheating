-- Add configurable threshold and offset fields to automation_settings
ALTER TABLE public.automation_settings
ADD COLUMN IF NOT EXISTS low_price_threshold NUMERIC(3,2) NOT NULL DEFAULT 0.70,
ADD COLUMN IF NOT EXISTS high_price_threshold NUMERIC(3,2) NOT NULL DEFAULT 1.30,
ADD COLUMN IF NOT EXISTS low_temp_offset NUMERIC(3,1) NOT NULL DEFAULT 2.0,
ADD COLUMN IF NOT EXISTS high_temp_offset NUMERIC(3,1) NOT NULL DEFAULT 2.0,
ADD COLUMN IF NOT EXISTS rolling_days INTEGER NOT NULL DEFAULT 7;

-- Update existing settings with new default values
UPDATE public.automation_settings 
SET 
  low_price_threshold = 0.70,
  high_price_threshold = 1.30,
  low_temp_offset = 2.0,
  high_temp_offset = 2.0,
  rolling_days = 7,
  min_pump_temp = 18.0,
  max_pump_temp = 32.0
WHERE user_id = 'default';

-- Add comments to explain the new fields
COMMENT ON COLUMN public.automation_settings.low_price_threshold IS 'Price threshold for low price classification (multiplier of average price)';
COMMENT ON COLUMN public.automation_settings.high_price_threshold IS 'Price threshold for high price classification (multiplier of average price)';
COMMENT ON COLUMN public.automation_settings.low_temp_offset IS 'Temperature increase during low price periods (degrees Celsius)';
COMMENT ON COLUMN public.automation_settings.high_temp_offset IS 'Temperature decrease during high price periods (degrees Celsius)';
COMMENT ON COLUMN public.automation_settings.rolling_days IS 'Number of days for rolling average calculation';
