#!/bin/bash

# Script to set up Tuya environment variables in Vercel
# Run this script to add the required environment variables to your Vercel deployment

echo "🚀 Setting up Tuya environment variables in Vercel..."
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI is not installed. Please install it first:"
    echo "   npm install -g vercel"
    echo ""
    exit 1
fi

echo "✅ Vercel CLI found"
echo ""

# Set environment variables
echo "📝 Adding environment variables to Vercel..."

vercel env add TUIYA_ACCESS_ID production <<< "dn98qycejwjndescfprj"
vercel env add TUIYA_ACCESS_KEY production <<< "21c50cb2a91a4491b18025373e742272"
vercel env add TUIYA_DEVICE_ID production <<< "bf65ca8db8b207052feu5u"
vercel env add TUIYA_ENV production <<< "TEST"

echo ""
echo "✅ Environment variables added to Vercel!"
echo ""
echo "📋 Added variables:"
echo "   TUIYA_ACCESS_ID=dn98qycejwjndescfprj"
echo "   TUIYA_ACCESS_KEY=21c50cb2a91a4491b18025373e742272"
echo "   TUIYA_DEVICE_ID=bf65ca8db8b207052feu5u"
echo "   TUIYA_ENV=TEST"
echo ""
echo "🔄 Next steps:"
echo "1. Vercel will automatically redeploy with the new environment variables"
echo "2. Wait for deployment to complete (check Vercel dashboard)"
echo "3. Go to your Dashboard and click 'Start Pulsar' button"
echo "4. Monitor the Real-time Updates card for connection status"
echo ""
echo "🎉 Setup complete! Your Tuya Pulsar integration is ready to use."
