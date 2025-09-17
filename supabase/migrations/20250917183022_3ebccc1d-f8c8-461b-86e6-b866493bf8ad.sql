-- Create automation settings table
CREATE TABLE public.automation_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'default',
  target_pool_temp NUMERIC NOT NULL DEFAULT 28.0,
  automation_enabled BOOLEAN NOT NULL DEFAULT true,
  price_sensitivity NUMERIC NOT NULL DEFAULT 1.0, -- 0.5 = less sensitive, 2.0 = more sensitive
  temp_tolerance NUMERIC NOT NULL DEFAULT 2.0, -- Max degrees above/below target
  min_pump_temp NUMERIC NOT NULL DEFAULT 18.0,
  max_pump_temp NUMERIC NOT NULL DEFAULT 35.0,
  optimization_horizon_hours INTEGER NOT NULL DEFAULT 12, -- Hours to look ahead
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.automation_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow read default automation settings" 
ON public.automation_settings 
FOR SELECT 
USING (user_id = 'default');

CREATE POLICY "Allow update default automation settings" 
ON public.automation_settings 
FOR UPDATE 
USING (user_id = 'default');

CREATE POLICY "Allow insert default automation settings" 
ON public.automation_settings 
FOR INSERT 
WITH CHECK (user_id = 'default');

-- Insert default settings
INSERT INTO public.automation_settings (
  user_id, target_pool_temp, automation_enabled, price_sensitivity, temp_tolerance
) VALUES (
  'default', 28.0, true, 1.0, 2.0
) ON CONFLICT (user_id) DO NOTHING;

-- Create automation log table for tracking decisions
CREATE TABLE public.automation_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'default',
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  current_pool_temp NUMERIC,
  target_pool_temp NUMERIC NOT NULL,
  current_pump_temp NUMERIC,
  new_pump_temp NUMERIC NOT NULL,
  current_price NUMERIC NOT NULL,
  avg_price_forecast NUMERIC NOT NULL,
  price_classification TEXT NOT NULL, -- 'low', 'normal', 'high'
  action_reason TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on log table
ALTER TABLE public.automation_log ENABLE ROW LEVEL SECURITY;

-- Create policy for log table
CREATE POLICY "Allow read default automation log" 
ON public.automation_log 
FOR SELECT 
USING (user_id = 'default');

CREATE POLICY "Service role can manage automation log" 
ON public.automation_log 
FOR ALL 
USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_automation_settings_updated_at
BEFORE UPDATE ON public.automation_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();