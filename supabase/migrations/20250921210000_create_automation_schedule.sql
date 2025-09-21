-- Create automation schedule table
CREATE TABLE public.automation_schedule (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'default',
  scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
  price_value NUMERIC NOT NULL,
  price_classification TEXT NOT NULL, -- 'low', 'normal', 'high', 'shutdown'
  target_temperature NUMERIC,
  should_shutdown BOOLEAN NOT NULL DEFAULT false,
  reason TEXT NOT NULL,
  executed BOOLEAN NOT NULL DEFAULT false,
  executed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.automation_schedule ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow read default automation schedule" 
ON public.automation_schedule 
FOR SELECT 
USING (user_id = 'default');

CREATE POLICY "Service role can manage automation schedule" 
ON public.automation_schedule 
FOR ALL 
USING (true);

-- Create index for efficient querying
CREATE INDEX idx_automation_schedule_user_time ON public.automation_schedule (user_id, scheduled_time);
CREATE INDEX idx_automation_schedule_executed ON public.automation_schedule (executed, scheduled_time);
