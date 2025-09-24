# Tuya Device Status Polling - Supabase Edge Functions

This directory contains Supabase Edge Functions for polling Tuya device status and storing telemetry data in real-time.

## Functions

### 1. `poll-status` - Automated Status Polling
- **Purpose**: Polls Tuya device status every 2 minutes (configurable)
- **Endpoint**: `https://your-project.supabase.co/functions/v1/poll-status`
- **Method**: GET/POST
- **Schedule**: Runs automatically via Supabase Scheduled Functions

### 2. `status-now` - Manual Status Check
- **Purpose**: Get current device status for testing
- **Endpoint**: `https://your-project.supabase.co/functions/v1/status-now`
- **Method**: GET/POST
- **Usage**: Manual trigger for testing and debugging

## Setup Instructions

### 1. Environment Variables

Set these environment variables in your Supabase project:

```bash
# Tuya API Configuration
TUYA_BASE_URL=https://openapi.tuyaeu.com
TUYA_CLIENT_ID=your_tuya_client_id
TUYA_CLIENT_SECRET=your_tuya_client_secret
UID=your_tuya_uid
DEVICE_ID=your_device_id

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional: Polling interval in minutes (default: 2)
POLL_MINUTES=2
```

### 2. Database Migration

Run the telemetry tables migration:

```sql
-- The migration file: supabase/migrations/20250125000000_create_telemetry_tables.sql
-- This creates:
-- - telemetry_current: Latest status for each device/code
-- - telemetry_history: Time series data for important metrics
```

### 3. Deploy Functions

```bash
# Deploy all functions
supabase functions deploy poll-status
supabase functions deploy status-now

# Or deploy all at once
supabase functions deploy
```

### 4. Enable Scheduled Function

In your Supabase Dashboard:

1. Go to **Database** → **Cron**
2. Click **New Cron Job**
3. Configure:
   - **Name**: `poll-tuya-status`
   - **Schedule**: `*/2 * * * *` (every 2 minutes)
   - **Function**: `poll-status`
   - **Method**: `POST`
   - **Headers**: `Content-Type: application/json`
   - **Body**: `{}`

### 5. Test the Setup

```bash
# Test manual status check
curl -X POST https://your-project.supabase.co/functions/v1/status-now \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"

# Test scheduled function manually
curl -X POST https://your-project.supabase.co/functions/v1/poll-status \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

## Data Structure

### Telemetry Current Table
```sql
CREATE TABLE telemetry_current (
    id BIGSERIAL PRIMARY KEY,
    device_id TEXT NOT NULL,
    code TEXT NOT NULL,           -- e.g., 'WInTemp', 'Power', 'SetTemp'
    value JSONB NOT NULL,         -- The actual value (number, boolean, string)
    updated_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    UNIQUE(device_id, code)
);
```

### Telemetry History Table
```sql
CREATE TABLE telemetry_history (
    id BIGSERIAL PRIMARY KEY,
    device_id TEXT NOT NULL,
    code TEXT NOT NULL,
    value JSONB NOT NULL,
    ts BIGINT NOT NULL,           -- Unix timestamp in milliseconds
    created_at TIMESTAMPTZ NOT NULL
);
```

## Monitored Status Codes

The system tracks these important Tuya status codes:

- **WInTemp**: Water temperature (number)
- **Power**: Device power state (boolean)
- **SetTemp**: Target temperature setting (number)
- **DCFanSpeed**: DC fan speed (number)
- **ACFanSpeed**: AC fan speed (number)

All other status codes are stored in `telemetry_current` but only important ones are tracked in `telemetry_history`.

## Real-time Updates

The `telemetry_current` table is enabled for Supabase Realtime, so your frontend and iOS apps can subscribe to live updates:

```javascript
// Subscribe to real-time updates
const subscription = supabase
  .channel('telemetry')
  .on('postgres_changes', 
    { 
      event: '*', 
      schema: 'public', 
      table: 'telemetry_current',
      filter: `device_id=eq.${DEVICE_ID}`
    }, 
    (payload) => {
      console.log('Device status updated:', payload);
      // Update your UI with new status
    }
  )
  .subscribe();
```

## Error Handling

The functions include robust error handling:

- **Token Refresh**: Automatically refreshes Tuya access tokens when expired
- **Rate Limiting**: Graceful handling of Tuya API rate limits
- **Retry Logic**: Single retry attempt for failed requests
- **Structured Logging**: Detailed error logging for debugging

## Monitoring

Check function logs in Supabase Dashboard:
1. Go to **Edge Functions** → **Logs**
2. Select your function (`poll-status` or `status-now`)
3. Monitor execution times and errors

## Troubleshooting

### Common Issues

1. **"Missing required environment variables"**
   - Ensure all environment variables are set in Supabase project settings

2. **"Token request failed: 401"**
   - Check TUYA_CLIENT_ID and TUYA_CLIENT_SECRET are correct
   - Verify UID is correct for your Tuya account

3. **"Device status request failed: 404"**
   - Check DEVICE_ID is correct
   - Ensure device is online in Tuya Smart Life app

4. **"Failed to upsert telemetry_current"**
   - Check SUPABASE_SERVICE_ROLE_KEY has proper permissions
   - Verify telemetry tables exist (run migration)

### Debug Mode

For debugging, you can temporarily increase logging by modifying the functions to include more detailed console.log statements.

## Security Notes

- Environment variables are stored securely in Supabase
- Service role key has full database access (required for upserts)
- RLS policies restrict access to authenticated users for reads
- Tuya API credentials should be kept secure and rotated regularly
