-- Fix the search path security issue by recreating function and trigger
DROP TRIGGER IF EXISTS update_tuya_tokens_updated_at ON public.tuya_tokens;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_tuya_tokens_updated_at
    BEFORE UPDATE ON public.tuya_tokens
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();