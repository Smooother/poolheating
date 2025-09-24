-- Fix database schema issues
-- This script adds missing columns and tables

-- 1. Add missing columns to price_data table
ALTER TABLE public.price_data 
ADD COLUMN IF NOT EXISTS energy_price DECIMAL(10,4),
ADD COLUMN IF NOT EXISTS tax_price DECIMAL(10,4),
ADD COLUMN IF NOT EXISTS net_fee DECIMAL(10,4),
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'elpriset';

-- Add comments to explain price composition
COMMENT ON COLUMN public.price_data.price_value IS 'Total price paid by consumer (energy + tax + net fee)';
COMMENT ON COLUMN public.price_data.energy_price IS 'Base electricity price (spot market)';
COMMENT ON COLUMN public.price_data.tax_price IS 'Tax component of total price';
COMMENT ON COLUMN public.price_data.net_fee IS 'Network transmission fee';
COMMENT ON COLUMN public.price_data.source IS 'Data source: elpriset, tibber, etc.';

-- 2. Add missing columns to automation_settings table
ALTER TABLE public.automation_settings 
ADD COLUMN IF NOT EXISTS low_price_threshold DECIMAL(3,2) DEFAULT 0.70,
ADD COLUMN IF NOT EXISTS high_price_threshold DECIMAL(3,2) DEFAULT 1.30,
ADD COLUMN IF NOT EXISTS low_temp_offset DECIMAL(3,1) DEFAULT 2.0,
ADD COLUMN IF NOT EXISTS high_temp_offset DECIMAL(3,1) DEFAULT 2.0,
ADD COLUMN IF NOT EXISTS rolling_days INTEGER DEFAULT 7;

-- 3. Create system_info table
CREATE TABLE IF NOT EXISTS public.system_info (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  data_point TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  unit TEXT NOT NULL,
  status TEXT NOT NULL,
  last_fetched TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.system_info ENABLE ROW LEVEL SECURITY;

-- Create policies for system_info
CREATE POLICY "Allow read system info" 
ON public.system_info 
FOR SELECT 
USING (true);

CREATE POLICY "Allow insert system info" 
ON public.system_info 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow update system info" 
ON public.system_info 
FOR UPDATE 
USING (true);

-- Insert initial system info data points
INSERT INTO public.system_info (data_point, value, unit, status) VALUES
('heat_pump_power', 'unknown', 'status', 'unknown'),
('heat_pump_water_temp', '0', '°C', 'unknown'),
('heat_pump_target_temp', '0', '°C', 'unknown'),
('heat_pump_online', 'false', 'status', 'unknown'),
('automation_enabled', 'false', 'status', 'unknown'),
('heat_pump_fan_speed', '0', '%', 'unknown')
ON CONFLICT (data_point) DO NOTHING;

-- Add comment to explain the table
COMMENT ON TABLE public.system_info IS 'Stores critical system data points with timestamps for tracking system status';
COMMENT ON COLUMN public.system_info.data_point IS 'Name of the data point (e.g., heat_pump_power, water_temp)';
COMMENT ON COLUMN public.system_info.value IS 'Current value of the data point';
COMMENT ON COLUMN public.system_info.unit IS 'Unit of measurement (e.g., °C, %, status)';
COMMENT ON COLUMN public.system_info.status IS 'Status indicator (e.g., online, offline, enabled, disabled)';
COMMENT ON COLUMN public.system_info.last_fetched IS 'Timestamp when this data point was last updated';

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for system_info
DROP TRIGGER IF EXISTS update_system_info_updated_at ON public.system_info;
CREATE TRIGGER update_system_info_updated_at
    BEFORE UPDATE ON public.system_info
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
