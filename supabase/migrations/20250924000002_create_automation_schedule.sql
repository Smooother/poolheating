-- Create automation schedule table for daily planning
CREATE TABLE public.automation_schedule (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  hour INTEGER NOT NULL CHECK (hour >= 0 AND hour <= 23),
  price_value NUMERIC(6,4) NOT NULL,
  price_classification TEXT NOT NULL CHECK (price_classification IN ('low', 'normal', 'high', 'shutdown')),
  target_temperature NUMERIC(4,1),
  reason TEXT NOT NULL,
  executed BOOLEAN NOT NULL DEFAULT false,
  executed_at TIMESTAMP WITH TIME ZONE,
  execution_result TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.automation_schedule ENABLE ROW LEVEL SECURITY;

-- Create policies for automation schedule
CREATE POLICY "Automation schedule is publicly readable" 
ON public.automation_schedule 
FOR SELECT 
USING (true);

CREATE POLICY "Service role can manage automation schedule" 
ON public.automation_schedule 
FOR ALL 
USING (true);

-- Create indexes for efficient queries
CREATE INDEX idx_automation_schedule_date_hour ON public.automation_schedule(date, hour);
CREATE INDEX idx_automation_schedule_executed ON public.automation_schedule(executed);
CREATE INDEX idx_automation_schedule_date ON public.automation_schedule(date);

-- Create unique constraint to prevent duplicate schedules
CREATE UNIQUE INDEX idx_automation_schedule_unique ON public.automation_schedule(date, hour);
