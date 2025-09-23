-- Create telemetry_history table for storing historical device data
CREATE TABLE public.telemetry_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL,
  data JSONB NOT NULL, -- Store the full device status as JSON
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  source TEXT NOT NULL DEFAULT 'webhook', -- 'webhook', 'api', 'manual'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.telemetry_history ENABLE ROW LEVEL SECURITY;

-- Create policies for telemetry history
CREATE POLICY "Telemetry history is publicly readable" 
ON public.telemetry_history 
FOR SELECT 
USING (true);

CREATE POLICY "Service role can manage telemetry history" 
ON public.telemetry_history 
FOR ALL 
USING (auth.role() = 'service_role');

-- Create indexes for efficient queries
CREATE INDEX idx_telemetry_history_device_id ON public.telemetry_history(device_id);
CREATE INDEX idx_telemetry_history_timestamp ON public.telemetry_history(timestamp DESC);
CREATE INDEX idx_telemetry_history_source ON public.telemetry_history(source);

-- Enable realtime for this table
ALTER TABLE public.telemetry_history REPLICA IDENTITY FULL;
