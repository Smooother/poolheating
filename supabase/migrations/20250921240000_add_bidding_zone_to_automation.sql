-- Add bidding zone to automation settings
ALTER TABLE public.automation_settings 
ADD COLUMN IF NOT EXISTS bidding_zone TEXT NOT NULL DEFAULT 'SE3';

-- Update existing default settings with bidding zone
UPDATE public.automation_settings 
SET bidding_zone = 'SE3'
WHERE user_id = 'default';

-- Add comment for documentation
COMMENT ON COLUMN public.automation_settings.bidding_zone IS 'Electricity bidding zone for price data collection and automation (SE1, SE2, SE3, SE4)';
