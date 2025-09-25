-- Create command queue table for Pulsar-based command processing
CREATE TABLE IF NOT EXISTS command_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    device_id TEXT NOT NULL,
    command JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_command_queue_device_status ON command_queue(device_id, status);
CREATE INDEX IF NOT EXISTS idx_command_queue_created_at ON command_queue(created_at);

-- Enable RLS
ALTER TABLE command_queue ENABLE ROW LEVEL SECURITY;

-- Create policy for service role access
CREATE POLICY "Service role can manage command queue" ON command_queue
    FOR ALL USING (auth.role() = 'service_role');

-- Create policy for authenticated users to read their commands
CREATE POLICY "Users can read command queue" ON command_queue
    FOR SELECT USING (auth.role() = 'authenticated');
