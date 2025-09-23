# Tibber API Setup Guide

## 1. Get Tibber API Credentials

### Step 1: Access Tibber Developer Portal
- Go to: https://developer.tibber.com/
- Sign up or login with your Tibber account

### Step 2: Create a New App
- Click "Create App" in the developer dashboard
- Fill in app details:
  - **App Name**: Pool Heating Automation
  - **Description**: Automated pool heating based on electricity prices
  - **Redirect URI**: https://poolheating.vercel.app (or your domain)

### Step 3: Get API Token
- After creating the app, you'll get an API token
- Copy this token - you'll need it for the environment variables

## 2. Environment Variables Setup

Add the following to your `.env.local` file:

```bash
# Tibber Configuration
TIBBER_API_TOKEN=your_tibber_api_token_here
```

## 3. Vercel Environment Variables

For production deployment, add the environment variable in Vercel:

1. Go to your Vercel dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add:
   - **Name**: `TIBBER_API_TOKEN`
   - **Value**: Your Tibber API token
   - **Environment**: Production, Preview, Development

## 4. Test the Integration

Once you have the token set up, you can test the Tibber integration by calling:

```bash
curl -X POST https://poolheating.vercel.app/api/tibber-prices
```

## 5. Schedule Update

The daily scheduler will automatically run at 13:20 (when Tibber prices are available) instead of 6 AM.

## Troubleshooting

### Common Issues:
1. **Invalid Token**: Make sure the token is correctly copied
2. **No Data**: Tibber prices are only available after 13:20
3. **Rate Limits**: Tibber has rate limits, but they're generous for this use case

### Testing Locally:
```bash
# Test Tibber API directly
curl -X POST https://api.tibber.com/v1-beta/gql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"query": "query { viewer { homes { currentSubscription { priceInfo { today { startsAt total energy tax currency } } } } } }"}'
```
