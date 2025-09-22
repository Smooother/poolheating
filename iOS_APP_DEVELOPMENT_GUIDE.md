# 📱 iOS App Development Guide - Pool Heating System

## 🔑 **Authentication & Security**

### **API Key Authentication**
- **Required for all API calls**
- **Header:** `X-API-Key: your-api-key-here`
- **Storage:** iOS Keychain (secure storage)
- **Generated Key:** `51d8b75d372e1801b9697b75de131721072076911fe3e3c8d3b43a3fabf8f7db`

### **Base URL**
```
https://poolheating.vercel.app
```

---

## 🛠️ **API Endpoints**

### **1. System Status** 
**GET** `/api/status`
```json
{
  "now": "2025-09-22T18:02:44.743Z",
  "area": "SE3",
  "priceState": "HIGH",
  "currentPrice": 0.6402,
  "targetC": 29,
  "power": true,
  "waterTemp": 28,
  "mode": "warm",
  "paused": false,
  "nextSteps": [
    {
      "start": "2025-09-22T19:00:00+00:00",
      "end": "2025-09-22T20:00:00+00:00",
      "state": "HIGH",
      "targetC": 28
    }
  ],
  "lastAction": {
    "ts": "2025-09-22T21:00:00+00:00",
    "targetC": 29,
    "state": "NORMAL"
  }
}
```

### **2. Heat Pump Control**
**GET** `/api/heatpump` - Get status
**POST** `/api/heatpump` - Send commands

#### **Get Status Response:**
```json
{
  "status": {
    "id": "66f65221-adfa-41fa-b36d-8750a14066d8",
    "device_id": "bf65ca8db8b207052feu5u",
    "current_temp": 26.5,
    "water_temp": 28,
    "target_temp": 28,
    "speed_percentage": 0,
    "power_status": "standby",
    "mode": "warm",
    "is_online": true,
    "last_communication": "2025-09-22T18:01:46.139+00:00"
  }
}
```

#### **Send Commands:**
```json
// Set Temperature
{
  "action": "setTemperature",
  "temperature": 27
}

// Power Control
{
  "action": "sendCommand",
  "commands": [
    { "code": "Power", "value": true }
  ]
}
```

### **3. Price Data**
**GET** `/api/prices?zone=SE3&hours=24`
```json
{
  "currentPrice": {
    "id": "f08f755a-913c-4926-932e-20bfc7e17650",
    "bidding_zone": "SE3",
    "start_time": "2025-09-22T17:00:00+00:00",
    "end_time": "2025-09-22T18:00:00+00:00",
    "price_value": 0.6402,
    "currency": "SEK",
    "provider": "elpriset"
  },
  "prices": [
    {
      "start_time": "2025-09-22T17:00:00+00:00",
      "end_time": "2025-09-22T18:00:00+00:00",
      "price_value": 0.6402
    }
  ],
  "zone": "SE3",
  "lastUpdated": "2025-09-22T17:54:00.361Z"
}
```

### **4. Automation Settings**
**GET** `/api/settings` - Get settings
**POST** `/api/settings` - Update settings

#### **Settings Response:**
```json
{
  "settings": {
    "user_id": "default",
    "target_pool_temp": 28.0,
    "automation_enabled": true,
    "price_sensitivity": 1.0,
    "temp_tolerance": 2.0,
    "min_pump_temp": 18.0,
    "max_pump_temp": 35.0,
    "optimization_horizon_hours": 12,
    "average_days": 7,
    "high_price_threshold": 1.50,
    "low_price_multiplier": 0.70,
    "high_price_multiplier": 1.30,
    "bidding_zone": "SE3"
  }
}
```

### **5. Manual Override**
**POST** `/api/override`
```json
// Power Toggle
{
  "action": "togglePower"
}

// Set Temperature
{
  "action": "setTemperature",
  "value": 27
}

// Toggle Automation
{
  "action": "toggleAutomation"
}
```

### **6. Trigger Price Update**
**POST** `/api/trigger-price-update`
```json
{
  "success": true,
  "message": "Price update completed successfully",
  "timestamp": "2025-09-22T18:19:08.866Z"
}
```

---

## 📊 **Data Models**

### **Heat Pump Status**
```swift
struct HeatPumpStatus {
    let id: String
    let deviceId: String
    let currentTemp: Double?
    let waterTemp: Double
    let targetTemp: Double
    let speedPercentage: Int
    let powerStatus: PowerStatus
    let mode: String
    let isOnline: Bool
    let lastCommunication: Date
}

enum PowerStatus: String, CaseIterable {
    case on = "on"
    case standby = "standby"
    case off = "off"
}
```

### **Price Data**
```swift
struct PriceData {
    let id: String
    let biddingZone: String
    let startTime: Date
    let endTime: Date
    let priceValue: Double
    let currency: String
    let provider: String
}

struct PriceResponse {
    let currentPrice: PriceData
    let prices: [PriceData]
    let zone: String
    let lastUpdated: Date
}
```

### **Automation Settings**
```swift
struct AutomationSettings {
    let userId: String
    let targetPoolTemp: Double
    let automationEnabled: Bool
    let priceSensitivity: Double
    let tempTolerance: Double
    let minPumpTemp: Double
    let maxPumpTemp: Double
    let optimizationHorizonHours: Int
    let averageDays: Int
    let highPriceThreshold: Double
    let lowPriceMultiplier: Double
    let highPriceMultiplier: Double
    let biddingZone: String
}
```

### **System Status**
```swift
struct SystemStatus {
    let now: Date
    let area: String
    let priceState: PriceState
    let currentPrice: Double
    let targetC: Double
    let power: Bool
    let waterTemp: Double
    let mode: String
    let paused: Bool
    let nextSteps: [ScheduledAction]
    let lastAction: LastAction?
}

enum PriceState: String, CaseIterable {
    case low = "LOW"
    case normal = "NORMAL"
    case high = "HIGH"
    case shutdown = "SHUTDOWN"
}

struct ScheduledAction {
    let start: Date
    let end: Date
    let state: PriceState
    let targetC: Double
}

struct LastAction {
    let timestamp: Date
    let targetC: Double
    let state: PriceState
}
```

---

## 🎨 **UI Components & Screens**

### **1. Main Dashboard**
**Key Elements:**
- **Current Status Card**
  - Water temperature (large, prominent)
  - Target temperature
  - Power status (ON/OFF toggle)
  - Automation status (enabled/disabled)

- **Price Information Card**
  - Current electricity price
  - Price classification (LOW/NORMAL/HIGH)
  - Next hour price
  - Price trend indicator

- **Quick Controls**
  - Temperature adjustment (+/- buttons)
  - Power toggle
  - Automation toggle

- **Next Steps Preview**
  - Next 3-4 hours of scheduled actions
  - Temperature adjustments
  - Price-based reasoning

### **2. Price Chart Screen**
**Features:**
- 24-hour price chart
- Current hour highlighted
- Price classification zones (color-coded)
- Tap to see detailed price info
- Swipe to see different days

### **3. Settings Screen**
**Sections:**
- **Pool Settings**
  - Target pool temperature
  - Temperature tolerance
  - Min/Max pump temperatures

- **Automation Settings**
  - Enable/disable automation
  - Price sensitivity
  - Bidding zone selection

- **System Settings**
  - API key management
  - Refresh data
  - System status

### **4. History & Logs Screen**
**Features:**
- Automation decision history
- Temperature changes
- Price-based adjustments
- Error logs
- System events

---

## 🔄 **Real-time Updates**

### **Polling Strategy**
```swift
// Recommended polling intervals
let statusPollingInterval: TimeInterval = 30  // 30 seconds
let pricePollingInterval: TimeInterval = 300  // 5 minutes
let settingsPollingInterval: TimeInterval = 60 // 1 minute
```

### **Update Triggers**
- **Immediate:** After user actions (temperature change, power toggle)
- **Regular:** Status updates every 30 seconds
- **Price Updates:** Every 5 minutes
- **Settings:** Every minute

---

## 🎯 **Key User Interactions**

### **Temperature Control**
```swift
// Temperature adjustment
func adjustTemperature(_ delta: Double) {
    let newTemp = currentTargetTemp + delta
    // Clamp between min/max values
    let clampedTemp = max(minTemp, min(maxTemp, newTemp))
    
    // Send command
    apiClient.setTemperature(clampedTemp)
    
    // Update UI optimistically
    updateUITemperature(clampedTemp)
    
    // Refresh status after delay
    DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
        self.refreshStatus()
    }
}
```

### **Power Toggle**
```swift
func togglePower() {
    let newPowerState = !currentPowerState
    
    // Send command
    apiClient.togglePower()
    
    // Update UI optimistically
    updateUIPowerState(newPowerState)
    
    // Refresh status
    DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
        self.refreshStatus()
    }
}
```

---

## 🚨 **Error Handling**

### **Common Error Scenarios**
1. **Network Errors**
   - Show retry button
   - Display last known status
   - Graceful degradation

2. **API Key Issues**
   - Prompt for new API key
   - Store securely in Keychain
   - Validate on app launch

3. **Device Offline**
   - Show offline indicator
   - Disable controls
   - Queue commands for when online

4. **Invalid Commands**
   - Show error message
   - Revert UI state
   - Log error for debugging

### **Error Response Format**
```json
{
  "success": false,
  "error": "Error message",
  "timestamp": "2025-09-22T18:19:08.866Z"
}
```

---

## 🔐 **Security Best Practices**

### **API Key Storage**
```swift
import Security

class KeychainManager {
    static func storeAPIKey(_ key: String) {
        let data = key.data(using: .utf8)!
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: "poolheating_api_key",
            kSecValueData as String: data
        ]
        SecItemDelete(query as CFDictionary)
        SecItemAdd(query as CFDictionary, nil)
    }
    
    static func getAPIKey() -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: "poolheating_api_key",
            kSecReturnData as String: true
        ]
        
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        
        if status == errSecSuccess,
           let data = result as? Data,
           let key = String(data: data, encoding: .utf8) {
            return key
        }
        return nil
    }
}
```

---

## 📱 **iOS-Specific Considerations**

### **Background App Refresh**
- Enable for status updates
- Limited to 30 seconds of background execution
- Use for critical status changes only

### **Push Notifications** (Future Enhancement)
- Price alerts (high/low prices)
- System status changes
- Automation decisions
- Error notifications

### **Widget Support** (Future Enhancement)
- Current temperature widget
- Price status widget
- Quick controls widget

### **Apple Watch Support** (Future Enhancement)
- Temperature display
- Quick power toggle
- Price notifications

---

## 🧪 **Testing Strategy**

### **API Testing**
```swift
// Test all endpoints
func testAPIEndpoints() {
    testGetStatus()
    testSetTemperature()
    testTogglePower()
    testGetPrices()
    testGetSettings()
    testUpdateSettings()
}
```

### **Error Scenarios**
- Network disconnection
- Invalid API key
- Server errors
- Malformed responses

### **UI Testing**
- Temperature adjustments
- Power toggles
- Settings changes
- Error handling

---

## 🚀 **Deployment Checklist**

### **Pre-Launch**
- [ ] API key securely stored
- [ ] All endpoints tested
- [ ] Error handling implemented
- [ ] Offline state handled
- [ ] UI/UX polished
- [ ] Performance optimized

### **Post-Launch**
- [ ] Monitor API usage
- [ ] Track error rates
- [ ] User feedback collection
- [ ] Performance monitoring

---

## 📞 **Support & Maintenance**

### **Monitoring**
- API response times
- Error rates
- User engagement
- Feature usage

### **Updates**
- Regular API compatibility checks
- Feature enhancements
- Bug fixes
- Performance improvements

---

## 🔗 **Useful Links**

- **API Base URL:** https://poolheating.vercel.app
- **GitHub Repository:** [Your repo URL]
- **Vercel Dashboard:** [Your Vercel project]
- **Supabase Dashboard:** [Your Supabase project]

---

## 📝 **Notes**

- **Timezone:** All times are in UTC, convert to local time for display
- **Temperature Units:** Celsius throughout
- **Price Units:** SEK/kWh
- **Update Frequency:** Status every 30s, prices every 5min
- **Offline Support:** Show last known status, queue commands
- **Error Recovery:** Automatic retry with exponential backoff

This guide provides everything you need to build a comprehensive iOS app for your pool heating system! 🎉
