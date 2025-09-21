-- Add new automation settings columns
ALTER TABLE public.automation_settings 
ADD COLUMN IF NOT EXISTS average_days INTEGER NOT NULL DEFAULT 7,
ADD COLUMN IF NOT EXISTS high_price_threshold NUMERIC NOT NULL DEFAULT 1.50,
ADD COLUMN IF NOT EXISTS low_price_multiplier NUMERIC NOT NULL DEFAULT 0.70,
ADD COLUMN IF NOT EXISTS high_price_multiplier NUMERIC NOT NULL DEFAULT 1.30;

-- Update existing default settings
UPDATE public.automation_settings 
SET 
  average_days = 7,
  high_price_threshold = 1.50,
  low_price_multiplier = 0.70,
  high_price_multiplier = 1.30
WHERE user_id = 'default';
