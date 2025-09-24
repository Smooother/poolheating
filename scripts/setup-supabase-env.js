#!/usr/bin/env node

/**
 * Script to set up environment variables in Supabase for Tuya Edge Functions
 */

const envVars = {
  TUYA_BASE_URL: 'https://openapi.tuyaeu.com',
  TUYA_CLIENT_ID: 'dn98qycejwjndescfprj',
  TUYA_CLIENT_SECRET: '21c50cb2a91a4491b18025373e742272',
  UID: '19DZ10YT',
  DEVICE_ID: 'bf65ca8db8b207052feu5u',
  SUPABASE_URL: 'https://bagcdhlbkicwtepflczr.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhZ2NkaGxia2ljd3RlcGZsY3pyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODA5NjM2OCwiZXhwIjoyMDczNjcyMzY4fQ.bOobKwGFgmyKOUgxYhwXjwzPToXA6IcFQvzQtr1GLJA',
  POLL_MINUTES: '2'
};

console.log('🚀 Setting up Supabase Edge Function environment variables...\n');

console.log('📋 Environment variables to add to Supabase:');
console.log('Go to: https://supabase.com/dashboard/project/bagcdhlbkicwtepflczr/settings/functions\n');

Object.entries(envVars).forEach(([key, value]) => {
  console.log(`${key}=${value}`);
});

console.log('\n📝 Manual setup steps:');
console.log('1. Go to Supabase Dashboard → Settings → Edge Functions');
console.log('2. Add each environment variable above');
console.log('3. Deploy the functions:');
console.log('   supabase functions deploy poll-status');
console.log('   supabase functions deploy status-now');
console.log('4. Set up the scheduled function:');
console.log('   - Go to Database → Cron');
console.log('   - Create new cron job: */2 * * * *');
console.log('   - Function: poll-status');

console.log('\n🧪 Test the setup:');
console.log('curl -X POST https://bagcdhlbkicwtepflczr.supabase.co/functions/v1/status-now \\');
console.log('  -H "Authorization: Bearer YOUR_ANON_KEY" \\');
console.log('  -H "Content-Type: application/json"');

console.log('\n✅ All credentials are ready!');
console.log('   - Tuya Access ID: dn98qycejwjndescfprj');
console.log('   - Tuya UID: 19DZ10YT');
console.log('   - Device ID: bf65ca8db8b207052feu5u');
console.log('   - Supabase Service Role Key: [configured]');
