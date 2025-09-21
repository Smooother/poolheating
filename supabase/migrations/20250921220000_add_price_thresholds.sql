-- Add price threshold settings to automation_settings table
ALTER TABLE public.automation_settings 
ADD COLUMN high_price_threshold NUMERIC NOT NULL DEFAULT 1.50, -- SEK/kWh - pump shuts down above this
ADD COLUMN low_price_threshold NUMERIC NOT NULL DEFAULT 0.05,  -- SEK/kWh - aggressive heating below this
ADD COLUMN normal_price_threshold NUMERIC NOT NULL DEFAULT 0.15; -- SEK/kWh - normal heating above this

-- Update existing record with default values
UPDATE public.automation_settings 
SET 
  high_price_threshold = 1.50,
  low_price_threshold = 0.05,
  normal_price_threshold = 0.15
WHERE user_id = 'default';

-- Add comment explaining the thresholds
COMMENT ON COLUMN public.automation_settings.high_price_threshold IS 'Price threshold in SEK/kWh above which pump shuts down completely';
COMMENT ON COLUMN public.automation_settings.low_price_threshold IS 'Price threshold in SEK/kWh below which aggressive heating (+2°C) is applied';
COMMENT ON COLUMN public.automation_settings.normal_price_threshold IS 'Price threshold in SEK/kWh above which normal heating is applied';
