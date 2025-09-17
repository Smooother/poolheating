-- Create table for storing price data
CREATE TABLE public.price_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bidding_zone TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  price_value DECIMAL(10,4) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'SEK',
  provider TEXT NOT NULL DEFAULT 'elpriset',
  resolution TEXT NOT NULL DEFAULT 'PT60M',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.price_data ENABLE ROW LEVEL SECURITY;

-- Create policies for price data (public read access since it's market data)
CREATE POLICY "Price data is publicly readable" 
ON public.price_data 
FOR SELECT 
USING (true);

-- Create policy for service role to manage price data
CREATE POLICY "Service role can manage price data" 
ON public.price_data 
FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role');

-- Create indexes for better performance
CREATE INDEX idx_price_data_bidding_zone_time ON public.price_data (bidding_zone, start_time);
CREATE INDEX idx_price_data_created_at ON public.price_data (created_at);

-- Create unique constraint to prevent duplicates
CREATE UNIQUE INDEX idx_price_data_unique ON public.price_data (bidding_zone, start_time, end_time, provider);

-- Create trigger for updating timestamps
CREATE TRIGGER update_price_data_updated_at
BEFORE UPDATE ON public.price_data
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();