-- Security hardening for pool heating system
-- Additional security measures for production deployment

-- 1. Ensure all tables have proper RLS policies
-- (Most are already enabled, but let's verify and strengthen)

-- 2. Add more restrictive policies for automation_log
-- Only allow service role to insert/update automation logs
DROP POLICY IF EXISTS "Service role can manage automation log" ON public.automation_log;
CREATE POLICY "Service role can manage automation log" 
ON public.automation_log 
FOR ALL 
USING (auth.role() = 'service_role');

-- 3. Add more restrictive policies for heat_pump_status
-- Only allow service role to manage heat pump status
DROP POLICY IF EXISTS "Service role can manage heat pump status" ON public.heat_pump_status;
CREATE POLICY "Service role can manage heat pump status" 
ON public.heat_pump_status 
FOR ALL 
USING (auth.role() = 'service_role');

-- 4. Add more restrictive policies for price_data
-- Only allow service role to manage price data
DROP POLICY IF EXISTS "Service role can manage price data" ON public.price_data;
CREATE POLICY "Service role can manage price data" 
ON public.price_data 
FOR ALL 
USING (auth.role() = 'service_role');

-- 5. Ensure tuya_config and tuya_tokens are properly secured
-- Only allow service role to manage Tuya configuration
DROP POLICY IF EXISTS "Service role can manage tuya config" ON public.tuya_config;
CREATE POLICY "Service role can manage tuya config" 
ON public.tuya_config 
FOR ALL 
USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can manage tuya tokens" ON public.tuya_tokens;
CREATE POLICY "Service role can manage tuya tokens" 
ON public.tuya_tokens 
FOR ALL 
USING (auth.role() = 'service_role');

-- 6. Add audit logging for sensitive operations
-- Create a simple audit log table for tracking important changes
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
  old_values JSONB,
  new_values JSONB,
  user_id TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Only service role can read audit logs
CREATE POLICY "Service role can read audit log" 
ON public.audit_log 
FOR SELECT 
USING (auth.role() = 'service_role');

-- 7. Add function to log sensitive operations
CREATE OR REPLACE FUNCTION public.log_audit_event(
  table_name TEXT,
  operation TEXT,
  old_values JSONB DEFAULT NULL,
  new_values JSONB DEFAULT NULL,
  user_id TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.audit_log (table_name, operation, old_values, new_values, user_id)
  VALUES (table_name, operation, old_values, new_values, user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION public.log_audit_event TO service_role;

-- 8. Add comments for documentation
COMMENT ON SCHEMA extensions IS 'Dedicated schema for PostgreSQL extensions - isolated from public schema for security';
COMMENT ON TABLE public.audit_log IS 'Audit log for tracking sensitive operations in the pool heating system';
COMMENT ON FUNCTION public.log_audit_event IS 'Function to log audit events for security monitoring';
