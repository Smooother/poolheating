#!/bin/bash

echo "🔧 Adding Tibber API Token to Vercel..."

# Add the Tibber token to Vercel
echo "7C4E8962A1B225186BEF2E7EC5B5D3E5760BC6A789DEE2F020C8C78D7BFEB36D-1" | vercel env add TIBBER_API_TOKEN production

echo "✅ Tibber token added successfully!"
echo "🚀 Redeploying to apply changes..."

# Redeploy to apply the new environment variable
vercel --prod

echo "🎉 Deployment complete! Testing functions..."

# Test the functions
echo "Testing Tibber API..."
curl -s https://poolheating.vercel.app/api/tibber-prices | jq .

echo "Testing price data..."
curl -s https://poolheating.vercel.app/api/prices | jq .

echo "Testing automation..."
curl -s https://poolheating.vercel.app/api/automation | jq '.settings.automation_enabled'
