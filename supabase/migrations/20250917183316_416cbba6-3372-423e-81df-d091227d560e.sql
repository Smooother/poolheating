-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create cron job to run price automation every 15 minutes
SELECT cron.schedule(
  'price-automation-job',
  '*/15 * * * *', -- every 15 minutes
  $$
  SELECT
    net.http_post(
        url:='https://bagcdhlbkicwtepflczr.supabase.co/functions/v1/price-automation',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhZ2NkaGxia2ljd3RlcGZsY3pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwOTYzNjgsImV4cCI6MjA3MzY3MjM2OH0.JrQKwkxywib7I8149n7Jg6xhRk5aPDKIv3wBVV0MYyU"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);