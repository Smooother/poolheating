# Supabase Edge Functions - Real-time Tuya Polling Setup

## ✅ What's Working

We have successfully implemented a working solution for real-time Tuya device status polling using Supabase Edge Functions:

### 1. **simple-poll** Function
- **Purpose**: Manual trigger for testing and immediate status updates
- **Endpoint**: `https://bagcdhlbkicwtepflczr.supabase.co/functions/v1/simple-poll`
- **Method**: POST
- **Status**: ✅ Working perfectly
- **What it does**:
  - Calls the working Vercel API to get device status
  - Stores telemetry data in `telemetry_current` and `telemetry_history` tables
  - Returns device status and count of stored data points

### 2. **scheduled-poll** Function  
- **Purpose**: Automated polling every 2 minutes
- **Endpoint**: `https://bagcdhlbkicwtepflczr.supabase.co/functions/v1/scheduled-poll`
- **Method**: POST
- **Status**: ✅ Working perfectly
- **What it does**:
  - Same as simple-poll but designed for scheduled execution
  - Ready to be called by Supabase's scheduled functions

## 📊 Data Storage

The functions store the following telemetry data:

| Tuya Code | Database Field | Description | Example Value |
|-----------|----------------|-------------|---------------|
| `switch_led` | `power_status` | Device power on/off | "on" |
| `WInTemp` | `water_temp` | Water temperature | 27 |
| `temp_set` | `target_temp` | Target temperature | 28 |
| `fan_speed` | `speed_percentage` | Fan speed percentage | 80 |

## 🗄️ Database Tables

### `telemetry_current`
- Stores the latest value for each device status code
- Updated with `upsert` to maintain one record per device+code
- Used for real-time dashboard display

### `telemetry_history`  
- Stores historical time-series data
- New record inserted for each poll
- Used for charts and historical analysis

## ⏰ Setting Up Scheduled Execution

To enable automatic polling every 2 minutes:

### Option 1: Supabase Dashboard (Recommended)
1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/bagcdhlbkicwtepflczr/functions)
2. Navigate to **Database** → **Extensions**
3. Enable **pg_cron** extension if not already enabled
4. Go to **SQL Editor** and run:

```sql
-- Schedule the function to run every 2 minutes
SELECT cron.schedule(
  'tuya-polling',
  '*/2 * * * *',  -- Every 2 minutes
  'SELECT net.http_post(
    url:=''https://bagcdhlbkicwtepflczr.supabase.co/functions/v1/scheduled-poll'',
    headers:=''{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'',
    body:=''{}''
  );'
);
```

### Option 2: External Cron Service
Use any external cron service (like cron-job.org) to call:
```
POST https://bagcdhlbkicwtepflczr.supabase.co/functions/v1/scheduled-poll
Authorization: Bearer YOUR_SERVICE_ROLE_KEY
```

## 🧪 Testing

### Manual Test
```bash
curl -X POST https://bagcdhlbkicwtepflczr.supabase.co/functions/v1/simple-poll \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

### Expected Response
```json
{
  "ok": true,
  "count": 4,
  "device_status": {
    "success": true,
    "status": {
      "current_temp": null,
      "target_temp": 28,
      "water_temp": 27,
      "power_status": "on",
      "mode": "warm",
      "speed_percentage": 80
    }
  },
  "telemetry_data": [
    {
      "device_id": "bf65ca8db8b207052feu5u",
      "code": "switch_led",
      "value": "on",
      "updated_at": "2025-09-24T21:43:46.787Z"
    },
    // ... more telemetry data
  ],
  "timestamp": "2025-09-24T21:43:47.169Z"
}
```

## 🔧 Environment Variables

The functions use these environment variables (already set in Supabase):

- `TUYA_BASE_URL`: https://openapi.tuyaeu.com
- `TUYA_CLIENT_ID`: dn98qycejwjndescfprj  
- `TUYA_CLIENT_SECRET`: [SET]
- `UID`: 19DZ10YT
- `DEVICE_ID`: bf65ca8db8b207052feu5u
- `SUPABASE_URL`: https://bagcdhlbkicwtepflczr.supabase.co
- `SUPABASE_SERVICE_ROLE_KEY`: [SET]

## 🎯 Next Steps

1. **Set up scheduled execution** using one of the options above
2. **Update your frontend** to read from `telemetry_current` table instead of polling Tuya directly
3. **Enable real-time subscriptions** to get live updates in your dashboard
4. **Monitor the logs** in Supabase Dashboard → Functions → Logs

## 📈 Benefits

- ✅ **Real-time updates** every 2 minutes
- ✅ **Reliable data storage** in Supabase
- ✅ **No Vercel cron limitations** (1 per 24h)
- ✅ **Scalable solution** using Supabase Edge Functions
- ✅ **Historical data** for charts and analysis
- ✅ **Works with existing Vercel API** (no need to fix Tuya signing)

The solution is now ready for production use! 🚀
