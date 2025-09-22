# 📱 iOS App - Quick Reference Card

## 🔑 **Essential Info**
- **Base URL:** `https://poolheating.vercel.app`
- **API Key:** `51d8b75d372e1801b9697b75de131721072076911fe3e3c8d3b43a3fabf8f7db`
- **Header:** `X-API-Key: [your-api-key]`

## 🛠️ **Key Endpoints**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/status` | GET | System status & next steps |
| `/api/heatpump` | GET/POST | Heat pump control |
| `/api/prices?zone=SE3&hours=24` | GET | Price data |
| `/api/settings` | GET/POST | Automation settings |
| `/api/override` | POST | Manual controls |
| `/api/trigger-price-update` | POST | Manual price refresh |

## 📊 **Key Data Fields**

### **Heat Pump Status**
- `current_temp` - Current temperature
- `water_temp` - Water temperature  
- `target_temp` - Target temperature
- `power_status` - "on", "standby", "off"
- `speed_percentage` - Fan speed (0-100)
- `is_online` - Device connectivity

### **Price Data**
- `price_value` - Price in SEK/kWh
- `start_time` / `end_time` - Time range
- `bidding_zone` - Price area (SE1, SE2, SE3, SE4)

### **System Status**
- `priceState` - "LOW", "NORMAL", "HIGH", "SHUTDOWN"
- `currentPrice` - Current electricity price
- `targetC` - Target temperature
- `power` - Power status
- `waterTemp` - Water temperature
- `nextSteps` - Scheduled actions

## 🎯 **Main UI Screens**

1. **Dashboard** - Current status, quick controls
2. **Price Chart** - 24h price visualization  
3. **Settings** - Automation & pool settings
4. **History** - Automation logs & decisions

## 🔄 **Update Intervals**
- **Status:** 30 seconds
- **Prices:** 5 minutes  
- **Settings:** 1 minute

## 🚨 **Error Handling**
- Network errors → Retry button
- API key issues → Re-authenticate
- Device offline → Show offline state
- Invalid commands → Revert UI state

## 🔐 **Security**
- Store API key in iOS Keychain
- Validate API key on app launch
- Handle 401 Unauthorized responses

## 📱 **iOS Features**
- Background app refresh enabled
- Optimistic UI updates
- Offline state handling
- Secure keychain storage

---
**Ready to build! 🚀**
