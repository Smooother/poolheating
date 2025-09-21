# iOS App API Reference

## Base URL
Replace `YOUR_VERCEL_DOMAIN` with your actual Vercel deployment URL.
```
https://YOUR_VERCEL_DOMAIN.vercel.app
```

## Authentication
All endpoints are currently public. Add Bearer token authentication as needed.

## Endpoints

### 1. Get Current Price Data
**GET** `/api/prices?zone=SE3&hours=24`

**Query Parameters:**
- `zone` (optional): Bidding zone (SE1, SE2, SE3, SE4). Default: SE3
- `hours` (optional): Hours of forecast data. Default: 24

**Response:**
```json
{
  "currentPrice": {
    "id": "uuid",
    "bidding_zone": "SE3",
    "start_time": "2024-01-15T14:00:00Z",
    "end_time": "2024-01-15T15:00:00Z",
    "price_value": 1.25,
    "currency": "SEK",
    "provider": "elpriset",
    "resolution": "PT60M"
  },
  "prices": [...], // Array of price objects for the requested hours
  "zone": "SE3",
  "lastUpdated": "2024-01-15T14:30:00Z"
}
```

### 2. Trigger Price Data Collection
**POST** `/api/prices`

**Response:**
```json
{
  "success": true,
  "message": "Collected and saved 96 price points",
  "timestamp": "2024-01-15T14:30:00Z"
}
```

### 3. Get Heat Pump Status
**GET** `/api/heatpump`

**Response:**
```json
{
  "status": {
    "id": "uuid",
    "device_id": "device123",
    "current_temp": 22.5,
    "target_temp": 28.0,
    "water_temp": 26.8,
    "power_status": "on",
    "mode": "heating",
    "speed_percentage": 75,
    "is_online": true,
    "last_communication": "2024-01-15T14:25:00Z",
    "created_at": "2024-01-15T14:25:00Z"
  },
  "lastUpdated": "2024-01-15T14:25:00Z"
}
```

### 4. Control Heat Pump
**POST** `/api/heatpump`

**Set Temperature:**
```json
{
  "action": "setTemperature",
  "temperature": 28.5
}
```

**Get Device Status:**
```json
{
  "action": "getStatus"
}
```

**Send Custom Commands:**
```json
{
  "action": "sendCommand",
  "commands": [
    {
      "code": "SetTemp",
      "value": 28
    },
    {
      "code": "Power",
      "value": true
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Command sent successfully"
}
```

### 5. Get Automation Status and Settings
**GET** `/api/automation`

**Response:**
```json
{
  "settings": {
    "id": "uuid",
    "user_id": "default",
    "automation_enabled": true,
    "target_pool_temp": 28.0,
    "price_sensitivity": 1.0,
    "temp_tolerance": 2.0,
    "min_pump_temp": 18.0,
    "max_pump_temp": 35.0,
    "optimization_horizon_hours": 12,
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-01-15T14:00:00Z"
  },
  "recentLogs": [
    {
      "id": "uuid",
      "user_id": "default",
      "timestamp": "2024-01-15T14:00:00Z",
      "current_price": 1.25,
      "avg_price_forecast": 1.10,
      "current_pool_temp": 26.8,
      "target_pool_temp": 28.0,
      "current_pump_temp": 27.0,
      "new_pump_temp": 29.0,
      "price_classification": "high",
      "action_reason": "Price ratio: 1.14, adjustment: -1.0°C"
    }
  ]
}
```

### 6. Trigger Automation Run
**POST** `/api/automation`

**Response:**
```json
{
  "success": true,
  "currentPrice": 1.25,
  "newTemp": 29.0,
  "reason": "Price ratio: 1.14, adjustment: -1.0°C",
  "priceClassification": "high"
}
```

## iOS Swift Usage Examples

### 1. Fetch Current Price
```swift
struct PriceData: Codable {
    let currentPrice: Price?
    let prices: [Price]
    let zone: String
    let lastUpdated: String
}

struct Price: Codable {
    let id: String
    let biddingZone: String
    let startTime: String
    let endTime: String
    let priceValue: Double
    let currency: String
    
    enum CodingKeys: String, CodingKey {
        case id, currency
        case biddingZone = "bidding_zone"
        case startTime = "start_time"
        case endTime = "end_time"
        case priceValue = "price_value"
    }
}

func fetchCurrentPrice() async throws -> PriceData {
    let url = URL(string: "https://YOUR_DOMAIN.vercel.app/api/prices?zone=SE3")!
    let (data, _) = try await URLSession.shared.data(from: url)
    return try JSONDecoder().decode(PriceData.self, from: data)
}
```

### 2. Control Heat Pump
```swift
struct HeatPumpCommand: Codable {
    let action: String
    let temperature: Double?
}

func setTemperature(_ temp: Double) async throws {
    let url = URL(string: "https://YOUR_DOMAIN.vercel.app/api/heatpump")!
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    
    let command = HeatPumpCommand(action: "setTemperature", temperature: temp)
    request.httpBody = try JSONEncoder().encode(command)
    
    let (_, response) = try await URLSession.shared.data(for: request)
    // Handle response
}
```

## Database Schema (Supabase)
The iOS app doesn't need to interact directly with Supabase. All database operations are handled by the Vercel API endpoints above.

## Error Handling
All endpoints return standard HTTP status codes:
- 200: Success
- 400: Bad Request
- 404: Not Found  
- 405: Method Not Allowed
- 500: Internal Server Error

Error responses include:
```json
{
  "error": "Error message description"
}
```