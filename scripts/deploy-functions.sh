#!/bin/bash

# Supabase Edge Functions Deployment Script

echo "🚀 Deploying Supabase Edge Functions for Tuya Device Polling"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first:"
    echo "   brew install supabase/tap/supabase"
    exit 1
fi

echo "✅ Supabase CLI found"

# Check if logged in
if ! supabase status &> /dev/null; then
    echo "⚠️  Not logged in to Supabase. Please run:"
    echo "   supabase login"
    echo ""
    echo "Then run this script again."
    exit 1
fi

echo "✅ Logged in to Supabase"

# Deploy functions
echo ""
echo "📦 Deploying Edge Functions..."

echo "Deploying poll-status function..."
supabase functions deploy poll-status

if [ $? -eq 0 ]; then
    echo "✅ poll-status deployed successfully"
else
    echo "❌ Failed to deploy poll-status"
    exit 1
fi

echo "Deploying status-now function..."
supabase functions deploy status-now

if [ $? -eq 0 ]; then
    echo "✅ status-now deployed successfully"
else
    echo "❌ Failed to deploy status-now"
    exit 1
fi

echo ""
echo "🎉 All functions deployed successfully!"
echo ""
echo "📝 Next steps:"
echo "1. Add environment variables in Supabase Dashboard"
echo "2. Run database migration for telemetry tables"
echo "3. Set up scheduled function (cron job)"
echo "4. Test the functions"
echo ""
echo "📋 Environment variables to add:"
echo "TUYA_BASE_URL=https://openapi.tuyaeu.com"
echo "TUYA_CLIENT_ID=dn98qycejwjndescfprj"
echo "TUYA_CLIENT_SECRET=21c50cb2a91a4491b18025373e742272"
echo "UID=19DZ10YT"
echo "DEVICE_ID=bf65ca8db8b207052feu5u"
echo "SUPABASE_URL=https://bagcdhlbkicwtepflczr.supabase.co"
echo "SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhZ2NkaGxia2ljd3RlcGZsY3pyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODA5NjM2OCwiZXhwIjoyMDczNjcyMzY4fQ.bOobKwGFgmyKOUgxYhwXjwzPToXA6IcFQvzQtr1GLJA"
echo "POLL_MINUTES=2"
