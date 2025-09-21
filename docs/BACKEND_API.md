# Backend API Documentation

## Overview

This document describes the backend API endpoints for the Pool Heating System, designed for integration with iOS and other mobile applications.

## Base URL

- **Production**: `https://your-app.vercel.app`
- **Development**: `http://localhost:8080`

## Authentication

Currently, the API uses a simple approach with CORS enabled for mobile app access. All endpoints are publicly accessible but should be secured in production.

## Common Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

## Core Endpoints

### 1. Health Check

**GET** `/api/health`

Returns system health status.

**Response:**
```json
{
  "ok": true,
  "time": "2024-01-15T10:30:00.000Z",
  "tz": "Europe/Stockholm",
  "version": "1.0.0"
}
```

### 2. System Status

**GET** `/api/status`

Returns comprehensive system status including current price, heat pump state, and automation status.

**Response:**
```json
{
  "now": "2024-01-15T10:30:00.000Z",
  "area": "SE3",
  "priceState": "LOW",
  "currentPrice": 0.62,
  "targetC": 28,
  "power": true,
  "waterTemp": 26.4,
  "mode": "warm",
  "paused": false,
  "nextSteps": [
    {
      "start": "2024-01-15T11:00:00.000Z",
      "end": "2024-01-15T12:00:00.000Z",
      "state": "LOW",
      "targetC": 30
    },
    {
      "start": "2024-01-15T12:00:00.000Z",
      "end": "2024-01-15T13:00:00.000Z",
      "state": "NORMAL",
      "targetC": 28
    }
  ],
  "lastAction": {
    "ts": "2024-01-15T10:15:00.000Z",
    "targetC": 30,
    "state": "LOW"
  }
}
```

**Response Fields:**
- `now`: Current timestamp in ISO format
- `area`: Price bidding zone (SE1, SE2, SE3, SE4)
- `priceState`: Current price classification (LOW, NORMAL, HIGH)
- `currentPrice`: Current electricity price in SEK/kWh
- `targetC`: Target pool temperature in Celsius
- `power`: Heat pump power status (true/false)
- `waterTemp`: Current water temperature in Celsius
- `mode`: Heat pump operating mode (warm, cool, smart)
- `paused`: Whether automation is paused
- `nextSteps`: Array of upcoming automation steps
- `lastAction`: Details of the last automation action

### 3. Manual Override

**POST** `/api/override`

Allows manual control of the heat pump system.

**Request Body:**
```json
{
  "action": "setPower",
  "value": true
}
```

**Supported Actions:**

#### Set Power
```json
{
  "action": "setPower",
  "value": true
}
```

#### Set Temperature
```json
{
  "action": "setTemp",
  "value": 28
}
```

#### Pause Automation
```json
{
  "action": "pause"
}
```

#### Resume Automation
```json
{
  "action": "resume"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Power set to on"
}
```

## Legacy Endpoints

### Heat Pump Control

**GET** `/api/heatpump`

Returns current heat pump status.

**Response:**
```json
{
  "status": {
    "device_id": "device123",
    "current_temp": 26.5,
    "target_temp": 28.0,
    "water_temp": 26.4,
    "power_status": "on",
    "mode": "warm",
    "is_online": true,
    "created_at": "2024-01-15T10:30:00.000Z"
  },
  "lastUpdated": "2024-01-15T10:30:00.000Z"
}
```

**POST** `/api/heatpump`

Send commands to the heat pump.

**Request Body:**
```json
{
  "action": "setTemperature",
  "temperature": 28
}
```

### Price Data

**GET** `/api/prices?zone=SE3&hours=24`

Returns price data for the specified zone and time range.

**Query Parameters:**
- `zone`: Bidding zone (SE1, SE2, SE3, SE4) - default: SE3
- `hours`: Number of hours to retrieve - default: 24

**Response:**
```json
{
  "currentPrice": {
    "bidding_zone": "SE3",
    "start_time": "2024-01-15T10:00:00.000Z",
    "end_time": "2024-01-15T11:00:00.000Z",
    "price_value": 0.62,
    "currency": "SEK",
    "provider": "elpriset"
  },
  "prices": [
    {
      "bidding_zone": "SE3",
      "start_time": "2024-01-15T10:00:00.000Z",
      "end_time": "2024-01-15T11:00:00.000Z",
      "price_value": 0.62,
      "currency": "SEK",
      "provider": "elpriset"
    }
  ],
  "zone": "SE3",
  "lastUpdated": "2024-01-15T10:30:00.000Z"
}
```

### Automation Control

**GET** `/api/automation`

Returns automation settings and recent logs.

**Response:**
```json
{
  "settings": {
    "target_pool_temp": 28.0,
    "automation_enabled": true,
    "price_sensitivity": 1.0,
    "temp_tolerance": 2.0,
    "min_pump_temp": 18.0,
    "max_pump_temp": 35.0,
    "optimization_horizon_hours": 12
  },
  "recentLogs": [
    {
      "id": "log123",
      "timestamp": "2024-01-15T10:15:00.000Z",
      "current_price": 0.62,
      "avg_price_forecast": 0.68,
      "current_pool_temp": 26.4,
      "target_pool_temp": 28.0,
      "current_pump_temp": 28.0,
      "new_pump_temp": 30.0,
      "price_classification": "low",
      "action_reason": "Low electricity prices detected - pre-heating to 30°C"
    }
  ]
}
```

**POST** `/api/automation`

Triggers manual automation run.

**Response:**
```json
{
  "success": true,
  "currentPrice": 0.62,
  "newTemp": 30,
  "reason": "Low electricity prices detected - pre-heating to 30°C",
  "priceClassification": "low"
}
```

## Error Codes

| Code | Description |
|------|-------------|
| `INVALID_ACTION` | Invalid action specified in override request |
| `INVALID_TEMPERATURE` | Temperature value out of valid range |
| `DEVICE_OFFLINE` | Heat pump device is not online |
| `NO_PRICE_DATA` | No current price data available |
| `AUTOMATION_DISABLED` | Automation is currently disabled |
| `TUYA_ERROR` | Error communicating with Tuya Cloud |
| `DATABASE_ERROR` | Database operation failed |

## Rate Limiting

- No rate limiting currently implemented
- Recommended: 100 requests per minute per client

## CORS Configuration

The API is configured to allow requests from:
- All origins (`*`) - **Note: Should be restricted in production**
- Methods: GET, POST, OPTIONS
- Headers: Content-Type, Authorization

## WebSocket Support

Currently not implemented. Consider adding for real-time updates:
- Price changes
- Device status updates
- Automation decisions

## Example iOS Integration

```swift
// Fetch system status
let status = try await apiClient.fetchStatus()
print("Current temperature: \(status.waterTemp)°C")
print("Target temperature: \(status.targetC)°C")
print("Price state: \(status.priceState)")

// Set temperature
try await apiClient.overrideTemp(30)

// Toggle power
try await apiClient.overridePower(true)
```

## Testing

Use the following tools to test the API:

1. **Postman Collection**: Import the provided collection
2. **curl Examples**:
   ```bash
   # Get status
   curl -X GET "https://your-app.vercel.app/api/status"
   
   # Set temperature
   curl -X POST "https://your-app.vercel.app/api/override" \
        -H "Content-Type: application/json" \
        -d '{"action":"setTemp","value":30}'
   ```

## Future Enhancements

1. **Authentication**: JWT-based authentication
2. **Rate Limiting**: Implement proper rate limiting
3. **WebSocket**: Real-time updates
4. **GraphQL**: Alternative to REST API
5. **API Versioning**: Support for multiple API versions
