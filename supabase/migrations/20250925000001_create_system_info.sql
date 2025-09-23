-- Create system_info table for tracking critical system data points
CREATE TABLE public.system_info (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data_point TEXT NOT NULL,
  value TEXT NOT NULL,
  unit TEXT,
  status TEXT,
  last_fetched TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient queries
CREATE INDEX idx_system_info_data_point ON public.system_info(data_point);
CREATE INDEX idx_system_info_last_fetched ON public.system_info(last_fetched);

-- Enable RLS
ALTER TABLE public.system_info ENABLE ROW LEVEL SECURITY;

-- Create policies
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
('automation_enabled', 'false', 'status', 'unknown');

-- Add comment to explain the table
COMMENT ON TABLE public.system_info IS 'Stores critical system data points with timestamps for tracking system status';
COMMENT ON COLUMN public.system_info.data_point IS 'Name of the data point (e.g., heat_pump_power, water_temp)';
COMMENT ON COLUMN public.system_info.value IS 'Current value of the data point';
COMMENT ON COLUMN public.system_info.unit IS 'Unit of measurement (e.g., °C, status)';
COMMENT ON COLUMN public.system_info.status IS 'Status of the data point (e.g., online, offline, error)';
COMMENT ON COLUMN public.system_info.last_fetched IS 'When this data point was last updated from the source';
