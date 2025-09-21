# Pool Heating iOS Client

This directory contains the iOS client code for the Pool Heating System. The client provides a SwiftUI interface for monitoring and controlling your pool heating system.

## Files Overview

- **Config.swift** - Configuration constants and enums
- **Models.swift** - Data models and API response structures
- **APIClient.swift** - HTTP client for API communication
- **DashboardViewModel.swift** - View model for the main dashboard
- **DashboardView.swift** - SwiftUI view for the main interface

## Setup Instructions

### 1. Create a New iOS Project

1. Open Xcode
2. Create a new iOS project (iOS 15.0+)
3. Choose SwiftUI as the interface

### 2. Add Files to Your Project

1. Copy all `.swift` files from this directory to your Xcode project
2. Make sure to add them to your target

### 3. Configure the API Base URL

1. Open `Config.swift`
2. Update the `baseURL` constant with your actual API endpoint:

```swift
static let baseURL = "https://your-app.vercel.app"
```

### 4. Required iOS Version

- Minimum iOS version: 15.0
- Swift version: 5.5+
- Xcode version: 13.0+

## Features

### Dashboard View
- **Real-time Status**: Current water temperature, target temperature, power status
- **Temperature Control**: Set target temperature with slider and picker
- **Power Control**: Turn heat pump on/off
- **Automation Control**: Pause/resume automation
- **Price Information**: Current electricity price and price state
- **Schedule Preview**: Upcoming automation steps
- **Connection Status**: Visual indicator of API connectivity

### API Integration
- **Health Check**: Verify API connectivity
- **Status Monitoring**: Real-time system status
- **Manual Override**: Control power and temperature
- **Automation Control**: Pause/resume automation
- **Error Handling**: Comprehensive error handling and user feedback

## Usage

### Basic Usage

```swift
import SwiftUI

@main
struct PoolHeatingApp: App {
    var body: some Scene {
        WindowGroup {
            DashboardView()
        }
    }
}
```

### Custom API Client

```swift
let customClient = APIClient(baseURL: "https://your-custom-api.com")
let viewModel = DashboardViewModel(apiClient: customClient)
```

### Manual API Calls

```swift
let apiClient = APIClient()

// Fetch system status
let status = try await apiClient.fetchStatus()
print("Current temperature: \(status.waterTemp)°C")

// Set temperature
try await apiClient.overrideTemp(30)

// Toggle power
try await apiClient.overridePower(true)
```

## API Endpoints

The client communicates with the following endpoints:

- `GET /api/health` - Health check
- `GET /api/status` - System status
- `POST /api/override` - Manual control

See `docs/BACKEND_API.md` for detailed API documentation.

## Error Handling

The client includes comprehensive error handling:

- **Network Errors**: Connection timeouts, network failures
- **API Errors**: Server errors, invalid responses
- **Validation Errors**: Invalid temperature ranges, missing data
- **User Feedback**: Alert dialogs for errors

## Customization

### Temperature Range

Modify the temperature range in `Config.swift`:

```swift
struct Defaults {
    static let minTemperature: Int = 18
    static let maxTemperature: Int = 35
}
```

### Refresh Interval

Change the auto-refresh interval:

```swift
static let refreshInterval: TimeInterval = 30 // seconds
```

### UI Customization

The SwiftUI views can be customized by modifying:
- Colors and styling in `DashboardView.swift`
- Layout and spacing
- Additional controls and information displays

## Testing

### Unit Tests

Create unit tests for the API client:

```swift
import XCTest
@testable import YourApp

class APIClientTests: XCTestCase {
    func testFetchStatus() async throws {
        let client = APIClient(baseURL: "https://test-api.com")
        let status = try await client.fetchStatus()
        XCTAssertNotNil(status)
    }
}
```

### UI Tests

Test the SwiftUI interface:

```swift
import XCTest

class DashboardUITests: XCTestCase {
    func testTemperatureControl() {
        let app = XCUIApplication()
        app.launch()
        
        app.buttons["Set"].tap()
        // Test temperature picker
    }
}
```

## Troubleshooting

### Common Issues

1. **Connection Failed**
   - Check the base URL in `Config.swift`
   - Verify the API is running and accessible
   - Check network connectivity

2. **Invalid Response**
   - Verify API endpoint returns expected JSON format
   - Check for CORS issues if testing on simulator

3. **Temperature Range Errors**
   - Ensure temperature values are within the configured range
   - Check for proper validation in the API

### Debug Mode

Enable debug logging by adding print statements in the API client:

```swift
private func performRequest<T: Codable, U: Codable>(...) async throws -> U {
    print("Making request to: \(url)")
    // ... rest of the method
}
```

## Future Enhancements

- **Push Notifications**: Real-time alerts for price changes
- **Historical Data**: Charts and graphs for price trends
- **Multiple Devices**: Support for multiple heat pumps
- **Weather Integration**: Weather-based heating adjustments
- **Widget Support**: Home screen widgets for quick status

## Support

For issues or questions:
1. Check the API documentation in `docs/BACKEND_API.md`
2. Verify your API endpoint is working with a tool like Postman
3. Check the Xcode console for error messages
4. Review the network requests in Xcode's Network Inspector
