-- Create heat pump status table for real-time data
CREATE TABLE public.heat_pump_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL,
  current_temp NUMERIC(4,1) NOT NULL,
  water_temp NUMERIC(4,1) NOT NULL,
  target_temp NUMERIC(4,1) NOT NULL,
  speed_percentage INTEGER NOT NULL CHECK (speed_percentage >= 0 AND speed_percentage <= 100),
  power_status TEXT NOT NULL CHECK (power_status IN ('on', 'off', 'standby')),
  mode TEXT,
  is_online BOOLEAN NOT NULL DEFAULT true,
  last_communication TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.heat_pump_status ENABLE ROW LEVEL SECURITY;

-- Create policies for heat pump status
CREATE POLICY "Heat pump status is publicly readable" 
ON public.heat_pump_status 
FOR SELECT 
USING (true);

CREATE POLICY "Service role can manage heat pump status" 
ON public.heat_pump_status 
FOR ALL 
USING (true);

-- Create index for efficient queries
CREATE INDEX idx_heat_pump_status_device_id ON public.heat_pump_status(device_id);
CREATE INDEX idx_heat_pump_status_updated_at ON public.heat_pump_status(updated_at DESC);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_heat_pump_status_updated_at
BEFORE UPDATE ON public.heat_pump_status
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for this table
ALTER TABLE public.heat_pump_status REPLICA IDENTITY FULL;