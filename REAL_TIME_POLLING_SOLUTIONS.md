# Real-Time Tuya Device Polling Solutions

Since Vercel Hobby plan only allows 1 cron job per 24 hours, here are alternative solutions for real-time device status polling.

## 🎯 **Recommended Solution: Supabase Scheduled Functions**

### **Option 1: Fix Supabase Edge Function (Recommended)**

The Supabase Edge Functions are deployed but have signing issues. Let's fix them:

#### **Step 1: Check Environment Variables**
Go to: https://supabase.com/dashboard/project/bagcdhlbkicwtepflczr/settings/functions

Verify these are set correctly:
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

#### **Step 2: Set Up Scheduled Function**
In Supabase Dashboard:
1. Go to **Database** → **Cron** (if available)
2. Create new cron job:
   - **Name**: `poll-tuya-status`
   - **Schedule**: `*/2 * * * *` (every 2 minutes)
   - **Function**: `poll-status`
   - **Method**: `POST`

#### **Step 3: Test the Function**
```bash
curl -X POST https://bagcdhlbkicwtepflczr.supabase.co/functions/v1/status-now \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### **Option 2: External Cron Service (Free)**

Use a free external cron service to call your Vercel endpoint:

#### **Services to Consider:**
1. **Cron-job.org** (Free, reliable)
2. **EasyCron** (Free tier available)
3. **SetCronJob** (Free tier available)

#### **Setup:**
1. Create account on chosen service
2. Set up cron job:
   - **URL**: `https://poolheating.vercel.app/api/poll-tuya-status`
   - **Schedule**: Every 2 minutes (`*/2 * * * *`)
   - **Method**: POST
   - **Headers**: `Content-Type: application/json`

### **Option 3: Manual Trigger + Frontend Polling**

#### **Manual Trigger Endpoint**
Keep the `api/poll-tuya-status.js` endpoint for manual testing:

```bash
# Test manually
curl -X POST https://poolheating.vercel.app/api/poll-tuya-status
```

#### **Frontend Polling**
Add polling to your Dashboard component:

```javascript
// In Dashboard.tsx
useEffect(() => {
  const pollInterval = setInterval(async () => {
    try {
      await fetch('/api/poll-tuya-status', { method: 'POST' });
      // Refresh dashboard data
      await fetchPriceData();
      await loadSystemInfo();
    } catch (error) {
      console.error('Polling failed:', error);
    }
  }, 120000); // Every 2 minutes

  return () => clearInterval(pollInterval);
}, []);
```

### **Option 4: Hybrid Approach**

Combine multiple methods:

1. **Supabase Edge Function** for primary polling (when working)
2. **External cron service** as backup
3. **Manual trigger** for testing
4. **Frontend polling** when user is active

## 🛠 **Implementation Steps**

### **Immediate Actions:**

1. **Test Supabase Edge Function**:
   ```bash
   curl -X POST https://bagcdhlbkicwtepflczr.supabase.co/functions/v1/status-now \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhZ2NkaGxia2ljd3RlcGZsY3pyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwOTYzNjgsImV4cCI6MjA3MzY3MjM2OH0.JrQKwkxywib7I8149n7Jg6xhRk5aPDKIv3wBVV0MYyU"
   ```

2. **If Edge Function works**: Set up Supabase scheduled function
3. **If Edge Function fails**: Use external cron service
4. **Always**: Keep manual trigger for testing

### **Database Setup:**

Run the telemetry migration:
```sql
-- Apply: supabase/migrations/20250125000000_create_telemetry_tables.sql
```

### **Testing:**

```bash
# Test manual trigger
curl -X POST https://poolheating.vercel.app/api/poll-tuya-status

# Check database
# Go to Supabase Dashboard → Table Editor → telemetry_current
```

## 📊 **Expected Results**

Once working, you should see:

- ✅ **telemetry_current** table with latest device status
- ✅ **telemetry_history** table with time series data
- ✅ **Real-time updates** in your Dashboard
- ✅ **Automatic polling** every 2 minutes

## 🔧 **Troubleshooting**

### **Common Issues:**

1. **"token invalid"** → Check Tuya credentials in Supabase secrets
2. **"Cron not available"** → Use external cron service
3. **"Function not found"** → Check Supabase Edge Functions deployment
4. **"Database error"** → Run telemetry migration

### **Monitoring:**

- Check Supabase function logs
- Monitor Vercel function logs
- Verify database data updates
- Test manual triggers

## 🎯 **Recommended Next Steps:**

1. **Try Supabase scheduled function first** (if Cron is available)
2. **If not available, use external cron service** (cron-job.org)
3. **Keep manual trigger for testing**
4. **Add frontend polling as backup**

This gives you multiple fallback options and ensures reliable real-time updates!
