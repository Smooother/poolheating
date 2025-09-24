# Vercel Environment Variables Setup

This guide shows you how to add the Tuya credentials to your Vercel deployment.

## Method 1: Vercel Dashboard (Recommended)

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard
2. **Select your project**: Click on "poolheating"
3. **Go to Settings**: Click on the "Settings" tab
4. **Environment Variables**: Click on "Environment Variables" in the left sidebar
5. **Add Variables**: Click "Add New" and add each variable:

### Add these 4 environment variables:

| Name | Value | Environment |
|------|-------|-------------|
| `TUIYA_ACCESS_ID` | `dn98qycejwjndescfprj` | Production |
| `TUIYA_ACCESS_KEY` | `21c50cb2a91a4491b18025373e742272` | Production |
| `TUIYA_DEVICE_ID` | `bf65ca8db8b207052feu5u` | Production |
| `TUIYA_ENV` | `TEST` | Production |

6. **Save**: Click "Save" after adding each variable
7. **Redeploy**: Go to "Deployments" tab and click "Redeploy" on the latest deployment

## Method 2: Vercel CLI

If you have Vercar CLI installed, you can run:

```bash
# Make the script executable and run it
chmod +x scripts/setup-vercel-env.sh
./scripts/setup-vercel-env.sh
```

Or manually add each variable:

```bash
vercel env add TUIYA_ACCESS_ID production
# Enter: dn98qycejwjndescfprj

vercel env add TUIYA_ACCESS_KEY production
# Enter: 21c50cb2a91a4491b18025373e742272

vercel env add TUIYA_DEVICE_ID production
# Enter: bf65ca8db8b207052feu5u

vercel env add TUIYA_ENV production
# Enter: TEST
```

## Verification

After adding the environment variables:

1. **Wait for redeployment** (usually takes 1-2 minutes)
2. **Go to your Dashboard**: https://poolheating.vercel.app
3. **Find the "Real-time Updates" card**
4. **Click "Start Pulsar" button**
5. **Monitor the connection status**

## Expected Behavior

- **Connection Status**: Should show "Connected" with a green dot
- **Messages Received**: Counter should start incrementing
- **Last Message**: Should show current timestamp

## Troubleshooting

### If connection fails:
1. **Check environment variables** are correctly set in Vercel
2. **Verify device is online** in Tuya Smart Life app
3. **Ensure message service is enabled** in your Tuya project
4. **Check device is in TEST environment** (if using TEST mode)

### If no messages are received:
1. **Control your device** using Tuya Smart Life app
2. **Turn device on/off** or change temperature settings
3. **Watch the Dashboard** for real-time updates

## Next Steps

Once the Pulsar integration is working:

1. **Test device control** from the Dashboard
2. **Monitor real-time updates** as you control the device
3. **Verify database updates** in the System Information section
4. **Switch to PROD environment** when ready for production use

## Security Notes

- **Never commit credentials** to version control
- **Use environment variables** for all sensitive data
- **Regularly rotate access keys** for security
- **Monitor usage** for billing purposes
