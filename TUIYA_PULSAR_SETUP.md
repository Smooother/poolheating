# Tuya Pulsar Integration Setup

This document explains how to set up the Tuya Pulsar message queue integration for real-time device status updates.

## Overview

The Tuya Pulsar integration provides real-time device status updates through Tuya's message queue service. When your heat pump device changes status (power on/off, temperature changes, etc.), Tuya sends notifications that are automatically processed and stored in your database.

## Prerequisites

1. **Tuya Developer Account**: You need a Tuya developer account with a cloud project
2. **Device Linked**: Your heat pump device must be linked to your Tuya cloud project
3. **Message Service Enabled**: The message service must be enabled in your Tuya project

## Environment Variables

Add these environment variables to your Vercel deployment:

### Required Variables

```bash
# Tuya API Credentials
TUIYA_ACCESS_ID=your_tuya_access_id
TUIYA_ACCESS_KEY=your_tuya_access_key

# Device Configuration
TUIYA_DEVICE_ID=your_heat_pump_device_id

# Environment (TEST for development, PROD for production)
TUIYA_ENV=TEST
```

### Optional Variables

```bash
# Pulsar Server URL (defaults to EU endpoint)
TUIYA_PULSAR_URL=pulsar+ssl://mqe.tuyaeu.com:7285/

# Supabase Configuration (should already be set)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key
```

## Getting Tuya Credentials

1. **Go to Tuya Developer Platform**: https://iot.tuya.com/
2. **Create/Open Project**: Create a new cloud project or open an existing one
3. **Get Authorization Key**: 
   - Go to "Cloud" → "Development" → "Authorization Key"
   - Copy the "Access ID" and "Access Secret"
4. **Enable Message Service**:
   - Go to "Cloud" → "Development" → "Message Service"
   - Enable the message service
5. **Get Device ID**:
   - Go to "Cloud" → "Development" → "Device"
   - Find your heat pump device and copy the Device ID

## Supported Device Status Codes

The integration automatically maps these Tuya status codes to database fields:

| Tuya Code | Database Field | Description |
|-----------|----------------|-------------|
| `switch_led` | `power_status` | Device power on/off |
| `temp_set` | `target_temp` | Target temperature setting |
| `temp_current` | `current_temp` | Current temperature reading |
| `WInTemp` | `water_temp` | Water temperature |
| `fan_speed` | `speed_percentage` | Fan speed percentage |
| `online` | `is_online` | Device online status |

## How It Works

1. **Pulsar Connection**: The service connects to Tuya's Pulsar message queue
2. **Message Reception**: Receives real-time device status updates
3. **Message Parsing**: Decrypts and parses the device status data
4. **Database Update**: Updates both `heat_pump_status` and `system_info` tables
5. **Real-time Display**: Dashboard automatically shows updated device status

## Testing the Integration

### 1. Test the Pulsar Client

```bash
# Run the test script
node scripts/test-pulsar.js
```

### 2. Start Pulsar from Dashboard

1. Go to the Dashboard
2. Find the "Real-time Updates" card
3. Click "Start Pulsar" button
4. Monitor the connection status

### 3. Test Device Updates

1. Use the Tuya Smart Life app to control your heat pump
2. Turn the device on/off or change temperature settings
3. Watch the Dashboard update in real-time

## API Endpoints

### Pulsar Manager API

**GET** `/api/pulsar-manager`
- Returns current Pulsar client status

**POST** `/api/pulsar-manager`
- Body: `{ "action": "start" | "stop" | "restart" | "status" }`
- Controls the Pulsar client

### Example Usage

```javascript
// Start Pulsar client
fetch('/api/pulsar-manager', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'start' })
});

// Check status
const response = await fetch('/api/pulsar-manager');
const status = await response.json();
console.log('Pulsar status:', status);
```

## Troubleshooting

### Common Issues

1. **Connection Failed**
   - Check if credentials are correct
   - Verify device is linked to your project
   - Ensure message service is enabled

2. **No Messages Received**
   - Check if device is in test environment (if using TEST mode)
   - Verify device is online and connected
   - Check Tuya Smart Life app for device status

3. **Database Updates Not Working**
   - Verify Supabase credentials
   - Check database schema matches expected fields
   - Review server logs for errors

### Debug Mode

Enable debug logging by setting:
```bash
DEBUG=pulsar:*
```

## Production Deployment

1. **Set Environment Variables**: Add all required environment variables to Vercel
2. **Switch to Production**: Set `TUIYA_ENV=PROD`
3. **Update Device**: Ensure your device is in production environment
4. **Monitor**: Use the Dashboard to monitor Pulsar connection status

## Security Notes

- Never commit Tuya credentials to version control
- Use environment variables for all sensitive data
- Regularly rotate access keys
- Monitor message queue usage for billing

## Support

- **Tuya Documentation**: https://developer.tuya.com/en/docs/iot/
- **Pulsar SDK**: https://developer.tuya.com/en/docs/iot/Pulsar-SDK-get-message
- **Message Service**: https://developer.tuya.com/en/docs/iot/cloud-development/message-service
