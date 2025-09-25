# Tuya Pulsar Real-time Integration Setup

## 🎯 Overview

This feature branch implements **real-time push notifications** from Tuya devices using the Pulsar SDK. Unlike the polling approach, this provides **instant notifications** whenever your heat pump changes status.

## ⚡ Real-time vs Polling

| Feature | Polling (Current) | Pulsar (This Branch) |
|---------|-------------------|----------------------|
| **Update Speed** | Every 2 minutes | Instant (real-time) |
| **Data Freshness** | Up to 2 minutes old | Always current |
| **Resource Usage** | High (constant API calls) | Low (event-driven) |
| **Notifications** | No | Yes (push notifications) |
| **Battery Impact** | High | Low |

## 🏗️ Architecture

```
Tuya Device → Pulsar Message Queue → Our Service → Database → Dashboard
     ↓              ↓                    ↓           ↓         ↓
  Status Change → Real-time Message → Process → Store → Update UI
```

## 📁 New Files Added

### Core Services
- `src/services/tuyaPulsarService.ts` - Main Pulsar SDK integration
- `src/services/pulsarClientService.ts` - High-level client management
- `api/pulsar-manager.js` - API endpoints for Pulsar control

### Testing & Documentation
- `scripts/test-pulsar.js` - Test script for Pulsar functionality
- `TUIYA_PULSAR_SETUP.md` - This setup guide

## 🔧 Configuration

### Environment Variables
```bash
# Tuya Credentials (already set)
TUYA_ACCESS_ID=dn98qycejwjndescfprj
TUYA_ACCESS_KEY=21c50cb2a91a4491b18025373e742272
TUYA_UID=19DZ10YT
TUYA_DEVICE_ID=bf65ca8db8b207052feu5u

# Supabase (already set)
SUPABASE_URL=https://bagcdhlbkicwtepflczr.supabase.co
SUPABASE_SERVICE_ROLE_KEY=[SET]
```

### Tuya Pulsar Configuration
```typescript
const config = {
  accessId: 'dn98qycejwjndescfprj',
  accessKey: '21c50cb2a91a4491b18025373e742272',
  uid: '19DZ10YT',
  region: 'eu', // Europe region
  environment: 'TEST' // or 'PROD'
};
```

## 🚀 Usage

### 1. Start Pulsar Connection
```bash
curl -X POST https://poolheating.vercel.app/api/pulsar-manager \
  -H "Content-Type: application/json" \
  -d '{"action": "start"}'
```

### 2. Check Status
```bash
curl -X POST https://poolheating.vercel.app/api/pulsar-manager \
  -H "Content-Type: application/json" \
  -d '{"action": "status"}'
```

### 3. Stop Connection
```bash
curl -X POST https://poolheating.vercel.app/api/pulsar-manager \
  -H "Content-Type: application/json" \
  -d '{"action": "stop"}'
```

### 4. Health Check
```bash
curl -X POST https://poolheating.vercel.app/api/pulsar-manager \
  -H "Content-Type: application/json" \
  -d '{"action": "health"}'
```

## 📊 Data Flow

### Message Processing
1. **Tuya Device** sends status change
2. **Pulsar Queue** receives real-time message
3. **Our Service** processes the message
4. **Database** stores the update
5. **Dashboard** receives real-time update

### Status Code Mapping
| Tuya Code | Database Field | Description |
|-----------|----------------|-------------|
| `switch_led` | `power_status` | Device power on/off |
| `temp_set` | `target_temp` | Target temperature setting |
| `temp_current` | `current_temp` | Current temperature reading |
| `WInTemp` | `water_temp` | Water temperature |
| `fan_speed` | `speed_percentage` | Fan speed percentage |
| `online` | `is_online` | Device online status |

## 🧪 Testing

### Local Testing
```bash
# Run the test script
node scripts/test-pulsar.js
```

### API Testing
```bash
# Test all endpoints
curl -X POST https://poolheating.vercel.app/api/pulsar-manager \
  -H "Content-Type: application/json" \
  -d '{"action": "start"}'

curl -X POST https://poolheating.vercel.app/api/pulsar-manager \
  -H "Content-Type: application/json" \
  -d '{"action": "status"}'

curl -X POST https://poolheating.vercel.app/api/pulsar-manager \
  -H "Content-Type: application/json" \
  -d '{"action": "health"}'

curl -X POST https://poolheating.vercel.app/api/pulsar-manager \
  -H "Content-Type: application/json" \
  -d '{"action": "stop"}'
```

## 🔄 Current Implementation Status

### ✅ Completed
- [x] Pulsar service architecture
- [x] Message processing logic
- [x] Database integration
- [x] API endpoints
- [x] Test scripts
- [x] Documentation

### 🚧 In Progress
- [ ] Real Tuya Pulsar SDK integration
- [ ] Dashboard real-time updates
- [ ] Error handling and reconnection
- [ ] Production configuration

### 📋 TODO
- [ ] Implement actual Tuya Pulsar SDK
- [ ] Add real-time dashboard updates
- [ ] Implement push notifications
- [ ] Add connection monitoring
- [ ] Performance optimization

## 🎯 Next Steps

1. **Implement Real Tuya Pulsar SDK**
   - Replace simulation with actual Pulsar connection
   - Handle real message decryption
   - Implement proper error handling

2. **Dashboard Integration**
   - Add real-time status display
   - Implement push notifications
   - Add connection status indicator

3. **Production Deployment**
   - Configure production environment
   - Set up monitoring and logging
   - Implement health checks

## 🔍 Monitoring

### Connection Status
- **Connected**: Pulsar connection is active
- **Message Count**: Number of messages received
- **Last Message**: Timestamp of last received message
- **Error**: Any connection errors

### Health Metrics
- **Uptime**: How long the connection has been active
- **Message Rate**: Messages per minute
- **Error Rate**: Failed message processing rate
- **Reconnection Attempts**: Number of reconnection attempts

## 🚨 Troubleshooting

### Common Issues
1. **Connection Failed**: Check Tuya credentials
2. **No Messages**: Verify device is online and sending data
3. **Database Errors**: Check Supabase connection
4. **API Errors**: Verify endpoint URLs and authentication

### Debug Commands
```bash
# Check Pulsar status
curl -X POST https://poolheating.vercel.app/api/pulsar-manager \
  -H "Content-Type: application/json" \
  -d '{"action": "status"}'

# Check health
curl -X POST https://poolheating.vercel.app/api/pulsar-manager \
  -H "Content-Type: application/json" \
  -d '{"action": "health"}'
```

## 📚 Resources

- [Tuya Pulsar SDK Documentation](https://developer.tuya.com/en/docs/iot/Pulsar-SDK-get-message?id=Kan0klj9qbv3l)
- [Tuya Message Service](https://developer.tuya.com/en/docs/iot/message-service?id=Kavck4sr3o6ek)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)

---

**Note**: This is a feature branch implementation. The main branch continues to use the working polling solution. This Pulsar implementation can be merged once fully tested and production-ready.