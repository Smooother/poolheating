-- Add source field to heat_pump_status table to track data origin
ALTER TABLE public.heat_pump_status 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'api';

-- Update existing records to have 'api' as source
UPDATE public.heat_pump_status 
SET source = 'api' 
WHERE source IS NULL;
