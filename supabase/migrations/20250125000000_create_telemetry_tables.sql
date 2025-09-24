-- Create telemetry tables for Tuya device status tracking
-- This migration creates tables for real-time device status and historical data

-- Table for current device status (latest values)
CREATE TABLE IF NOT EXISTS public.telemetry_current (
    id BIGSERIAL PRIMARY KEY,
    device_id TEXT NOT NULL,
    code TEXT NOT NULL,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure one record per device_id + code combination
    UNIQUE(device_id, code)
);

-- Table for historical device status (time series data)
CREATE TABLE IF NOT EXISTS public.telemetry_history (
    id BIGSERIAL PRIMARY KEY,
    device_id TEXT NOT NULL,
    code TEXT NOT NULL,
    value JSONB NOT NULL,
    ts BIGINT NOT NULL, -- Unix timestamp in milliseconds
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_telemetry_current_device_id ON public.telemetry_current(device_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_current_code ON public.telemetry_current(code);
CREATE INDEX IF NOT EXISTS idx_telemetry_current_updated_at ON public.telemetry_current(updated_at);

CREATE INDEX IF NOT EXISTS idx_telemetry_history_device_id ON public.telemetry_history(device_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_history_code ON public.telemetry_history(code);
CREATE INDEX IF NOT EXISTS idx_telemetry_history_ts ON public.telemetry_history(ts);
CREATE INDEX IF NOT EXISTS idx_telemetry_history_device_code_ts ON public.telemetry_history(device_id, code, ts);

-- Enable Row Level Security
ALTER TABLE public.telemetry_current ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemetry_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for telemetry_current
CREATE POLICY "Allow service role full access to telemetry_current" ON public.telemetry_current
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow authenticated users to read telemetry_current" ON public.telemetry_current
    FOR SELECT USING (auth.role() = 'authenticated');

-- RLS Policies for telemetry_history
CREATE POLICY "Allow service role full access to telemetry_history" ON public.telemetry_history
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow authenticated users to read telemetry_history" ON public.telemetry_history
    FOR SELECT USING (auth.role() = 'authenticated');

-- Enable Realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.telemetry_current;

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_telemetry_current_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at on telemetry_current
CREATE TRIGGER trigger_update_telemetry_current_updated_at
    BEFORE UPDATE ON public.telemetry_current
    FOR EACH ROW
    EXECUTE FUNCTION update_telemetry_current_updated_at();

-- Insert some initial data for testing (optional)
-- INSERT INTO public.telemetry_current (device_id, code, value) VALUES
--     ('bf65ca8db8b207052feu5u', 'Power', false),
--     ('bf65ca8db8b207052feu5u', 'WInTemp', 20.5),
--     ('bf65ca8db8b207052feu5u', 'SetTemp', 25),
--     ('bf65ca8db8b207052feu5u', 'DCFanSpeed', 0)
-- ON CONFLICT (device_id, code) DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE public.telemetry_current IS 'Current device status - latest values for each device and status code';
COMMENT ON TABLE public.telemetry_history IS 'Historical device status - time series data for important metrics';

COMMENT ON COLUMN public.telemetry_current.device_id IS 'Tuya device ID';
COMMENT ON COLUMN public.telemetry_current.code IS 'Tuya status code (e.g., WInTemp, Power, SetTemp)';
COMMENT ON COLUMN public.telemetry_current.value IS 'Status value (can be number, boolean, string, etc.)';
COMMENT ON COLUMN public.telemetry_current.updated_at IS 'When this status was last updated';

COMMENT ON COLUMN public.telemetry_history.device_id IS 'Tuya device ID';
COMMENT ON COLUMN public.telemetry_history.code IS 'Tuya status code (e.g., WInTemp, Power, SetTemp)';
COMMENT ON COLUMN public.telemetry_history.value IS 'Status value (can be number, boolean, string, etc.)';
COMMENT ON COLUMN public.telemetry_history.ts IS 'Unix timestamp in milliseconds when this status was recorded';
