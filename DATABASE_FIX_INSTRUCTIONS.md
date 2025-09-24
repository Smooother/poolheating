# Database Fix Instructions

The application is failing because of missing database schema. Here are the SQL commands to run in the Supabase SQL Editor to fix the issues:

## 1. Add Missing Columns to price_data Table

```sql
-- Add missing columns to price_data table
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
```

## 2. Add Missing Columns to automation_settings Table

```sql
-- Add missing columns to automation_settings table
ALTER TABLE public.automation_settings 
ADD COLUMN IF NOT EXISTS low_price_threshold DECIMAL(3,2) DEFAULT 0.70,
ADD COLUMN IF NOT EXISTS high_price_threshold DECIMAL(3,2) DEFAULT 1.30,
ADD COLUMN IF NOT EXISTS low_temp_offset DECIMAL(3,1) DEFAULT 2.0,
ADD COLUMN IF NOT EXISTS high_temp_offset DECIMAL(3,1) DEFAULT 2.0,
ADD COLUMN IF NOT EXISTS rolling_days INTEGER DEFAULT 7;
```

## 3. Create system_info Table

```sql
-- Create system_info table
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
```

## How to Apply These Fixes

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste each SQL block above
4. Run them one by one in order
5. After running all three blocks, test the application again

## Verification

After applying these fixes, you can verify they worked by:

1. Running the database fix API: `curl -X POST https://poolheating.vercel.app/api/fix-database`
2. Checking that the Dashboard loads without errors
3. Verifying that the System Information section shows the 6 critical data points

## What These Fixes Do

- **price_data table**: Adds columns for energy_price, tax_price, net_fee, and source to support price component breakdown
- **automation_settings table**: Adds configurable threshold columns for price analysis and temperature adjustments
- **system_info table**: Creates a new table to track critical system data points with timestamps for monitoring
