# Supabase Edge Functions Deployment Guide

## Prerequisites

1. **Supabase CLI installed** ✅ (Done via Homebrew)
2. **Supabase project linked** (Need to do manually)
3. **Environment variables set** (Need to do manually)

## Step-by-Step Deployment

### 1. Login to Supabase CLI

```bash
supabase login
```

This will open a browser window for authentication. Follow the prompts to login with your Supabase account.

### 2. Link to Your Project

```bash
supabase link --project-ref bagcdhlbkicwtepflczr
```

### 3. Set Environment Variables

Go to: https://supabase.com/dashboard/project/bagcdhlbkicwtepflczr/settings/functions

Add these environment variables:

```bash
TUYA_BASE_URL=https://openapi.tuyaeu.com
TUYA_CLIENT_ID=dn98qycejwjndescfprj
TUYA_CLIENT_SECRET=21c50cb2a91a4491b18025373e742272
UID=19DZ10YT
DEVICE_ID=bf65ca8db8b207052feu5u
SUPABASE_URL=https://bagcdhlbkicwtepflczr.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhZ2NkaGxia2ljd3RlcGZsY3pyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODA5NjM2OCwiZXhwIjoyMDczNjcyMzY4fQ.bOobKwGFgmyKOUgxYhwXjwzPToXA6IcFQvzQtr1GLJA
POLL_MINUTES=2
```

### 4. Deploy the Functions

```bash
# Deploy both functions
supabase functions deploy poll-status
supabase functions deploy status-now

# Or deploy all at once
supabase functions deploy
```

### 5. Run Database Migration

Apply the telemetry tables migration:

```sql
-- Run this in Supabase SQL Editor or via CLI
-- File: supabase/migrations/20250125000000_create_telemetry_tables.sql
```

### 6. Set Up Scheduled Function

In Supabase Dashboard:

1. Go to **Database** → **Cron**
2. Click **New Cron Job**
3. Configure:
   - **Name**: `poll-tuya-status`
   - **Schedule**: `*/2 * * * *` (every 2 minutes)
   - **Function**: `poll-status`
   - **Method**: `POST`
   - **Headers**: `Content-Type: application/json`
   - **Body**: `{}`

### 7. Test the Setup

```bash
# Test manual status check
curl -X POST https://bagcdhlbkicwtepflczr.supabase.co/functions/v1/status-now \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"

# Test scheduled function manually
curl -X POST https://bagcdhlbkicwtepflczr.supabase.co/functions/v1/poll-status \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

## Alternative: Manual Deployment via Dashboard

If CLI deployment doesn't work, you can deploy manually:

1. **Go to Supabase Dashboard** → **Edge Functions**
2. **Create New Function**:
   - Name: `poll-status`
   - Copy content from `supabase/functions/poll-status/index.ts`
3. **Create New Function**:
   - Name: `status-now`
   - Copy content from `supabase/functions/status-now/index.ts`
4. **Add environment variables** in function settings
5. **Deploy each function**

## Troubleshooting

### Common Issues

1. **"Access token not provided"**
   - Run `supabase login` first

2. **"Project not linked"**
   - Run `supabase link --project-ref bagcdhlbkicwtepflczr`

3. **"Environment variables not found"**
   - Add them in Supabase Dashboard → Settings → Edge Functions

4. **"Function deployment failed"**
   - Check function syntax and dependencies
   - Ensure all imports are correct

### Verification

After deployment, you should see:

- ✅ Functions listed in Supabase Dashboard → Edge Functions
- ✅ Environment variables configured
- ✅ Scheduled function running every 2 minutes
- ✅ Telemetry tables created in database
- ✅ Real-time updates working

## Next Steps

Once deployed:

1. **Monitor function logs** in Supabase Dashboard
2. **Check telemetry data** in database tables
3. **Test real-time updates** in your frontend
4. **Verify scheduled execution** is working

## Support

If you encounter issues:

1. Check Supabase function logs
2. Verify environment variables
3. Test with manual function calls
4. Check database permissions