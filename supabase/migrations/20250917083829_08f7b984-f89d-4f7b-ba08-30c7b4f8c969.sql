-- Create table for storing Tuya access tokens
CREATE TABLE public.tuya_tokens (
  access_token TEXT PRIMARY KEY,
  refresh_token TEXT NOT NULL,
  expires_in INTEGER NOT NULL,
  expires_at BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.tuya_tokens ENABLE ROW LEVEL SECURITY;

-- Create policy to allow the service role to manage tokens
CREATE POLICY "Service role can manage tuya tokens" ON public.tuya_tokens
FOR ALL USING (true);

-- Create trigger for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tuya_tokens_updated_at
    BEFORE UPDATE ON public.tuya_tokens
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();